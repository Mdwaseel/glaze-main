"""The three crawler files, at the root of the domain where crawlers look.

⚠ NOT under /api/v1/. These are not API endpoints — a crawler requests
`SITE/robots.txt` and nothing else, so they are mounted at the project root in
glaze/urls.py rather than behind the API prefix.

⚠ IN PRODUCTION THE SPA AND DJANGO SHARE ONE ORIGIN. Whatever serves the
static build has to pass these three paths (and /favicon.ico) through to
Django rather than answering them with index.html — otherwise a crawler asking
for robots.txt gets an HTML document and the whole file is ignored. There is a
worked nginx block in the README.
"""

from django.urls import path

from . import views

app_name = 'seo'

urlpatterns = [
    path('robots.txt', views.robots_txt, name='robots'),
    path('llms.txt', views.llms_txt, name='llms'),
    path('sitemap.xml', views.sitemap_xml, name='sitemap'),
]
