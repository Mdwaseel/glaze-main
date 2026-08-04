/**
 * Route table for the migrated site.
 *
 * The static pages linked to each other by filename. Keep LEGACY_PATHS in
 * sync so every converted <a href="about.html"> becomes the right <Link>.
 */
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',

  /**
   * The collection index. NO STATIC ORIGINAL — the systems carousel used to
   * be §Systems on hero.html, reached by the `#systems` hash. It now has a
   * page of its own so the nav item means one thing from everywhere and the
   * homepage is not carrying the whole catalogue's scroll track.
   */
  SYSTEMS: '/systems',

  /** One route for all seven system pages — see PRODUCT_SLUGS below. */
  SYSTEM: '/products/:slug',

  /** Blog — no static original; these are new routes, not migrated ones. */
  BLOG: '/blog',
  BLOG_POST: '/blog/:slug',

  /**
   * Admin panel. Served by React, NOT by Django — Django's own admin was
   * moved to /django-admin/ so the two can share one origin in production
   * without Django winning this path.
   */
  ADMIN: '/admin',
  ADMIN_LOGIN: '/admin/login',
}

/** /blog/<slug> */
export const blogPath = (slug) => `/blog/${slug}`

/** products/<slug>.html -> /products/<slug> */
export const productPath = (slug) => `/products/${slug}`

/** Original static filename -> React route. Used while converting markup. */
export const LEGACY_PATHS = {
  'hero.html': ROUTES.HOME,
  'about.html': ROUTES.ABOUT,
  'contact.html': ROUTES.CONTACT,
  'products/sliding.html': productPath('sliding'),
  'products/casement.html': productPath('casement'),
  'products/lift-and-slide.html': productPath('lift-and-slide'),
  'products/bi-fold.html': productPath('bi-fold'),
  'products/pivot.html': productPath('pivot'),
  'products/fixed.html': productPath('fixed'),
  /* No static original — there was never a products/tilt-and-turn.html to
     bookmark. Listed anyway so a hand-typed legacy-style URL lands on the
     page rather than the 404. */
  'products/tilt-and-turn.html': productPath('tilt-and-turn'),
}

/**
 * Per-route <title>, verbatim from each static page's <head>:
 *   hero.html line 6 · about.html line 6 · contact.html line 6
 *
 * The static site had one document per page, so each carried its own
 * title. An SPA has one <head>, so client/index.html can only ship the
 * Home title — every other route showed it too until RootLayout started
 * applying this map. None of the three pages ships a meta description or
 * any other per-page head tag, so the title is all there is to sync.
 */
export const PAGE_TITLES = {
  [ROUTES.HOME]: 'Glaze — Premium Aluminium Window & Door Systems',
  [ROUTES.ABOUT]: 'About — Glaze | Designed to Disappear',
  [ROUTES.CONTACT]: 'Contact — Glaze | Designed to Disappear',
  // No static original — see ROUTES.SYSTEMS.
  [ROUTES.SYSTEMS]: 'Systems — Glaze | The Collection',
  // /blog sets its own title on mount; /blog/:slug is per-article and is
  // applied by the page from the post's meta_title, so neither is keyed here.
}

/**
 * The product detail pages. Six were migrated: each was a separate
 * 3,895-line file under products/; they differ from one another by about
 * forty-four lines, so they share one route and one page component driven
 * by the catalogue.
 *
 * ⚠ THIS LIST IS NO LONGER THE AUTHORITY ON WHICH SYSTEMS EXIST. That is
 * the catalogue (context/CatalogueContext.jsx), which the panel edits and
 * which every list on the site now reads. This is kept because LEGACY_PATHS
 * above still has to name the seven `.html` filenames that were bookmarkable
 * before the migration — a fixed historical set that no longer grows.
 *
 * ⚠ `tilt-and-turn` IS THE SEVENTH AND HAS NO STATIC ORIGINAL.
 */
export const PRODUCT_SLUGS = [
  'sliding', 'casement', 'tilt-and-turn', 'lift-and-slide', 'bi-fold', 'pivot', 'fixed',
]

/**
 * ⚠ The system pages' <title>s are NOT in PAGE_TITLES above. That map is
 * keyed by an exact pathname, and `/products/:slug` is one route serving
 * six pages — so each system's title (and its meta description and
 * Product schema, which the other three pages do not have) lives beside
 * the rest of its content in data/systems.js and is applied by the page.
 */
