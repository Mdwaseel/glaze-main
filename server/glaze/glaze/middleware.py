"""Project middleware.

Currently one entry, and it exists because of a production incident rather
than a preference — see below.
"""


class ApiNoStoreMiddleware:
    """Mark every /api/ response as uncacheable by shared caches.

    ⚠ WHY THIS EXISTS: THE ADMIN LOGIN CAPTCHA STOPPED WORKING IN PRODUCTION.

    The symptom was that signing in became impossible — every attempt came
    back "This captcha has already been used." — while the same code worked
    locally and in the container.

    The cause was not in this codebase. The site is deployed behind cPanel's
    ea-nginx reverse-proxy cache, which the panel enables per user:

        location / {
            proxy_cache glaze;
            proxy_cache_valid 200 301 302 60m;   # ← everything, for an hour
            proxy_cache_min_uses 1;
        }

    DRF sent no Cache-Control header at all, so nginx fell back to that rule
    and cached `GET /api/v1/auth/captcha/` — a URL whose entire purpose is to
    return something different every time — for sixty minutes. Every visitor
    was handed the same challenge, and because a solved challenge burns its
    nonce (account/captcha.py, single-use by design), the first successful
    login poisoned the cache entry for everyone who came after it. Measured
    on the live site: three consecutive fetches returned a byte-identical
    token, a fetch with `?cb=<random>` returned a fresh one, and replaying
    the cached token produced exactly the error users were reporting.

    The captcha is the endpoint where this was noticed, but it is not the
    worst case. That cache is keyed on the URL alone, with no cookie in the
    key, so any authenticated 200 with no Set-Cookie on it could be stored
    and then served to somebody else asking for the same path. `no-store`
    closes both.

    nginx honours an upstream Cache-Control unless the vhost sets
    `proxy_ignore_headers Cache-Control`, which this one does not — so this
    header is what actually stops the caching, and it keeps working if the
    site is moved to a host whose proxy we do not control. The nginx-side
    exclusion is still worth having as defence in depth; this is the half
    that travels with the code.

    A view that genuinely wants to be cached can set its own Cache-Control
    and this leaves it alone.
    """

    PREFIX = '/api/'

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        if request.path.startswith(self.PREFIX) and not response.has_header('Cache-Control'):
            # `no-store` rather than `no-cache`: no-cache still permits a
            # shared cache to keep a copy and revalidate it, which is more
            # trust than a proxy we do not control has earned with a
            # single-use token.
            response['Cache-Control'] = 'no-store, private'

        return response
