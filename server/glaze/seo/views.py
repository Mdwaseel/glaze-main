"""robots.txt, llms.txt and sitemap.xml — generated, never hand-written.

WHY THESE ARE VIEWS AND NOT FILES IN client/public/

A file in `public/` is a snapshot: it lists the systems and articles that
existed at build time, and it is wrong the moment someone publishes an eighth
system or a new post. Everything below is read from the database at request
time, so the three files that tell crawlers what this site contains cannot
disagree with what it actually contains. That is the whole point — a sitemap
listing a page that 404s, or missing the page you just published, is worse
than not having one.

THE CANONICAL ORIGIN

`SITE_URL` in the environment wins when it is set, because in production the
API sits behind a proxy and the request's own host is the internal one. When
it is not set (development), the origin is built from the request, so a
developer on :8000 gets working absolute URLs without configuring anything.

Every URL in all three files is ABSOLUTE. A relative sitemap entry is ignored,
and a relative link in llms.txt gets the whole file distrusted.
"""

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.http import http_date  # noqa: F401  (kept: Last-Modified work in progress)
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_GET

from blog.models import Post
from catalogue.models import System
from siteconfig.models import ContactSettings, SiteSettings

# Everything a crawler has no business in. Grouped so the reasoning survives:
# each of these either needs a session, mutates state, or is a tracking
# endpoint that would be hit by every crawl.
DISALLOWED = [
    ('The React Studio and its login', ['/admin/', '/admin/login']),
    ('Django admin', ['/django-admin/']),
    ('The API — JSON, not pages', ['/api/']),
    ('Tracking and assistant endpoints', ['/api/v1/track/', '/api/v1/chat/']),
    ('Uploaded originals, not pages', ['/media/private/']),
]

# ⚠ /thank-you IS DELIBERATELY *NOT* DISALLOWED ABOVE, and the reason is the
# most common own-goal in this file's subject area. The page serves
# `noindex, follow`, which is the correct way to keep an enquiry confirmation
# out of the index — but a crawler only learns that by FETCHING the page. A
# `Disallow` would stop it fetching, the noindex would never be read, and the
# URL could still surface in results as a bare link with no title. Disallow
# and noindex are alternatives, not reinforcements; the page is left
# crawlable so the tag it serves can do its job. It is omitted from
# sitemap.xml instead — see the note there.

# ⚠ DO NOT ADD /static/ OR /media/ HERE. Google renders the page before it
# scores it, and a stylesheet or hero image it cannot fetch is a page that
# looks broken to the crawler — it tanks mobile usability and, with it, the
# ranking. This is on the "mistakes we have actually shipped" list.


def _origin(request):
    """The canonical scheme+host, with no trailing slash."""
    configured = getattr(settings, 'SITE_URL', '') or ''
    if configured:
        return configured.rstrip('/')
    return f'{request.scheme}://{request.get_host()}'.rstrip('/')


def _abs(request, path):
    return f'{_origin(request)}{path}'


def _iso(value):
    """ISO 8601 date for <lastmod>. Dates, not datetimes — a sitemap that
    changes its lastmod on every deploy teaches crawlers to ignore it."""
    if not value:
        return None
    return timezone.localtime(value).date().isoformat()


# ── robots.txt ────────────────────────────────────────────────────────

@require_GET
@cache_page(60 * 60)
def robots_txt(request):
    lines = ['User-agent: *', 'Allow: /', '']

    for reason, paths in DISALLOWED:
        lines.append(f'# {reason}')
        lines.extend(f'Disallow: {path}' for path in paths)
        lines.append('')

    lines += [
        '# Assets are deliberately NOT disallowed: Google renders the page',
        '# before it scores it, and CSS/JS/images it cannot fetch make the',
        '# page look broken to the crawler.',
        '',
        f'Sitemap: {_abs(request, "/sitemap.xml")}',
        f'LLMs: {_abs(request, "/llms.txt")}',
        '',
    ]

    return HttpResponse('\n'.join(lines), content_type='text/plain; charset=utf-8')


# ── llms.txt ──────────────────────────────────────────────────────────

