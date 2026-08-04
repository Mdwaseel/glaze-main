from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import update_last_login
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings as jwt_settings
from rest_framework_simplejwt.tokens import RefreshToken

from . import captcha, security
from .cookies import delete_auth_cookies, get_refresh_token, set_auth_cookies
from .serializers import (
    AdminLoginSerializer,
    ChangePasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)

User = get_user_model()


def issue_tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return refresh, refresh.access_token


class RegisterView(APIView):
    """POST /api/v1/auth/register/ — create an account and log straight in."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh, access = issue_tokens_for(user)
        response = Response(
            {'user': UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        return set_auth_cookies(response, access, refresh)


class LoginView(APIView):
    """POST /api/v1/auth/login/ — exchange credentials for auth cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh, access = issue_tokens_for(user)
        update_last_login(None, user)

        response = Response({'user': UserSerializer(user).data})
        return set_auth_cookies(response, access, refresh)


class RefreshView(APIView):
    """POST /api/v1/auth/refresh/ — mint a new access token from the refresh cookie."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = get_refresh_token(request)
        if not raw_refresh:
            return Response(
                {'detail': 'No refresh token cookie present.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(raw_refresh)
        except TokenError as exc:
            response = Response({'detail': str(exc)}, status=status.HTTP_401_UNAUTHORIZED)
            return delete_auth_cookies(response)

        access = refresh.access_token
        new_refresh = None

        if jwt_settings.ROTATE_REFRESH_TOKENS:
            if jwt_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    refresh.blacklist()
                except AttributeError:
                    # token_blacklist app not installed — nothing to blacklist.
                    pass
            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()
            new_refresh = refresh

        response = Response({'detail': 'Token refreshed.'})
        return set_auth_cookies(response, access, new_refresh)


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklist the refresh token and clear cookies."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        raw_refresh = get_refresh_token(request)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except (TokenError, AttributeError):
                # Already expired/blacklisted, or the blacklist app is disabled.
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        return delete_auth_cookies(response)


class MeView(APIView):
    """GET/PATCH /api/v1/auth/me/ — the currently authenticated user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class ChangePasswordView(APIView):
    """POST /api/v1/auth/password/change/ — rotates cookies so the session stays valid."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Old tokens stay valid until they expire, so hand out a fresh pair.
        refresh, access = issue_tokens_for(user)
        response = Response({'detail': 'Password updated.'})
        return set_auth_cookies(response, access, refresh)


class CaptchaChallengeView(APIView):
    """GET /api/v1/auth/captcha/ — a fresh login challenge.

    With the internal provider this returns an inline SVG and the signed token
    that goes back with the answer. With a hosted provider there is nothing to
    render server-side, so it returns the site key for the widget to mount.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'captcha'

    def get(self, request):
        provider = settings.CAPTCHA['PROVIDER']
        if provider != 'internal':
            return Response({'provider': provider, 'site_key': settings.CAPTCHA['SITE_KEY']})
        return Response({'provider': 'internal', **captcha.issue()})


class AdminLoginView(APIView):
    """POST /api/v1/auth/admin/login/ — captcha-gated, lockout-guarded staff login.

    Order of operations is the security design, not incidental:

      1. lockout   — cheapest check, and it must come first so a barred caller
                     cannot make us spend an Argon2 verification per request.
      2. captcha   — proves a person is present before any credential work.
      3. password  — authenticate() against Argon2.
      4. is_staff  — a valid non-staff account is still refused here.

    Steps 3 and 4 share ONE error message. Splitting them ("wrong password" vs
    "not an administrator") would confirm to an attacker that they had found a
    working credential pair, which is most of the value of the attack.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_scope = 'login'

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data['email'].lower()

        # 1 — lockout
        try:
            security.assert_not_locked(email, security.client_ip(request))
        except security.LockedOut as exc:
            return Response(
                {
                    'detail': 'Too many failed attempts. Please wait before trying again.',
                    'retry_after': exc.retry_after,
                    'code': 'locked_out',
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 2 — captcha
        try:
            captcha.verify(data, security.client_ip(request))
        except captcha.CaptchaError as exc:
            security.register_failure(request, email, reason='captcha')
            return Response(
                {'detail': str(exc), 'code': 'captcha_failed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3 — credentials
        user = authenticate(request=request, username=email, password=data['password'])

        # 4 — staff gate, folded into the same failure branch on purpose.
        if user is None or not (user.is_active and user.is_staff):
            security.register_failure(
                request, email,
                reason='bad_credentials' if user is None else 'not_staff',
            )
            return Response(
                {'detail': 'Invalid credentials.', 'code': 'invalid_credentials'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        security.register_success(request, user)
        request.user = user
        security.record_audit(request, 'admin.login', target=user.email)

        refresh, access = issue_tokens_for(user)
        update_last_login(None, user)

        response = Response({'user': UserSerializer(user).data})
        return set_auth_cookies(response, access, refresh)


class CSRFTokenView(APIView):
    """GET /api/v1/auth/csrf/ — sets the csrftoken cookie for the SPA to read.

    Only needed when AUTH_COOKIE['ENFORCE_CSRF'] is on.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})
