import { LEGACY_PATHS, ROUTES } from '@/constants/routes'

/**
 * Turns a static-site href into something the router can use.
 *
 * Rules, matching how the original pages behaved:
 *   '#systems'            → same-page anchor. Kept as a raw hash while on
 *                           Home (Lenis intercepts it); becomes '/#systems'
 *                           from another route, which is what
 *                           'hero.html#systems' did on the static site.
 *   'about.html'          → '/about'
 *   'contact.html#enquiry'→ '/contact#enquiry'
 *   'hero.html#systems'   → '/#systems'
 *   'products/pivot.html' → '/products/pivot'
 *   '/blog'               → itself, but flagged internal so it renders as a
 *                           <Link>. Routes with no static-site ancestor (the
 *                           blog) are written as real router paths rather
 *                           than invented .html filenames.
 *   anything else         → returned untouched (mailto:, tel:, https:).
 *
 * ⚠ The bare-hash rule is why Navbar does NOT send the Products CTA
 * through here: on a system page `#contact` means the enquiry section of
 * that page, but this function would read it as one of hero.html's own
 * anchors and rewrite it to '/#contact'.
 *
 * @returns {{ to: string, internal: boolean }}
 */
export function resolveHref(href, currentPath = ROUTES.HOME) {
  if (!href) return { to: href, internal: false }

  // Same-page anchor
  if (href.startsWith('#')) {
    return currentPath === ROUTES.HOME
      ? { to: href, internal: false }
      : { to: `${ROUTES.HOME}${href}`, internal: true }
  }

  // An absolute router path. Without this it would fall through to the
  // catch-all and render as a plain <a>, costing a full document reload —
  // and on the blog that means re-downloading the bundle to move between
  // two pages of the same app.
  if (href.startsWith('/')) {
    return { to: href, internal: true }
  }

  const [file, hash] = href.split('#')
  const route = LEGACY_PATHS[file]

  if (route) {
    const suffix = hash ? `#${hash}` : ''
    // A legacy link that resolves to the page we are already on collapses
    // to a plain anchor, exactly as hero.html's own '#systems' links did.
    if (route === currentPath && suffix) return { to: suffix, internal: false }
    return { to: `${route}${suffix}`, internal: true }
  }

  return { to: href, internal: false }
}
