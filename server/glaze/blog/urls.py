from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'blog'

router = DefaultRouter()
router.register('admin/posts', views.AdminPostViewSet, basename='admin-post')
router.register('admin/categories', views.AdminCategoryViewSet, basename='admin-category')
router.register('admin/authors', views.AdminAuthorViewSet, basename='admin-author')
router.register('admin/tags', views.AdminTagViewSet, basename='admin-tag')
router.register('admin/comments', views.AdminCommentViewSet, basename='admin-comment')

urlpatterns = [
    # Public
    path('blog/posts/', views.PublicPostListView.as_view(), name='post-list'),
    path('blog/posts/<slug:slug>/', views.PublicPostDetailView.as_view(), name='post-detail'),
    path('blog/posts/<slug:slug>/comments/', views.PublicCommentView.as_view(), name='post-comments'),
    path('blog/taxonomy/', views.PublicTaxonomyView.as_view(), name='taxonomy'),
    path('blog/slug-check/', views.slug_available, name='slug-check'),

    # Admin CRUD
    path('', include(router.urls)),
]