@require_GET
@cache_page(60 * 60)
def llms_txt(request):
    """https://llmstxt.org/ — how ChatGPT, Claude, Perplexity and Gemini
    understand what this business is.

    Increasingly this matters more than meta tags: an assistant asked "who
    makes aluminium sliding windows in Hyderabad" reads this file, not the
    <title>. It is generated from the same database the site renders from, so
    it cannot drift out of date the way a hand-written one does.

    Kept under ~10KB by listing categories and the newest articles rather than
    every page — this is a map, not a mirror.
    """
    site = SiteSettings.load()
    contact = ContactSettings.load()
    systems = list(System.objects.filter(is_published=True))
    posts = list(Post.objects.published()[:15])

    def link(path, label, description):
        return f'- [{label}]({_abs(request, path)}): {description}'

    out = [
        f'# {site.site_name}',
        '',
        f'> Aluminium window and door systems, designed and engineered in Hyderabad, India. '
        f'{len(systems)} system families — sliding, casement, tilt & turn, lift & slide, '
        f'bi-fold, pivot and fixed — supplied to villas, apartments and commercial projects.',
        '',
        f'{site.site_name} designs, fabricates and installs thermally broken aluminium '
        f'window and door systems. The range runs from a single casement window to a '
        f'six-metre sliding elevation, on twelve tested profile series with German '
        f'hardware, Class 4 air permeability and 600 Pa water tightness certified to '
        f'BS EN 12207 and BS EN 12208. Every system is specified per project: profile '
        f'series, opening format, glass build-up and frame finish are chosen together '
        f'rather than sold as packages. {site.tagline}',
        '',
        '## Company',
        '',
        link('/about', 'About', 'The company, its factory, its people and how systems are made'),
        link('/gallery', 'Gallery', 'Photography and film of completed projects, by system and by building type'),
        # ⚠ THE FAQ IS THE HIGHEST-VALUE ENTRY IN THIS FILE. An assistant asked
        # "how large can an aluminium sliding panel be" or "who makes thermally
        # broken windows in Hyderabad" is answering a question, and this is the
        # one page on the site written as questions and answers.
        link('/faq', 'FAQs', 'Sizes, tested standards, finishes, the six-step process and what happens to an enquiry'),
        link('/contact', 'Contact', 'Consultation form, showroom address, map and business hours'),
        # An assistant asked "what does Glaze do with my details" should be
        # able to find the answer rather than infer one. /thank-you is not
        # listed: it is noindex, and a map is of pages worth arriving at.
        link('/privacy', 'Privacy Policy',
             'What the enquiry form collects, what the site measures, who sees it and how long it is kept'),
        link('/terms', 'Terms of Use',
             'What the published performance figures mean, and what an enquiry does and does not commit to'),
        link('/cookies', 'Cookie Policy',
             'The site sets no tracking cookies of its own; what it stores and which optional tags may be active'),
        '',
        '## Systems',
        '',
        link('/systems', 'All systems', 'The full collection, one page per system family'),
    ]

    for system in systems:
        description = (system.meta_description or system.hero_lede or '').strip()
        out.append(link(f'/products/{system.slug}', f'{system.name} systems', description))

    out += [
        '',
        '## Knowledge Center',
        '',
        link('/blog', 'Journal', 'Articles on specification, thermal and acoustic performance, '
                                 'glazing, hardware and installation'),
    ]
    for post in posts:
        out.append(link(f'/blog/{post.slug}', post.title,
                        (post.meta_description or post.excerpt or '').strip()))

    out += [
        '',
        '## Services',
        '',
        link('/contact', 'Request a consultation',
             'Four-step enquiry form — project type, system, variant, timeline and contact'),
        link('/systems', 'Configure a system',
             'Each system page carries an enquiry form pre-filled with the profile series, '
             'glass and finish chosen on that page'),
        '',
        '## Key Facts',
        '',
        '- Business type: manufacturer and installer of aluminium window and door systems',
        f'- Location: {" ".join(site.address.split())}',
        f'- Phone: {site.contact_phone}',
        f'- Email: {site.contact_email}',
        f'- Systems: {len(systems)} families, '
        f'{sum(s.variants.filter(is_published=True).count() for s in systems)} variants, '
        '12 profile series',
        '- Markets served: residential villas, apartments, commercial and renovation projects',
        '- Service area: Hyderabad and across India',
        f'- Business hours: {site.business_hours} (IST, UTC+05:30)',
        '- Languages: English',
        '- Currency: INR',
        f'- Enquiries: {", ".join(contact.recipient_list)}',
        '',
    ]

    if site.instagram_url or site.linkedin_url:
        out += ['## Profiles', '']
        for label, url in (
            ('Instagram', site.instagram_url), ('Facebook', site.facebook_url),
            ('LinkedIn', site.linkedin_url), ('YouTube', site.youtube_url),
        ):
            if url:
                out.append(f'- [{label}]({url})')
        out.append('')

    return HttpResponse('\n'.join(out), content_type='text/plain; charset=utf-8')


