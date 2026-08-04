from django.urls import path

from . import views

app_name = 'siteconfig'

urlpatterns = [
    # Public
    path('site-settings/', views.PublicSiteSettingsView.as_view(), name='public-site-settings'),
    path('enquiries/', views.submit_enquiry, name='submit-enquiry'),

    # Admin
    path('admin/site-settings/', views.AdminSiteSettingsView.as_view(), name='admin-site-settings'),
    path('admin/contact-settings/', views.AdminContactSettingsView.as_view(), name='admin-contact-settings'),
    path('admin/contact-settings/test/', views.AdminTestAutoReplyView.as_view(), name='admin-test-auto-reply'),
    path('admin/enquiries/', views.AdminEnquiryListView.as_view(), name='admin-enquiries'),
    path('admin/enquiries/<int:pk>/', views.AdminEnquiryDetailView.as_view(), name='admin-enquiry-detail'),
]
