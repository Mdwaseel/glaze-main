from django.urls import path

from . import views

app_name = 'account'

urlpatterns = [
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/refresh/', views.RefreshView.as_view(), name='refresh'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/password/change/', views.ChangePasswordView.as_view(), name='password-change'),
    path('auth/csrf/', views.CSRFTokenView.as_view(), name='csrf'),

    # Admin panel — captcha-gated login. Separate from /auth/login/ because it
    # additionally requires is_staff and runs the lockout ladder.
    path('auth/captcha/', views.CaptchaChallengeView.as_view(), name='captcha'),
    path('auth/admin/login/', views.AdminLoginView.as_view(), name='admin-login'),
]
