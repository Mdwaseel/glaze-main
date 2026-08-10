import { useLayoutEffect, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useCatalogue } from '@/context/CatalogueContext'
import Loader from '@/components/common/Loader'
import Navbar from '@/components/common/Navbar'
import Footer from '@/components/common/Footer'
import ChatWidget from '@/components/common/ChatWidget'
import {
  NAV_LINKS,
  NAV_LINKS_INNER,
  NAV_LINKS_SYSTEM,
  NAV_LINKS_BLOG,
  FOOTER_EXPLORE_LINKS,
  FOOTER_EXPLORE_LINKS_INNER,
  FOOTER_EXPLORE_LINKS_BLOG,
} from '@/constants/navigation'
import { ROUTES, PAGE_TITLES, productPath } from '@/constants/routes'

/**
 * Shared page shell, in the same DOM order as <body> on the static pages:
 *
 *   <a class="skip-link">        (hero.html line 1405 — HOME ONLY. about.html
 *                                 and contact.html ship no skip link, so
 *                                 neither does this layout on those routes:
 *                                 rendered site-wide it is the first Tab
 *                                 stop on pages whose originals have none,
 *                                 and it shows up in the pages' innerText.)
 *   <nav class="nav">            + the sibling <div class="nav__drawer">
 *   … page sections …
 *   <footer class="footer">
 *
 * hero.html and about.html/contact.html ship the SAME nav and footer
 * components with different link sets, so the variant is chosen by route
 * here rather than duplicating the components:
 *
 *   Home   — bare anchors, "Process" present, plain CTAs
 *   Inner  — hero.html#… anchors, no "Process", aria-current on the active
 *            link, `sheen` + `data-magnetic` CTAs, and the footer's Explore
 *            column pointing back at hero.html
 *   System — the products/*.html variant, and NOT the inner one: it KEEPS
 *            "Process", marks Systems as current, flips `nav--scrolled` at
 *            40px rather than 60, its CTA is the in-page `#contact` anchor
 *            rather than contact.html, and its footer's first column is
 *            "Systems" (all six pages) rather than "Explore". It ships no
 *            skip link, like the inner pages.
 *
 * ⚠ THE LOADER MOVED HERE, from About. about.html was the only original
 * that ran a preloader, so About was the only page that mounted one. It is
 * now the animated GLAZE mark rather than a page-specific wordmark, and
 * the brief is that it opens the site — so it is mounted once, at the
 * layout, and shows on whichever public page the visitor lands on first.
 * It still shows exactly ONCE per session (sessionStorage, inside the
 * component), and it still announces 'glaze:reveal-hero' either way, which
 * is what About's hero heading waits on.
 *
 * It sits above the skip link on purpose: while it is up, `is-loading`
 * locks the scroll and there is nothing behind it to skip to. It is
 * aria-hidden and takes no tab stop, so the first Tab is still the skip
 * link on the routes that ship one.
 *
 * It is NOT in the admin tree — that has its own layout, and staff opening
 * a data table do not want a six-second brand animation.
 */
