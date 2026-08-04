import { Link, Navigate, useLocation } from 'react-router-dom'
import SEO from '@/components/common/SEO'
import { ROUTES, LEGACY_PATHS, productPath } from '@/constants/routes'
import { useCatalogue } from '@/context/CatalogueContext'
import './notFound.css'

/**
 * The page that was missing — and the reason the site showed a white screen.
 *
 * WHAT WAS ACTUALLY WRONG. App.jsx declared no `path="*"` route. React Router
 * renders NOTHING when no route matches — not an error, not a fallback, an
 * empty tree — so every unrecognised URL painted a blank white document.
 * Reproduced headlessly before writing this: `/some-old-link` returned an
 * empty #root and the router logged `No routes matched location`, while every
 * declared route rendered 24k-82k of markup. It was never a crash.
 *
 * That is worse than it sounds on a site migrated FROM a static one. The
 * originals were `about.html`, `contact.html`, `products/sliding.html` — so
 * every stale bookmark, every link in an old email or brochure QR code, and
 * every search result still pointing at a `.html` filename landed on a blank
 * page rather than the page that replaced it. LEGACY_PATHS already existed in
 * constants/routes.js, written during the conversion; nothing had ever
 * consumed it at runtime.
 *
 * So this component does two jobs:
 *
 *   1. REDIRECT a known legacy filename to its new route, with `replace`, so
 *      Back does not bounce the visitor into the redirect again.
 *   2. Otherwise render a real 404 with somewhere to go.
 *
 * It is mounted INSIDE RootLayout, so the navbar and footer are there. A 404
 * stripped of navigation is a dead end; a 404 with the site's own header is a
 * wrong turn.
 */

/** `/About.html` and `/about.html/` are the same request as `/about.html`. */
function normalise(pathname) {
  return pathname.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '')
}

export default function NotFound() {
  const { pathname } = useLocation()
  // The catalogue rather than PRODUCT_SLUGS: a 404 offering a system that no
  // longer exists is a second dead end.
  const { systems } = useCatalogue()
  const key = normalise(pathname)

  // `index.html` was the static entry point and is not in LEGACY_PATHS,
  // which maps the named pages only.
  const target = LEGACY_PATHS[key] || (key === 'index.html' ? ROUTES.HOME : null)

  if (target) return <Navigate to={target} replace />

  return (
    <main className="nf" id="main">
      {/* ⚠ `noindex, follow` — not `noindex, nofollow`. A 404 must not be
          indexed, but the links out of it are the point of having a designed
          one: they are how a crawler that landed here finds the pages that
          replaced whatever it was looking for. */}
      <SEO
        title="Page not found — Glaze"
        description="The address does not match anything on this site."
        noindex
      />
      <div className="nf__inner">
        <p className="nf__eyebrow">Error 404</p>

        <h1 className="nf__title">
          This page has
          <em> disappeared.</em>
        </h1>

        <p className="nf__body">
          Not by design, for once. The address{' '}
          <code className="nf__path">{pathname}</code> does not match anything
          on this site — it may have moved during the rebuild, or the link that
          brought you here may be incomplete.
        </p>

        <div className="nf__actions">
          <Link to={ROUTES.HOME} className="nf__cta">Back to home</Link>
          <Link to={ROUTES.CONTACT} className="nf__link">Talk to the team</Link>
        </div>

        <nav className="nf__systems" aria-label="Our systems">
          <p className="nf__systems-label">Or jump to a system</p>
          <ul className="nf__systems-list">
            {systems.map((system) => (
              <li key={system.slug}>
                <Link to={productPath(system.slug)}>{system.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}
