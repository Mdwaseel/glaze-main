from django.urls import path

from . import views

app_name = 'gallery'

urlpatterns = [
    # Public
    path('gallery/', views.PublicGalleryView.as_view(), name='public-gallery'),

    # Admin — items
    path('admin/gallery/items/', views.AdminGalleryItemListView.as_view(), name='admin-items'),
    # ⚠ `items/reorder/` IS DECLARED BEFORE `items/<pk>/`. Django resolves in
    # source order and `<int:pk>` would not match "reorder" anyway, but the
    # order is kept explicit so the pair reads the way catalogue/urls.py's
    # variants reorder does.
    path(
        'admin/gallery/items/reorder/',
        views.AdminGalleryReorderView.as_view(), name='admin-items-reorder',
    ),
    path(
        'admin/gallery/items/<int:pk>/',
        views.AdminGalleryItemDetailView.as_view(), name='admin-item-detail',
    ),

    # Admin — categories
    path(
        'admin/gallery/categories/',
        views.AdminGalleryCategoryListView.as_view(), name='admin-categories',
    ),
    path(
        'admin/gallery/categories/<int:pk>/',
        views.AdminGalleryCategoryDetailView.as_view(), name='admin-category-detail',
    ),
]
