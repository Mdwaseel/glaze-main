"""Helpers for putting/removing the JWT pair in HttpOnly cookies."""

from django.conf import settings
from rest_framework_simplejwt.settings import api_settings as jwt_settings


def _cookie_conf():
    return settings.AUTH_COOKIE


def set_access_cookie(response, token):
    conf = _cookie_conf()
    response.set_cookie(
        key=conf['ACCESS_NAME'],
        value=str(token),
        max_age=int(jwt_settings.ACCESS_TOKEN_LIFETIME.total_seconds()),
        secure=conf['SECURE'],
        httponly=True,
        samesite=conf['SAMESITE'],
        path=conf['PATH'],
        domain=conf['DOMAIN'],
    )


def set_refresh_cookie(response, token):
    conf = _cookie_conf()
    response.set_cookie(
        key=conf['REFRESH_NAME'],
        value=str(token),
        max_age=int(jwt_settings.REFRESH_TOKEN_LIFETIME.total_seconds()),
        secure=conf['SECURE'],
        httponly=True,
        samesite=conf['SAMESITE'],
        # Scoped to the refresh/logout endpoints so the long-lived token is not
        # attached to every request.
        path=conf['REFRESH_PATH'],
        domain=conf['DOMAIN'],
    )


def set_auth_cookies(response, access, refresh=None):
    set_access_cookie(response, access)
    if refresh is not None:
        set_refresh_cookie(response, refresh)
    return response


def delete_auth_cookies(response):
    conf = _cookie_conf()
    response.delete_cookie(
        conf['ACCESS_NAME'], path=conf['PATH'], domain=conf['DOMAIN'], samesite=conf['SAMESITE'],
    )
    response.delete_cookie(
        conf['REFRESH_NAME'], path=conf['REFRESH_PATH'], domain=conf['DOMAIN'], samesite=conf['SAMESITE'],
    )
    return response


def get_refresh_token(request):
    return request.COOKIES.get(_cookie_conf()['REFRESH_NAME'])