export default function RootLayout() {
  const { pathname } = useLocation()
  const { systems } = useCatalogue()

  /* The system pages replace the footer's "Explore" column with a "Systems"
     one listing every system — the only footer difference on the site, and
     the one place a hard-coded list would go stale the day someone adds a
     system in the panel. FOOTER_SYSTEM_LINKS is gone; this is it. */
  const systemLinks = useMemo(
    () => systems.map((s) => ({ label: s.name, href: productPath(s.slug) })),
    [systems],
  )

  /**
   * Hang the same list under the nav's "Systems" item as a submenu.
   *
   * Attached HERE rather than in constants/navigation.js because that module
   * is static and this list is not — it is whatever the catalogue currently
   * holds, so a system published in the panel appears in the nav of every
   * page without a deploy, and an unpublished one leaves it.
   *
   * Matched on the href rather than the label so a renamed nav item does not
   * silently lose its menu.
   */
  const withSystemsMenu = (set) =>
    set.map((link) =>
      link.href === ROUTES.SYSTEMS ? { ...link, children: systemLinks } : link,
    )
  const isSystem = pathname.startsWith('/products/')
  const isBlog = pathname === ROUTES.BLOG || pathname.startsWith('/blog/')

  /**
   * The utility pages: the confirmation and the three policies.
   *
   * They have no hero of their own — they are type on a light ground under a
   * fixed 70px bar — which is the same situation /systems and the blog are
   * in, and it has the same consequence: the navbar's resting state is white
   * links on a transparent scrim, so without `alwaysSolid` below the bar is
   * invisible on every one of them. They also take the INNER link set, so
   * every section link points back at Home rather than at an anchor on a
   * document that does not have it.
   */
  const isUtility =
    pathname === ROUTES.FAQ ||
    pathname === ROUTES.GALLERY ||
    pathname === ROUTES.THANK_YOU ||
    pathname === ROUTES.PRIVACY ||
    pathname === ROUTES.TERMS ||
    pathname === ROUTES.COOKIES

  /**
   * "Nothing matched" — the 404, which sits on the bone ground and had the
   * same invisible-navbar problem as the pages above.
   *
   * Determined by elimination because the layout cannot ask the router what
   * it matched. The list is every public pathname that is not a prefix; the
   * two prefixes are tested separately above.
   *
   * ⚠ THE FAILURE MODE IS DELIBERATELY THE HARMLESS ONE. A route added to
   * App.jsx and forgotten here is treated as a 404 for this one purpose,
   * which makes the navbar solid on a page that may not need it. The
   * opposite default — assume every unknown path is a real page — makes the
   * bar invisible on the 404 itself, which is where a lost visitor needs it
   * most.
   */
  const isNotFound =
    !isSystem &&
    !isBlog &&
    ![
      ROUTES.HOME, ROUTES.ABOUT, ROUTES.CONTACT, ROUTES.SYSTEMS, ROUTES.BLOG,
      ROUTES.FAQ, ROUTES.GALLERY,
      ROUTES.THANK_YOU, ROUTES.PRIVACY, ROUTES.TERMS, ROUTES.COOKIES,
    ].includes(pathname)

  // /systems is grouped with About and Contact: hero.html-style links back,
  // aria-current on its own nav item, sheen CTAs.
  const isInner =
    pathname === ROUTES.ABOUT ||
    pathname === ROUTES.CONTACT ||
    pathname === ROUTES.SYSTEMS ||
    isUtility

  // Each static page carried its own <title>; an SPA has one <head>, so
  // index.html can only ship Home's. Applied before paint so the tab label
  // never shows the previous route's title after a navigation.
  useLayoutEffect(() => {
    const title = PAGE_TITLES[pathname]
    if (title) document.title = title
  }, [pathname])

  let links = NAV_LINKS
  if (isSystem) links = NAV_LINKS_SYSTEM
  else if (isBlog) links = NAV_LINKS_BLOG
  else if (isInner) {
    links = NAV_LINKS_INNER.map((l) => ({
      ...l,
      current: (l.href === 'about.html' && pathname === ROUTES.ABOUT) ||
        (l.href === 'contact.html' && pathname === ROUTES.CONTACT) ||
        (l.href === ROUTES.SYSTEMS && pathname === ROUTES.SYSTEMS),
    }))
  }
  links = withSystemsMenu(links)

  return (
    <>
      <Loader />
      {!isInner && !isSystem && !isBlog && <a href="#top" className="skip-link">Skip to content</a>}
      <Navbar
        links={links}
        logoHref={isInner || isSystem || isBlog ? 'hero.html' : '#top'}
        ctaClassName={isInner ? 'nav__cta sheen' : 'nav__cta'}
        drawerCtaClassName={isInner ? 'nav__drawer-cta sheen' : 'nav__drawer-cta'}
        ctaMagnetic={isInner}
        ctaHref={isSystem ? '#contact' : 'contact.html#enquiry'}
        scrollThreshold={isSystem ? 40 : 60}
        // The blog, /systems, the 404 and the utility pages are the ones with
        // no hero image behind the bar; the resting transparent scrim would
        // put white links on a light ground. (The 404 is not a route this
        // layout can name — it is whatever did not match — so it is the one
        // case tested by elimination.)
        alwaysSolid={isBlog || isUtility || pathname === ROUTES.SYSTEMS || isNotFound}
      />
      <Outlet />
      {isSystem ? (
        <Footer
          exploreLinks={systemLinks}
          firstColumnTitle="Systems"
          firstColumnLabel="Systems"
        />
      ) : (
        <Footer
          exploreLinks={
            isBlog
              ? FOOTER_EXPLORE_LINKS_BLOG
              : isInner
                ? FOOTER_EXPLORE_LINKS_INNER
                : FOOTER_EXPLORE_LINKS
          }
        />
      )}

      {/* Last in the DOM on purpose: a fixed overlay reached before the page
          content would put the assistant ahead of the nav in tab order.
          RootLayout only wraps the public routes — the admin shell is a
          separate layout, so the widget never appears there. */}
      <ChatWidget pathname={pathname} />
    </>
  )
}
