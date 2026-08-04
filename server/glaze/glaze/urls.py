"""URL configuration for the glaze project.

Two admin surfaces, on purpose and at different paths:

  /django-admin/  Django's own admin. Kept for superuser-level work the panel
                  does not cover — creating accounts, permissions, unlocking a
                  locked-out colleague, reading the raw audit trail.
  /admin/         served by the React app, not here: the custom panel the
                  brief asked for (dashboard, blog centre, settings).

Django's admin moved off /admin/ so that when the SPA and the API are served
from one origin in production the two do not collide — Django would win the
path and the panel would be unreachable.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # The crawler files, at the domain root where crawlers actually look —
    # NOT behind /api/v1/. See seo/urls.py for the production proxy note.
    path('', include('seo.urls')),

    path('django-admin/', admin.site.urls),
    path('api/v1/', include('account.urls')),
    path('api/v1/', include('siteconfig.urls')),
    path('api/v1/', include('catalogue.urls')),
    path('api/v1/', include('blog.urls')),
    path('api/v1/', include('analytics.urls')),
    path('api/v1/', include('chatbot.urls')),
]

# Uploaded media. Django serves it only in development; in production a real
# web server sits in front and this branch never runs.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


admin.site.site_header = 'Glaze — Django administration'
admin.site.site_title = 'Glaze admin'
admin.site.index_title = 'Data administration'
