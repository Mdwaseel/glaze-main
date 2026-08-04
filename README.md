# Glaze — site, journal and Studio

A React SPA (`client/`) and a Django REST API (`server/`).

| Surface | Where | What |
|---|---|---|
| Public site | `/`, `/about`, `/contact`, `/products/<slug>` | The migrated static site |
| Systems | `/systems` | The collection — the same carousel the homepage runs |
| Journal | `/blog`, `/blog/<slug>` | Blog listing and article |
| Studio | `/admin` | Dashboard, catalogue, blog centre, settings — served by React |
| Django admin | `:8000/django-admin/` | Raw data, accounts, unlocking lockouts |

Django's own admin was moved off `/admin/` so the two can share one origin in
production without Django winning the path.

**Deploying?** Everything is in **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** —
a Docker stack (nginx + gunicorn + PostgreSQL + automatic TLS), the DNS and
certificate steps, and the push-to-deploy loop. The short version once the
server is set up:

```bash
git push                                  # from here
cd /srv/glaze && ./deploy/deploy.sh       # on the VPS
```

Note that most of what changes on a live site — contact details, systems and
variants, blog posts, enquiry recipients, the Meta Pixel ID — is edited in the
Studio and read from the database at runtime. Those need no deploy at all.

---

## Running it locally

Two processes. The frontend runs without the backend — it falls back to the
values it shipped with — but the journal and Studio need the API.

### 1. Backend

## Site assistant (RAG chatbot)

A floating assistant on every public page. It answers **only** from content
published on this site and routes anything else to the contact page.

**Retrieval is PostgreSQL full-text search + pg_trgm, not embeddings.** The
corpus is 27 passages of closed, precise vocabulary ("U-value", "Rw",
"GWS-N1-60H"), which lexical search matches exactly and embeddings tend to
blur — every passage is about windows. It also avoids putting a second vendor
or a 2 GB PyTorch install on the critical path. `chatbot/models.py` documents
the trade-off and when to switch to pgvector.

Three gates decide whether to answer, and all of it is measured, not guessed
(see `chatbot/retrieval.py`):

| Gate | Purpose |
|---|---|
| `MIN_RANK` | the passage is lexically relevant at all |
| `MIN_COVERAGE` | it accounts for ≥40% of what was *asked* — this is what refuses "bulletproof glass for banks", which ranks well on the word "glass" alone |
| `FUZZY_CONFIDENT` | rescues misspellings; real typos score 0.53–0.61, out-of-corpus peaks at 0.28 |

Rebuild the knowledge base after changing site content:

```bash
node client/scripts/export-knowledge.mjs   # regenerate from src/data/systems.js
cd server/glaze && python manage.py build_knowledge
```

The corpus is **generated** from the site's own data files rather than
hand-written, so a stat edited in `systems.js` cannot drift out of the bot's
answers. Blog posts and contact details are pulled live from the database.

**Providers.** `CHAT_PROVIDER_CHAIN` is tried in order (default `groq,cerebras`);
the first that answers wins. If every provider fails the assistant falls back to
**extractive** answers — the best-matching sentences from the site, verbatim —
which cannot hallucinate because nothing is generated. It degrades, it does not
break.

> **The Cerebras key authenticates but its account has no credit.** Verified
> three ways — raw request, the vendor's own minimal example, and the official
> `@cerebras/cerebras_cloud_sdk` verbatim — all return `402 payment_required`.
> A bogus key returns `401 wrong_api_key` and this one returns `200` on
> `/v1/models`, so the key itself is fine; the account needs credit enabling.
> Until then it costs one fast 402 before the chain moves to Groq. Remove it
> from `CHAT_PROVIDER_CHAIN` to skip even that.

> ### ⚠ Both provider keys are disclosed — rotate them
>
> The Groq and Cerebras keys were pasted into a chat and are in that log and in
> shell history. They are used **server-side only** — verified: the built
> bundle contains no `gsk_`, no `csk-`, and not even the provider hostnames —
> but a leaked key is spendable by whoever has it. Rotate both in the provider
> consoles and update `server/glaze/.env`.

---

## Database

**PostgreSQL 17**, via **psycopg 3** — not psycopg2. psycopg2-binary ships no
wheels for Python 3.14 and Django 6 speaks psycopg 3 through the same
`django.db.backends.postgresql` backend, so the settings string is unchanged.

