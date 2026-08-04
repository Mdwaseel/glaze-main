from django.urls import path

from . import views

app_name = 'analytics'

urlpatterns = [
    # Public beacon
    path('analytics/track/', views.track, name='track'),
    path('analytics/duration/', views.track_duration, name='track-duration'),

    # Admin reports
    path('admin/analytics/', views.DashboardView.as_view(), name='dashboard'),
    path('admin/analytics/pages/', views.PagesReportView.as_view(), name='pages-report'),
    path('admin/analytics/security/', views.SecurityReportView.as_view(), name='security-report'),
]