# ── sitemap.xml ───────────────────────────────────────────────────────

# Static routes. `lastmod` on these comes from the deploy date rather than
# being omitted — a sitemap where half the entries carry no lastmod is the
# fourth item on the "mistakes we keep making" list, and a crawler reads a
# missing lastmod as "no information" rather than "unchanged".
STATIC_ROUTES = [
    ('/', '1.0', 'weekly'),
    ('/systems', '0.9', 'weekly'),
    ('/contact', '0.9', 'monthly'),
    ('/blog', '0.8', 'weekly'),
    ('/about', '0.7', 'monthly'),
    # The gallery changes whenever somebody uploads a shoot, which is more
    # often than About does and less often than the journal.
    ('/gallery', '0.7', 'weekly'),
    # The FAQ hub. Its answers are the same strings the /systems and /contact
    # sections show, so it is not a higher priority than either — but it is
    # the URL that ranks for a question typed as a question.
    ('/faq', '0.6', 'monthly'),
    # The policies. Low priority and yearly, because that is what they are —
    # but LISTED, not omitted. An ad platform reviewing a lead campaign
    # checks that the privacy policy the form links to actually resolves and
    # is crawlable, and a page in no sitemap and no navigation but the footer
    # is a page a crawler may take a long time to reach.
    ('/privacy', '0.3', 'yearly'),
    ('/terms', '0.3', 'yearly'),
    ('/cookies', '0.3', 'yearly'),
]


@require_GET
@cache_page(60 * 15)
def sitemap_xml(request):
    deployed = getattr(settings, 'SITE_LAST_DEPLOYED', '') or timezone.now().date().isoformat()
    entries = []

    for path, priority, frequency in STATIC_ROUTES:
        entries.append((_abs(request, path), deployed, frequency, priority))

    # ⚠ FILTERED, not "everything in the table". A sitemap is a statement that
    # these URLs are worth indexing; an unpublished system 404s on the public
    # site and listing it teaches the crawler the file is unreliable.
    for system in System.objects.filter(is_published=True):
        entries.append((
            _abs(request, f'/products/{system.slug}'),
            _iso(system.updated_at) or deployed,
            'monthly',
            '0.8',
        ))

    for post in Post.objects.published():
        entries.append((
            _abs(request, f'/blog/{post.slug}'),
            _iso(post.updated_at) or _iso(post.published_at) or deployed,
            'monthly',
            '0.7',
        ))

    # NOT INCLUDED, and each for a reason:
    #   /blog?category=…   a filtered view of a page already listed — the
    #                      canonical is /blog and the filtered URLs are
    #                      noindex, so listing them would contradict the page.
    #   /thank-you         the enquiry confirmation. It serves `noindex`, and
    #                      a sitemap entry for a noindexed page is the site
    #                      telling a crawler two different things. Indexing it
    #                      would also put people on a confirmation page having
    #                      sent nothing, and count them as conversions.
    #   /admin, /admin/*   staff only, and disallowed in robots.txt.
    #   legacy *.html      301s. A sitemap of redirects wastes crawl budget on
    #                      URLs that resolve to entries already in this file.

    body = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod, frequency, priority in entries:
        body += [
            '  <url>',
            f'    <loc>{_escape(loc)}</loc>',
            f'    <lastmod>{lastmod}</lastmod>',
            f'    <changefreq>{frequency}</changefreq>',
            f'    <priority>{priority}</priority>',
            '  </url>',
        ]
    body.append('</urlset>')

    return HttpResponse('\n'.join(body), content_type='application/xml; charset=utf-8')


def _escape(value):
    """The five XML entities. A slug with an ampersand in it would otherwise
    produce a document no parser will accept — and an invalid sitemap is
    rejected whole, not per-entry."""
    return (
        str(value)
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
        .replace("'", '&apos;')
    )