> **A stale `server/glaze/db.sqlite3` may still be on disk** from before the
> move to Postgres. It is gitignored and nothing reads it — `settings.py` only
> reaches sqlite if someone writes `DB_ENGINE=django.db.backends.sqlite3` into
> `.env` by hand. It is left in place rather than deleted so nothing is thrown
> away without you asking; `rm server/glaze/db.sqlite3` when you are satisfied
> the Postgres database has everything.

```bash
cd server
python -m venv .venv
.venv/Scripts/activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Create the database and the application role. The app does **not** connect as
the `postgres` superuser — a web process that can `DROP DATABASE` is a web
process one SQL-injection bug away from doing it:

```bash
psql -U postgres -c "CREATE ROLE glaze WITH LOGIN PASSWORD 'GlazeApp@5432';"
psql -U postgres -c "CREATE DATABASE glaze_db OWNER glaze ENCODING 'UTF8';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE glaze_db TO glaze;"
# Required on PostgreSQL 15+, where CREATE on the public schema is no longer
# granted to PUBLIC. Without it, migrate fails with "permission denied for
# schema public".
psql -U postgres -d glaze_db -c "ALTER SCHEMA public OWNER TO glaze; GRANT ALL ON SCHEMA public TO glaze;"
```

On Windows `psql` is not added to PATH by the installer:
`export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"`.

Then configure and run:

```bash
cd glaze
cp .env.example .env
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# paste that into SECRET_KEY, and set DB_PASSWORD to match the role above

python manage.py migrate
# ⚠ Not created by migrate, and required. The rate limiters and the
# robots/sitemap page cache use the database cache backend — see CACHES in
# settings.py for why a per-process cache silently multiplies every throttle
# by the worker count. Without this table a throttled request raises
# ProgrammingError. Idempotent; the container entrypoint runs it on every boot.
python manage.py createcachetable
python manage.py seed_blog          # categories, an author, one sample article
python manage.py bootstrap_admin --email you@example.com --password '...'
python manage.py runserver 8000
```

`bootstrap_admin` is idempotent — re-running it resets the password, re-asserts
staff/superuser and clears any lockout on that address, so it doubles as the
"I am locked out" recovery tool. It also runs the password through
`AUTH_PASSWORD_VALIDATORS`, which `createsuperuser --noinput` skips entirely.
Omit the flags to read `GLAZE_ADMIN_EMAIL` / `GLAZE_ADMIN_PASSWORD` from the
environment instead, keeping the password out of shell history.

### 2. Frontend

```bash
cd client
npm install
npm run dev                          # http://localhost:5173
```

No `.env` is needed — `client/.env.example` documents the one override
(`VITE_API_URL`) and the default already points at `localhost:8000`.

Sign in at <http://localhost:5173/admin/login>.

> ### ⚠ Rotate the admin password before this is reachable from the internet
>
> The account is `info@glazewindowsystems.com`. Its password was set over chat,
> so it now exists in a conversation log and probably in shell history — treat
> it as already disclosed regardless of how strong it is.
>
> It is also a guessable *shape*: a dictionary word, `@`, `123`, symbols. It
> clears Django's validators (11 characters, not all-numeric, not in the common
> list) and it is stored as Argon2id, so an offline attack on a stolen hash is
> expensive. But the address is the company's published `info@` address, which
> means an attacker needs to guess only the password, and they already know
> half the pair.
>
> The lockout does most of the work here — five failures locks the account,
> twenty from one IP locks the address, and each consecutive lockout doubles
> the wait. That makes online guessing impractical. It does nothing about a
> password that has leaked rather than been guessed.
>
> Rotate it after first sign-in:
>
> ```bash
> python manage.py bootstrap_admin --email info@glazewindowsystems.com --password '<new>'
> ```
>
> or from the panel once a change-password screen is wired to
> `/api/v1/auth/password/change/`, which the API already exposes.

---

## The product catalogue

The seven systems and the thirty-one variants they are built in live in
**Postgres**, not in the bundle, and are edited at **Studio › Catalogue ›
Systems & variants**.

They used to be two hand-authored modules — `client/src/data/systems.js` and
`data/variants.js` — compiled into the JavaScript. That was right while the
site was a migration of six static pages: the data *was* the markup. It stops
being right the moment someone without the repository needs to add a variant,
because that meant a developer, a build and a deploy to publish four rows of
specification and a video.

