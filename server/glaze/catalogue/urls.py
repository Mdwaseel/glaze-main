from django.urls import path

from . import views

app_name = 'catalogue'

urlpatterns = [
    # Public
    path('catalogue/', views.PublicCatalogueView.as_view(), name='public-catalogue'),

    # Admin
    path('admin/systems/', views.AdminSystemListView.as_view(), name='admin-systems'),
    path('admin/systems/<slug:slug>/', views.AdminSystemDetailView.as_view(), name='admin-system-detail'),
    path('admin/systems/<slug:slug>/variants/', views.AdminVariantListView.as_view(), name='admin-variants'),
    path(
        'admin/systems/<slug:slug>/variants/reorder/',
        views.AdminVariantReorderView.as_view(), name='admin-variants-reorder',
    ),
    path('admin/variants/<int:pk>/', views.AdminVariantDetailView.as_view(), name='admin-variant-detail'),
]
