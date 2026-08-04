/**
 * The canonical public origin — scheme and host, no trailing slash.
 *
 * Every canonical, og:url and JSON-LD @id is built from this. It is a
 * CONSTANT rather than `window.location.origin` on purpose: a canonical that
 * echoes whatever host served the page tells a crawler that
 * `staging.example.com/about` is the canonical version of itself, which is
 * exactly how a staging site ends up in the index competing with production.
 *
 * `VITE_SITE_URL` overrides it at build time so a staging build can point at
 * itself deliberately — and staging should also be serving `noindex`, which
 * is `VITE_NOINDEX` below.
 */
export const SITE_ORIGIN = (
  import.meta.env.VITE_SITE_URL || 'https://www.glazewindowsystems.com'
).replace(/\/$/, '')

/**
 * Whether this build should tell crawlers to stay away entirely.
 *
 * Env-driven rather than a flag someone remembers to flip: "the staging site
 * is still indexable" and "the live site is still noindex" are both on the
 * pre-launch checklist because both have shipped, and both are the same
 * mistake — a manual step. Set `VITE_NOINDEX=true` in the staging build's
 * environment and every page carries `noindex, nofollow` with nothing to
 * remember at launch.
 */
export const FORCE_NOINDEX =
  String(import.meta.env.VITE_NOINDEX || '').toLowerCase() === 'true'

/** A path (or an already-absolute URL) as an absolute URL on the canonical origin. */
export function absoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return SITE_ORIGIN
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${SITE_ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

/**
 * The organisation node every per-page schema points back at, by @id.
 *
 * Referenced rather than repeated: the full Organization is in index.html
 * where a non-rendering crawler can read it, and a page that restated it
 * would be asserting the company's identity once per route.
 */
export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`

/**
 * BreadcrumbList for a trail of [{ name, path }].
 *
 * ⚠ The schema has to match a breadcrumb the visitor can actually see —
 * Google treats an invisible one as spam. The system pages and articles both
 * render a visible trail; the top-level routes are one level deep and pass
 * `[]`, which returns null rather than a one-item list.
 */
export function breadcrumbSchema(trail) {
  if (!trail || trail.length < 2) return null
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  }
}

/** Wrap page nodes in a @graph with the shared @context. */
export function graph(nodes) {
  const present = (nodes || []).filter(Boolean)
  if (!present.length) return null
  return { '@context': 'https://schema.org', '@graph': present }
}