**Adding a variant is now the whole publishing flow.** It appears on its
system page's §04 rail, in the contact form's variant list under its system,
and in the system page's own enquiry form — with nothing rebuilt. Nothing
anywhere enumerates variants by hand any more; the same is true of the systems
themselves, which drive the carousel, the footer's Systems column, the
cross-links, the 404's shortcuts and both forms' chips.

**Seeding it.** The seed is generated from the JS modules rather than typed
out, so a thousand lines of transcribed copy and tested figures could not
acquire a typo in the move:

```bash
node client/scripts/export-catalogue.mjs      # -> catalogue/seed/catalogue.json
cd server/glaze && python manage.py seed_catalogue
```

`seed_catalogue` is safe by default: it creates what is missing and leaves
existing rows alone, so it is re-runnable and cannot silently revert an
afternoon of editing. `--force` overwrites, `--dry-run` reports.

**The JS modules are still there, as the FALLBACK** — the same decision
`constants/navigation.js` represents for the footer's phone number. If the API
is unreachable (a static deploy with no Django, a cold backend, a network
blip) the site shows the catalogue it shipped with rather than an empty
carousel and a contact form with no systems to choose from. It is also the
first paint every time: `CatalogueContext` starts from the shipped set and
swaps in the live one when the request lands, so nothing on the site waits for
a round trip.

**Media is a pair of fields, a path *or* an upload:**

| | |
|---|---|
| `/videos/sliding.mp4` | a build asset in `client/public`, under version control |
| an upload | stored under `MEDIA_ROOT`, served from `/media/…` |

The upload wins when both are set. Both exist because neither covers the
other: referencing the clips that shipped with the migration by path costs
nothing, and someone adding a system at 11pm has no way to put a file in
`client/public`.

**What is deliberately NOT editable:** the twelve profile series
(`GWS-N1-60H` and friends). A series is a tested extrusion with certificates
behind its U-value and its acoustic rating — it changes when the factory
changes, not when marketing does, and a text box around a figure the company
has to stand behind is an invitation to a typo. The editor chooses which
series a system is *ordered and flagged* with; the numbers stay in
`data/systems.js`.

---

## What the Studio covers

**Catalogue** — systems (create, edit, reorder, hide, delete) and, inside each
one, its variants: name, kind, one-line lede, four specification rows, clip
and poster, published state, and the order they are scrolled through. See the
section above.

**Dashboard** — page views, unique visitors, enquiries and average dwell time,
each against the previous window; a daily traffic chart; top pages, most-read
articles, device split, referrers; and a "needs attention" row that only
appears when something is actually waiting.

**Blog centre** — articles (create, edit, schedule, publish, duplicate,
delete), categories, authors, tags, and a comment moderation queue. The editor
carries the full field set: title, excerpt, HTML body with a live reading-time
estimate, key takeaways, featured image with alt text, category, author, byline
toggle, tags, per-article comment toggle, SEO (meta title, meta description,
focus keyword, canonical URL, noindex), status, schedule date and a featured
flag.

**Enquiry inbox** — every contact-form submission, stored as well as emailed,
with delivery status so a silent SMTP failure is visible.

**Contact settings** — recipient addresses **per enquiry type**, subject
prefix, and the customer auto-reply: an HTML editor with a sandboxed preview,
a placeholder legend, a reset-to-default, and two test sends. See *Email* below.

**Site settings** — contact details, WhatsApp, social profiles, default system
page layout, SEO defaults, map coordinates, maintenance mode, and **everything
a third party runs on the site**: Meta Pixel, GA4, Google Tag Manager and the
Search Console / Bing / Meta domain verification tokens. All of it is runtime
configuration, so opening an ad account needs no rebuild and no deploy, and a
blank field injects nothing at all. See *SEO* below.

> **The Meta Pixel is off until someone turns it on, deliberately.** The rest
> of this site's analytics are first-party and cookie-free — no cookie, no IP
> stored. The pixel is third-party tracking that sets cookies and sends
> visitor data to Meta, and in the EU/UK it needs consent first. There is no
> consent banner on this site yet, so the field should stay blank until either
> the audience is outside those jurisdictions or a banner exists. The panel
> says the same thing next to the field.

> **The Organization schema in `client/index.html` duplicates some of these
> values.** It is static HTML — it is the only structured data a
> non-rendering crawler sees, so it cannot read from Site Settings. Changing
> the phone number, address or a social profile means changing it in both
> places.

**Security log** — sign-in attempts and the audit trail, both read-only.

---

## Performance

### What the browser downloads

