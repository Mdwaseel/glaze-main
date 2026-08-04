import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { NAV_LINKS, LOGO_SRC } from '@/constants/navigation'
import { resolveHref } from '@/utils/links'
import './navbar.css'

/**
 * Navbar — port of the <nav id="nav"> + <div id="navDrawer"> markup in
 * hero.html (lines 1410-1449) and the drawer/scroll logic from the base
 * script (lines 4106-4146).
 *
 * Markup, class names and ids are unchanged. There is no GSAP here and
 * none is added: every motion in this component is a CSS transition
 * declared in navbar.css —
 *   • bar background/padding : transition on .nav, 0.4s ease
 *   • hamburger → X          : .nav__toggle[aria-expanded="true"] rules,
 *                              transform/opacity 0.3s ease
 *   • drawer slide           : .nav__drawer.is-open, translateY(-100%)→0,
 *                              0.45s cubic-bezier(0.16, 1, 0.3, 1)
 * State only flips the same classes/attributes the vanilla code did.
 */
/**
 * Variant props exist for the About/Contact nav, which is the same
 * component with different hrefs plus three markup additions:
 * `aria-current="page"` on the active link, and `sheen` /
 * `data-magnetic` on the CTAs. Every default below reproduces
 * hero.html's nav exactly, so Home's output is unchanged.
 */
/**
 * Two more props landed with the Products system pages, which ship a
 * third variant of the same nav:
 *   `ctaHref`         — their CTA is `#contact`, an anchor to the enquiry
 *                       section on the page itself, where every other page
 *                       points at contact.html#enquiry. A bare hash is
 *                       rendered as a plain <a> and NOT run through
 *                       resolveHref, whose same-page-anchor rule would
 *                       rewrite it to '/#contact' — i.e. send the visitor
 *                       to the homepage — from any route but Home.
 *   `scrollThreshold` — products/*.html flips `nav--scrolled` at 40px;
 *                       hero/about/contact all use 60.
 *
 * `alwaysSolid` landed with the blog, which is the first page on the site
 * with no hero image. The resting nav is white text over a transparent
 * gradient scrim, which is legible over a photograph and invisible over the
 * blog's white ground. This pins `nav--scrolled` on, so the bar starts solid
 * instead of appearing only once the reader scrolls past a headline they
 * could not read. Every migrated page leaves it false and is unaffected.
 */
