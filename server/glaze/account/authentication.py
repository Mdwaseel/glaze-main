from django.conf import settings
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class _CSRFCheck(CsrfViewMiddleware):
    def _reject(self, request, reason):
        return reason


class CookieJWTAuthentication(JWTAuthentication):
    """Reads the access token from an HttpOnly cookie instead of the Authorization header.

    The Authorization header is still honoured as a fallback, which keeps tools
    like DRF's browsable API and curl usable during development.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.COOKIES.get(settings.AUTH_COOKIE['ACCESS_NAME'])

        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Cookies are sent by the browser automatically, so cookie-based auth needs
        # CSRF protection the way session auth does. Header-based auth does not.
        if header is None and settings.AUTH_COOKIE['ENFORCE_CSRF']:
            self._enforce_csrf(request)

        return user, validated_token

    def _enforce_csrf(self, request):
        check = _CSRFCheck(lambda req: None)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF failed: {reason}')