| | Raw | Gzipped |
|---|---|---|
| `index.js` — every public page, eagerly imported | 323 kB | **83 kB** |
| `react-vendor` | 190 kB | 60 kB |
| `gsap` | 112 kB | 44 kB |
| `router` | 43 kB | 15 kB |
| `index.css` | 184 kB | 33 kB |
| **Total on first paint** | | **≈235 kB** |

The Studio is a separate ~90 kB of chunks that only load at `/admin`, and the
vendor split means a copy edit reships the 83 kB app chunk rather than 200 kB
of framework the browser already holds.

**JavaScript is not this site's weight problem** — the media is. Which is why
the work below is about what gets requested, not about shaving kilobytes off a
bundle that is already reasonable.

### Media

**`client/public` is published in full.** Anything in it is copied verbatim
into `dist/`, baked into the web image and shipped to the server, whether or
not a single page links to it. 191 MB of it was ffmpeg *source* footage — the
originals that the frame sequences and variant clips were encoded from — which
now lives in [`assets-source/`](assets-source/README.md) instead. Nothing a
visitor requests changed; the build went from 325 MB to 121 MB.

That is a build and deploy saving, **not** a page-speed one. No browser was
ever downloading those files.

Everything that does ship is already paced deliberately:

- Frame sequences load frame 0 first, then batches of 6 every 120 ms
  (`utils/imageSequence.js`). The numbers are load-bearing and the file says
  so — 120 parallel requests would starve everything else on the page.
- Below-the-fold video is `preload="none"`; card video is `preload="metadata"`.
- The variant player ships its `<video>` elements with `data-src`, not `src`,
  so a system page fetches one clip rather than eight.
- The loader plays a 645 kB clip, not the 7 MB one it was cut from.

### First paint

Two changes in `index.html`:

**One font request, not two.** Both Google Fonts stylesheets blocked rendering,
serially, on separate round trips to the same host. The `css2` endpoint accepts
any number of `family=` parameters, so the second link was pure latency.

**The first hero frame is preloaded.** The homepage hero is a `<canvas>`
scrubbed through 120 WebP frames, and frame 0 is requested by `new Image()` —
which cannot run until the CSS and JS have downloaded, parsed and mounted
React. Until it lands the hero is blank. The preload starts that fetch
alongside the bundle. Two `media` queries make it exactly one file: the 76 kB
landscape frame or the 41 kB portrait one, never both.

> ⚠ `index.html` is the shell for **every** route, so someone landing on
> `/contact` downloads a hero frame they will not see and DevTools logs an
> unused-preload warning. Accepted: the homepage is the dominant entry point
> and the cost is one image. A per-route shell needs prerendering, which would
> also fix the social-preview limit below.

### Server

nginx does the parts a Django worker should never be tied up with: gzip on text
(never on video — it is already compressed), immutable one-year caching on the
content-hashed `/assets/`, 30 days on media, and `no-cache` on `index.html`
alone, which is what makes a deploy visible without breaking the hashed bundles
it names.

**Not done, and deliberately:**

- **Brotli** — roughly 15% better than gzip on text, but the stock nginx image
  has no brotli module and building one is more maintenance than 5 kB is worth
  here.
- **`width`/`height` on every `<img>`** — 61 of 95 lack them. Checked rather
  than assumed: they sit in containers with fixed sizing and `object-fit:
  cover`, so the CSS already reserves the space and there is no layout shift to
  fix. Worth adding for the ones that are not, which is a smaller job than the
  count suggests.
- **Lighthouse / Core Web Vitals** — not measured. There is no browser in the
  environment this was built in, so any number here would be invented. Run it
  against the live site after launch.

---

## SEO

Worked against the Digital Vint master checklist. What follows is what is
actually in place, what was deliberately skipped, and the one structural limit
that no amount of tags fixes.

### ⚠ The limit: social scrapers do not run JavaScript

This is a client-rendered SPA. **Googlebot renders JavaScript**, so per-page
titles, descriptions, canonicals and schema all work — that is most of the
checklist and it is genuinely done.