export default function Navbar({
  links = NAV_LINKS,
  logoHref = '#top',
  ctaClassName = 'nav__cta',
  drawerCtaClassName = 'nav__drawer-cta',
  ctaMagnetic = false,
  ctaHref = 'contact.html#enquiry',
  scrollThreshold = 60,
  alwaysSolid = false,
}) {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef(null)

  // ── Scroll-aware nav (drop mix-blend-mode past hero) ──
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > scrollThreshold)
    }
    onScroll() // original calls onScroll() once before binding
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrollThreshold])

  // ── Body scroll lock while the drawer owns the screen ──
  useEffect(() => {
    document.body.classList.toggle('nav-open', drawerOpen)
    return () => document.body.classList.remove('nav-open')
  }, [drawerOpen])

  // ── Close on Escape ──
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Close the drawer when a link is tapped
  const onDrawerClick = (e) => {
    if (e.target.closest('a')) setDrawerOpen(false)
  }

  const renderLink = (link, className) => {
    const { to, internal } = resolveHref(link.href, pathname)
    // Only the desktop list carries aria-current on the static site; the
    // drawer link does not, so it is opt-in per call site.
    const current = link.current && className === 'nav__link' ? 'page' : undefined
    return internal ? (
      <Link key={link.label} to={to} className={className} aria-current={current}>
        {link.label}
      </Link>
    ) : (
      <a key={link.label} href={to} className={className} aria-current={current}>
        {link.label}
      </a>
    )
  }

  /**
   * A nav item, with its submenu when it has one.
   *
   * ⚠ THE SUBMENU OPENS ON HOVER AND ON FOCUS-WITHIN, IN CSS, with no state
   * and no click handler — see navbar.css. That is not laziness: a JS-driven
   * dropdown has to reimplement focus trapping, outside-click, Escape and the
   * roving tab order, and every one of those is a way to make a menu that a
   * keyboard cannot leave. `:focus-within` gets it right by construction —
   * Tab into the parent opens it, Tab continues through the children, Tab out
   * closes it, and Escape is the browser's own blur.
   *
   * The parent stays a real link rather than becoming a disclosure button.
   * /systems is a page worth landing on, and a top-level item that cannot be
   * activated is the single most common complaint about mega menus.
   */
  const renderItem = (link) => {
    if (!link.children?.length) return renderLink(link, 'nav__link')

    return (
      <div className="nav__item" key={link.label}>
        {renderLink(link, 'nav__link')}
        <span className="nav__caret" aria-hidden="true"></span>
        <div className="nav__menu">
          <span className="nav__menu-edge" aria-hidden="true"></span>
          {link.children.map((child) => renderLink(child, 'nav__menu-link'))}
        </div>
      </div>
    )
  }

  // A bare hash stays a bare hash — see the ctaHref note above.
  const cta = ctaHref.startsWith('#')
    ? { to: ctaHref, internal: false }
    : resolveHref(ctaHref, pathname)
  const logo = resolveHref(logoHref, pathname)

  return (
    <>
      <nav className={scrolled || alwaysSolid ? 'nav nav--scrolled' : 'nav'} id="nav">
        {logo.internal ? (
          <Link to={logo.to} className="nav__logo" aria-label="Glaze — home">
            <img src={LOGO_SRC} alt="Glaze Window Systems" />
          </Link>
        ) : (
          <a href={logo.to} className="nav__logo" aria-label="Glaze — home">
            <img src={LOGO_SRC} alt="Glaze Window Systems" />
          </a>
        )}

        <div className="nav__links">
          {links.map(renderItem)}
        </div>

        {cta.internal ? (
          <Link to={cta.to} className={ctaClassName} data-magnetic={ctaMagnetic ? '' : undefined}>
            Consultation
          </Link>
        ) : (
          <a href={cta.to} className={ctaClassName} data-magnetic={ctaMagnetic ? '' : undefined}>
            Consultation
          </a>
        )}

        <button
          className="nav__toggle"
          id="navToggle"
          type="button"
          aria-label={
            drawerOpen ? 'Close navigation menu' : 'Open navigation menu'
          }
          aria-controls="navDrawer"
          aria-expanded={String(drawerOpen)}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span className="nav__toggle-bar"></span>
          <span className="nav__toggle-bar"></span>
          <span className="nav__toggle-bar"></span>
        </button>
      </nav>

      {/* Mobile navigation drawer */}
      <div
        className={drawerOpen ? 'nav__drawer is-open' : 'nav__drawer'}
        id="navDrawer"
        ref={drawerRef}
        onClick={onDrawerClick}
      >
        {/* The drawer renders a submenu INLINE rather than behind a
            disclosure. A drawer is already a vertical list that owns the whole
            screen, so there is nothing to save by collapsing seven links
            behind a tap — and a tap that only reveals more taps is the thing
            people complain about on phones. */}
        {links.map((link) => (
          <Fragment key={link.label}>
            {renderLink(link, 'nav__drawer-link')}
            {link.children?.length > 0 && (
              <div className="nav__drawer-sub">
                {link.children.map((child) => renderLink(child, 'nav__drawer-sublink'))}
              </div>
            )}
          </Fragment>
        ))}
        {cta.internal ? (
          <Link to={cta.to} className={drawerCtaClassName}>
            Consultation
          </Link>
        ) : (
          <a href={cta.to} className={drawerCtaClassName}>
            Consultation
          </a>
        )}
      </div>
    </>
  )
}
