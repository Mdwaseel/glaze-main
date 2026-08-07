/**
 * Nav + footer link sets, transcribed from the static pages.
 *
 * The three pages ship the same nav markup with different hrefs: hero.html
 * uses bare anchors (#systems), about.html / contact.html point back at
 * hero.html#systems. Under the router both collapse to the same target, so
 * links are declared once here as a home-relative hash and resolved per
 * route by resolveHref().
 *
 * Difference to carry over when About is converted: its nav drops the
 * "Process" link, marks About with aria-current="page", and adds the
 * `sheen` / `data-magnetic` hooks to the CTA.
 */

/**
 * hero.html nav — desktop links and mobile drawer share this list.
 *
 * ⚠ DEVIATION FROM THE STATIC SITE: "Journal" is not in the original. It is
 * added here, and to every other variant below, because a blog nothing links
 * to is a blog nobody reads — the footer alone is not discovery.
 *
 * ⚠ THREE ITEMS WERE REMOVED FROM EVERY VARIANT BELOW (requested):
 *
 *   Projects     hidden for now. It never had a section to land on — the
 *                link pointed at `#projects`, an id nothing in the migration
 *                renders, so on Home it scrolled nowhere and from an inner
 *                page it landed on the homepage and stopped. Removing the
 *                link IS hiding the section; there is nothing else to hide.
 *   Performance  the §Engineering section still renders on Home, it is just
 *                no longer in the menu.
 *   Process      likewise — the section stays, the link goes.
 *
 * "Systems" now points at the dedicated /systems ROUTE rather than a hash on
 * Home, because the carousel moved off the homepage onto a page of its own
 * (pages/Systems). That also makes it the one nav item that means the same
 * thing from every page, so all four variants below use the same href.
 *
 * The bar is back to five items, which clears the 769–1024px squeeze the
 * seven-item row used to have.
 *
 * ⚠ "HOME" IS THE ONE ITEM THE STATIC SITE NEVER HAD (requested). Its
 * logo was the way back, which is the convention on a one-page hero site
 * and stops being obvious once About, Contact, Systems and the Journal are
 * real pages you can land on from search. It is written as `hero.html` —
 * the same legacy filename every other back-to-Home link uses — so
 * resolveHref() renders it as a router <Link> to '/' rather than a
 * document reload. On Home itself it is marked current; on the inner
 * pages RootLayout recomputes `current` per item, so it is not.
 */
export const NAV_LINKS = [
  { label: 'Home', href: 'hero.html', current: true },
  { label: 'Systems', href: '/systems' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
]

/**
 * about.html / contact.html nav — the same component with different
 * hrefs. It marks the current page, and its CTAs carry the `sheen` /
 * `data-magnetic` hooks (passed as Navbar props).
 */
export const NAV_LINKS_INNER = [
  { label: 'Home', href: 'hero.html' },
  { label: 'Systems', href: '/systems' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
]

/**
 * products/*.html nav — marks Systems as the current page, and its CTA is
 * the odd one out on the whole site: `#contact`, an anchor to the enquiry
 * section on the page itself, rather than contact.html.
 */
export const NAV_LINKS_SYSTEM = [
  { label: 'Home', href: 'hero.html' },
  { label: 'Systems', href: '/systems', current: true },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
]

/*
 * ⚠ FOOTER_SYSTEM_LINKS IS GONE. The system pages replace the footer's
 * "Explore" column with a "Systems" one listing every system — the only
 * footer difference across the whole site — and it used to be seven
 * hard-coded `products/*.html` hrefs here. It is built from the catalogue in
 * RootLayout now, so a system added in the admin panel appears in the column
 * without an edit here, and one that is unpublished leaves it.
 */

/**
 * Blog nav. NOT a migrated variant — there is no blog in the static site.
 *
 * It follows the inner-page set (About/Contact) rather than Home's, because
 * the blog is an inner page in the same sense: every section link has to point
 * back at hero.html rather than at an anchor on the current document. Journal
 * is added and marked current.
 */
export const NAV_LINKS_BLOG = [
  { label: 'Home', href: 'hero.html' },
  { label: 'Systems', href: '/systems' },
  { label: 'Journal', href: '/blog', current: true },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
]

/**
 * hero.html footer, "Explore" column.
 *
 * Same three removals as the nav — Projects, Performance and Process are
 * gone from every column below, and Systems points at the route.
 */
export const FOOTER_EXPLORE_LINKS = [
  { label: 'Systems', href: '/systems' },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: 'about.html' },
  { label: 'Contact', href: 'contact.html' },
]

/** about.html / contact.html footer, "Explore" column. */
export const FOOTER_EXPLORE_LINKS_INNER = FOOTER_EXPLORE_LINKS

/** Blog footer, "Explore" column. */
export const FOOTER_EXPLORE_LINKS_BLOG = FOOTER_EXPLORE_LINKS

/**
 * The Reach Us column, hard-coded as the static site shipped it.
 *
 * These are now the FALLBACK rather than the source of truth: the Footer
 * prefers whatever Site Settings returns, so changing the phone number in the
 * admin panel changes it here without a redeploy. This list is what renders
 * when the API is unreachable — see SiteSettingsContext for why an offline
 * backend must show stale contact details rather than none.
 */
export const FOOTER_REACH_LINKS = [
  {
    label: 'info@glazewindowsystems.com',
    href: 'mailto:info@glazewindowsystems.com',
  },
  { label: '+91 76750 23939', href: 'tel:+917675023939' },
  {
    label: 'Jubilee Hills, Hyderabad',
    href: 'https://www.google.com/maps/search/?api=1&query=Glaze%20Windows%20System%2C%204th%20Floor%2C%20Road%20No.%205%2C%20Jubilee%20Hills%20Metro%20Station%2C%20Jubilee%20Hills%2C%20Hyderabad%2C%20Telangana%20500033',
    external: true,
  },
]

export const FOOTER_FOLLOW_LINKS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/glaze_window_systems/',
    external: true,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/Glazewindowsystems',
    external: true,
  },
  {
    label: 'LinkedIn',
    href: 'https://in.linkedin.com/company/glaze-window-systems',
    external: true,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@GlazeWindowSystems',
    external: true,
  },
]

/** Shared logo asset — served from public/, same filename as the original. */
export const LOGO_SRC = '/Glaze%20Logo%20Transparent.png'