**Facebook, WhatsApp, LinkedIn and X do not.** They fetch the HTML and read it
as served. A link to `/products/casement` pasted into WhatsApp therefore shows
`index.html`'s tags — the site-level ones — not Casement's, no matter what the
React layer writes afterwards. Checklist item 9.8 ("paste a URL into WhatsApp
— preview card renders") passes; "shows the *right* page's card" does not, for
any URL but `/`.

The honest fixes, in order of effort:

1. **Prerender the routes at build time** (`vite-plugin-prerender` or similar,
   or an SSG pass) — produces a real HTML file per route with correct tags.
   Right answer for a site of ~15 stable routes plus articles.
2. **A prerender service** in front of the static host, serving rendered HTML
   to scraper user-agents only.
3. **Server-side rendering.** Correct and the most work; this app's sections
   are imperative GSAP ports that assume a DOM, so it is not a small change.

Until one of those, `index.html` carries values chosen to be defensible for
any URL on the site rather than homepage-specific ones, and the share image is
the brand card rather than a page-specific photograph.

### Crawler files — dynamic, from the database

| File | Served by | Contents |
|---|---|---|
| `/robots.txt` | `seo/views.py` | Allow-all, private paths disallowed, absolute `Sitemap:` and `LLMs:` |
| `/llms.txt` | `seo/views.py` | [llmstxt.org](https://llmstxt.org/) — company, every published system, the newest articles, services, key facts |
| `/sitemap.xml` | `seo/views.py` | Static routes + every published system + every published article, `<lastmod>` on **every** entry |

They are views, not files in `public/`, so they cannot list a system that was
unpublished this morning or miss one published this afternoon. `/static/` and
`/media/` are **not** disallowed — Google renders the page before scoring it,
and assets it cannot fetch make the page look broken.

`SITE_URL` in the environment is the canonical origin every absolute URL is
built from. It must be set in production, where Django sits behind a proxy and
`request.get_host()` is the internal host.

> **In production the SPA and Django share one origin.** Whatever serves the
> static build must pass `/robots.txt`, `/llms.txt` and `/sitemap.xml` through
> to Django rather than answering them with `index.html`:
>
> ```nginx
> location ~ ^/(robots\.txt|llms\.txt|sitemap\.xml)$ { proxy_pass http://django; }
> location /api/         { proxy_pass http://django; }
> location /django-admin/ { proxy_pass http://django; }
> location /media/       { alias /srv/glaze/media/; }
> location /             { try_files $uri $uri/ /index.html; }
> ```
>
> Without the first line a crawler asking for robots.txt gets an HTML document
> and ignores the file entirely.

### Structured data

One `@graph` in `index.html` with three `@id`-linked nodes — Organization
(+ HomeAndConstructionBusiness), LocalBusiness with real coordinates, and
WebSite with a SearchAction. It is in the **served HTML** because it is the
only schema a non-rendering crawler sees. `sameAs` carries all four social
profiles; leaving it empty is the single most commonly shipped schema mistake
and the strongest Knowledge Graph signal there is.

Per-page nodes are added by `components/common/SEO` and point back at the
Organization by `@id` rather than repeating it:

| Route | Schema |
|---|---|
| `/` | ItemList of the collection, CollectionPage |
| `/systems` | CollectionPage + ItemList |
| `/products/<slug>` | Product (with `additionalProperty` from the tested figures and `hasVariant` per variant) + BreadcrumbList |
| `/blog` | Blog |
| `/blog/<slug>` | BlogPosting (author as Person with `worksFor`) + BreadcrumbList |
| `/about`, `/contact` | AboutPage / ContactPage → Organization |

**No `Offer` and no `AggregateRating` on the product pages.** Both are on the
checklist and both would be fabricated: nothing on this site is priced and no
reviews are collected. Invented review markup is a manual action, not a
ranking boost.

### Per-page metadata

`components/common/SEO` owns title, description, canonical, robots, Open Graph
and X card on every route, and removes every tag it wrote on unmount — an SPA
has one `<head>` that outlives the route, so a tag left behind describes the
wrong page. Static duplicates are detached while a page-level one is present
and put back afterwards: two `<link rel="canonical">` is not two hints, it is
a page telling a crawler two different things about itself.

Index control: `/blog` filtered and paginated views are `noindex` and canonical
to `/blog`; the 404 is `noindex, follow` (the links out of it are the point);
`VITE_NOINDEX=true` makes a whole build `noindex, nofollow`, so "staging is
still indexable" cannot happen by forgetting a step.

### Favicons and the manifest

The supplied set is served from `/images/favicon_io/`, plus `/favicon.ico` at
the **root** because crawlers request it there blindly. `site.webmanifest`
shipped from the generator with the two mistakes the checklist lists first —
empty `name`/`short_name`, and icon `src` paths pointing at the site root when
the files are in a subfolder. Both fixed; `theme_color` and `background_color`
are the brand's.

`og-default.jpg` (1200×630) is generated by `scripts/make-og-image.py` — a
composed card rather than a cropped photograph, because every platform crops
to that ratio and hands the result to whoever shared the link.

### Not done, and why

| Item | Status |
|---|---|
| Per-page social previews | **Blocked on prerendering** — see the limit above |
| Product `Offer` / `AggregateRating` | Skipped — no prices, no reviews. Would be fabricated |
| hreflang / multilingual | Skipped — single-language site, no second locale planned |
| Cookie consent banner | **Needed before the Meta Pixel is switched on** for EU/UK traffic |
| Search Console / Bing / GA4 / Business Profile | Fields are wired and waiting; the accounts themselves are an operational step |
| Lighthouse, Core Web Vitals, crawl audit | Not measured — no browser in this environment |
| Image `width`/`height` audit (CLS) | Not swept across every section |
| Alt-text audit on migrated sections | Not swept |

---

## Email

**Transport: Gmail SMTP**, authenticated as `info@glazewindowsystems.com` with
a Google **app password**. It lives in `server/glaze/.env`, which is
gitignored — only the transport is configured there; who receives what is
edited in the panel.

```ini
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=info@glazewindowsystems.com
EMAIL_HOST_PASSWORD=<16-character app password>
EMAIL_USE_TLS=True
EMAIL_TIMEOUT=15
DEFAULT_FROM_EMAIL=Glaze Window Systems <info@glazewindowsystems.com>
```

Four things about this that will otherwise cost someone an afternoon:

- It must be an **app password** (myaccount.google.com/apppasswords, 2-Step
  Verification on). Google stopped accepting account passwords for SMTP in
  2022. Settings strips the spaces Google displays it with, so it can be
  pasted as shown.
- `EMAIL_BACKEND` is set **explicitly**. Its default while `DEBUG=True` is the
  console backend, which prints mail instead of sending it — comment the line
  out to get that back for local work.
- `DEFAULT_FROM_EMAIL` must be `EMAIL_HOST_USER` or a verified alias of it.
  **Gmail rewrites a From address it does not own**, so the `no-reply@` address
  the old default suggested would have been silently replaced on every message.
- `EMAIL_TIMEOUT` is set because Django's default is *no timeout*, and enquiry
  submission is a request a visitor is watching a spinner for.

### Where an enquiry goes

Each submission is filed into a **category derived from the page it came
from** — never from the payload, because a routing key the client can set is
one an attacker can set:

| Category | Submitted from | Setting |
|---|---|---|
| Contact form | `/contact` | Contact page enquiries |
| Product / system page | `/products/<slug>` | Product enquiries |
| General | anything else — the assistant, direct API calls | General enquiries |

Every per-type list is **optional and falls back to the default list**, so
behaviour is unchanged until someone deliberately splits a type out and no
enquiry can ever be routed to nobody. The panel shows the server's own answer
to "who would actually get this" under each field rather than re-implementing
the fallback rule.

The subject carries the category — `[Glaze Enquiry] [Product / system page]
Priya Sharma` — which is what a mail rule filters on when several types share
one inbox. It can be turned off.

The inbox at **Studio › Enquiries** filters by the same split, and Django
admin lists and filters on it too. Existing rows were backfilled from their
`source_path` by a data migration rather than left reading "General".

### Two test sends

**Auto-reply** goes to whatever address you type: it proves SMTP works and the
template renders. **Notification** goes to the *saved recipients for a chosen
type*, not to you — which is the only way to discover that the address typed
in for a colleague has a typo in it.

> ### ⚠ The app password was pasted into a chat — rotate it
>
> It is in that conversation log and in this machine's shell history. It is
> used **server-side only**, and an app password is scoped to mail rather than
> to the account: it cannot read Drive, cannot change the password and dies
> the moment 2-Step Verification is reset. But it can *send as*
> `info@glazewindowsystems.com`, which is the company's published address, and
> that is worth more to a phisher than most credentials.
>
> Revoke it at myaccount.google.com/apppasswords, generate a new one, and put
> it in `server/glaze/.env`. Nothing else has to change.

---

## Admin login security

Layered, because each layer stops something the others do not.

| Layer | What it stops | Where |
|---|---|---|
| Argon2id hashing | Offline cracking of a stolen hash | `settings.PASSWORD_HASHERS` |
| Captcha | Unattended scripted submission | `account/captcha.py` |
| Account lockout (5 tries) | Guessing at a known address | `account/security.py` |
| IP lockout (20 tries) | Password spraying across many accounts | `account/security.py` |
| Rate limit (10/min) | Volume | `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES` |
| HttpOnly cookies | Token theft via XSS | `account/cookies.py` |
| CSRF on every unsafe method | Cross-site request forgery | `AUTH_COOKIE.ENFORCE_CSRF` |
| Audit log | Silent privilege abuse | `account/models.AuditLog` |

**The captcha** is self-hosted by default — no third-party account, no visitor
data leaving the box, works offline. The challenge is stateless: it travels as
`payload.signature` where the payload holds a **keyed HMAC of the answer**, its
nonce and its expiry, and the signature is an HMAC over the payload. The
plaintext answer never leaves the server. The MAC is keyed rather than a bare
hash for a specific reason — a plain SHA-256 of a five-character answer is
brute-forceable in seconds (32⁵ ≈ 33 million), but without the server key there
are no candidate digests to enumerate at all. A solved nonce is burned into a
uniquely-constrained table so a captured token cannot be replayed. Set
`CAPTCHA_PROVIDER` to `recaptcha`, `hcaptcha` or `turnstile` to use a hosted one
instead.

**The lockout ladder** doubles on each consecutive lockout (5 min → 10 → 20 …
capped at 24h) and the strike count survives the lockout expiring, so a patient
attacker's cost keeps climbing while an owner who mistypes twice and then
succeeds has their record wiped. Failures are recorded against the *submitted*
email even when no such account exists — skipping those would turn the lockout
into an account oracle.

**Order matters** in `AdminLoginView`: lockout → captcha → password → staff
check. A barred caller never costs us an Argon2 verification, and the wrong
password and valid-but-not-staff cases share one error message so neither
confirms anything.

To release a lockout early, delete the row under **Account › Login lockouts**
in Django admin.

### Not included

**Two-factor authentication.** It was not in the brief and is the single
biggest remaining hardening step for an internet-facing panel. `django-otp`
plus a TOTP device on the User model would slot into `AdminLoginView` between
the password and staff checks.

---

## Analytics and privacy

First-party, built in, and it sets **no cookie and stores no IP address**. A
visitor is counted through

```
visitor_hash = HMAC-SHA256(K_day, ip || user_agent)
K_day        = HMAC-SHA256(SECRET_KEY, "analytics-salt:" || YYYY-MM-DD)
```

The key rotates at midnight UTC, so the same person on two consecutive days
produces two unrelated hashes — enough to count uniques within a day, useless
for profiling across days. Keyed rather than plain for the same reason as the
captcha: the IPv4 space is 2³², trivially enumerable against a bare hash.

A page is counted once per visitor per path per 30 minutes, so reloads and
React re-mounts do not inflate it. `/admin` is never tracked.

Raw rows are the source of truth; roll them up and prune nightly:

```bash
python manage.py rollup_analytics --retain-days 90
```

History survives as `DailyStat` counts after the raw rows are pruned.

---

## Blog content and HTML safety

The editor accepts raw HTML by design. `blog/sanitize.py` runs an allowlist in
`Post.save()` — **on write, not on read** — so the stored value is already safe
and no consumer can forget to clean it. Backend is `nh3` (Rust `ammonia`
bindings, the maintained successor to bleach's cleaner), with a stricter
stdlib fallback if it is missing.

Verified stripped: `<script>`, `<style>`, `<iframe>`, `<form>`, `on*` handlers,
`javascript:` and `data:` URLs, and any class outside the allowlist.

Allowed article components:

```html
<div class="bl-tip">…</div>       <!-- Tip -->
<div class="bl-expert">…</div>    <!-- From our engineers -->
<div class="bl-insight">…</div>   <!-- Insight -->
<div class="bl-note">…</div>      <!-- Note -->
<div class="bl-warning">…</div>   <!-- Watch out -->
```

Each renders its own label from CSS, so colour is never the only signal. The
allowlist in `blog/sanitize.py` and the styles in `client/src/styles/blog.css`
have to stay in step.

Comments are different: stored as plain text, escaped on render, and held as
`pending` until a moderator approves them.

---

## Changes to existing behaviour

Things that were not purely additive.

**The navigation lost three items and gained a page.** *Projects*,
*Performance* and *Process* are out of the nav and the footer. Projects never
had a section to land on — it pointed at `#projects`, an id nothing in the
migration renders, so removing the link *is* hiding the section; there was
nothing else to hide. The Performance and Process **sections still render on
the homepage**, they are simply no longer in the menu. *Systems* now points at
`/systems`, a page of its own carrying the same carousel the homepage still
runs — one component, two routes, so a system added in the panel appears in
both. The bar is back to four items, which clears the 769–1024px squeeze the
seven-item row had.

**Systems and variants come from the database.** See the catalogue section
above. The public site reads `/api/v1/catalogue/`; the shipped modules are the
offline fallback.

**One order, not two.** The site had two orders for the same seven systems —
the carousel's and the footer column's. A record has one `order`, seeded from
the carousel's, and the footer column and cross-links follow it.

**The system pages' enquiry form sends.** It used to assemble its payload,
attach the five-layer attribution and `console.info` it — faithful to the
original, whose own comment said no endpoint was wired up yet. It posts to
`/api/v1/enquiries/` now, with the configuration (system, variant, series,
glass, finish) folded into the message, so an enquiry raised from the page
someone just configured reaches the same inbox as every other one.

**The contact form's variant field is a select, not a text box.** It listed
"as named on the system page", which is a spelling test the specifier has to
un-guess. It now offers the chosen system's actual variants, filtered as the
system chip changes, and folds away entirely for a system with none.

**The contact form now posts to the API.** It used to post directly to
`formsubmit.co`, which froze the recipient address into the JavaScript and left
no searchable record. It now hits `/api/v1/enquiries/`, which stores the row and
then emails whoever Contact Settings currently names — otherwise that settings
screen would be decorative. `formsubmit.co` is kept as a **fallback** for a
static deploy with no Django behind it; a lost enquiry is a lost customer.

**"Journal" was added to the navigation.** It is not in the original markup. The
home bar goes from six items to seven, and between 769px and 1024px that row
gets tight — worth a look if it ever needs trimming.

**The footer reads Site Settings.** Markup, class names and copy are unchanged;
only the source of the values. The hard-coded constants remain as the fallback
when the API is unreachable.

---

## Verified

Backend, end to end over HTTP with a real cookie jar:

- captcha: correct answer accepted; replayed, wrong, tampered and empty all rejected
- login: wrong password 401, bad captcha 400, valid 200 with both HttpOnly cookies
- lockout ladder trips at 5 failures and returns 429 with `retry_after`
- CSRF: unsafe POST without `X-CSRFToken` rejected before authentication
- all 11 admin endpoints 401 anonymous / 200 as staff
- article create → sanitize → publish → publicly visible → delete → 404
- settings PATCH reflected in the public payload; invalid recipient email rejected
- analytics dedupe: 3 identical beacons → 1 row, 1 view
- enquiry: 201 with notification email sent, honeypot filed as spam, validation rejects no-contact-details

Catalogue, against the live database:

- admin round trip: list → create system → add two variants → duplicate key
  rejected 400 → reorder → patch → public payload reflects it → delete 204
- multipart upload: JSON columns survive the form encoding, the file is stored
  and the resolved `/media/…` url is what the public payload carries

SEO:

- `/robots.txt`, `/llms.txt`, `/sitemap.xml` all 200 with the right
  `Content-Type`; the sitemap parses as XML and carries a `<lastmod>` on every
  one of its entries, static routes included
- every internal link in `llms.txt` is absolute and resolves to a real route
- the `@graph` in `index.html` parses, has no dangling `@id` reference, and
  `sameAs` is not empty
- every local asset the head references exists on disk, and the manifest's
  icon paths resolve
- tracking settings round-trip through the API and reach the public payload;
  a cleared coordinate is accepted as null

Email, over real Gmail SMTP:

- SMTP login with the app password succeeds
- a full `POST /enquiries/` from `/products/sliding` stored the row, stamped
  `notified_at` and `auto_replied_at`, and delivered both messages
- routing: `/products/…` → product list, `/contact` → contact list, `/blog/…`
  → general; a blank per-type list falls back to the default; the subject
  carries the category
- validation: a malformed address in any list is rejected, and the default
  list cannot be emptied

Frontend: `npm run lint` clean (3 fast-refresh warnings on context files),
`npm run build` clean, all routes serve.

**Not verified: how any of this looks in a browser.** Everything above is
functional testing. The blog and Studio have not been visually reviewed at any
breakpoint.
