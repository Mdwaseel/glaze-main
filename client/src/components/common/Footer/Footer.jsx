import { Link, useLocation } from 'react-router-dom'
import {
  FOOTER_EXPLORE_LINKS,
  FOOTER_REACH_LINKS,
  FOOTER_FOLLOW_LINKS,
  LOGO_SRC,
} from '@/constants/navigation'
import { resolveHref } from '@/utils/links'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import './footer.css'

/**
 * Footer — port of <footer class="footer"> in hero.html (lines 6060-6103).
 *
 * Markup, class names, column order, copy and spacing are unchanged.
 * The only animation is the CSS underline-wipe on hover
 * (.footer__col a::after, transform 0.45s var(--ease-snap)) — no JS ran
 * against the footer on any of the static pages, so none is added.
 *
 * `exploreLinks` exists because the static pages differ in exactly one
 * place: hero.html's Explore column points at its own section anchors,
 * about.html / contact.html point back at hero.html#… . Everything else
 * is byte-identical across those three pages.
 *
 * `firstColumnTitle` / `firstColumnLabel` landed with the Products system
 * pages, which are the one exception to that: their first column is
 * titled "Systems" and lists all six system pages instead of "Explore".
 * The rest of their footer — brand, Reach Us, Follow, base line — is the
 * same markup as everywhere else.
 *
 * The Reach Us and Follow columns are now driven by Site Settings rather
 * than by the constants, so an admin can change the phone number, email,
 * address or a social profile in the panel and every page follows without
 * a redeploy. Markup, class names, column order and copy are unchanged —
 * only where the values come from. When the API is unreachable the
 * hard-coded lists render instead, so an offline backend degrades to a
 * possibly-stale footer rather than an empty one.
 */
export default function Footer({
  exploreLinks = FOOTER_EXPLORE_LINKS,
  firstColumnTitle = 'Explore',
  firstColumnLabel = 'Site',
}) {
  const { pathname } = useLocation()
  const { settings, live } = useSiteSettings()

  // `live` distinguishes "the API answered" from "we are still on the
  // fallback". Without it a partially-populated response would produce a
  // column with gaps in it.
  const reachLinks = live
    ? [
        { label: settings.contact_email, href: `mailto:${settings.contact_email}` },
        { label: settings.contact_phone, href: `tel:${settings.contact_phone.replace(/[^\d+]/g, '')}` },
        ...(settings.contact_phone_secondary
          ? [{
              label: settings.contact_phone_secondary,
              href: `tel:${settings.contact_phone_secondary.replace(/[^\d+]/g, '')}`,
            }]
          : []),
        ...(settings.whatsapp_enabled && settings.whatsapp_link
          ? [{ label: settings.whatsapp_label, href: settings.whatsapp_link, external: true }]
          : []),
        // First line only — the footer column is a single line per entry,
        // and the full multi-line address belongs on the contact page.
        {
          label: settings.address.split('\n')[0],
          href: settings.map_url,
          external: true,
        },
      ].filter((link) => link.label)
    : FOOTER_REACH_LINKS

  const followLinks = live
    ? [
        { label: 'Instagram', href: settings.instagram_url, external: true },
        { label: 'Facebook', href: settings.facebook_url, external: true },
        { label: 'LinkedIn', href: settings.linkedin_url, external: true },
        { label: 'YouTube', href: settings.youtube_url, external: true },
      ].filter((link) => link.href)
    : FOOTER_FOLLOW_LINKS

  const renderLink = (link) => {
    const { to, internal } = resolveHref(link.href, pathname)
    if (internal) {
      return (
        <Link key={link.label} to={to}>
          {link.label}
        </Link>
      )
    }
    return (
      <a
        key={link.label}
        href={to}
        {...(link.external ? { target: '_blank', rel: 'noopener' } : {})}
      >
        {link.label}
      </a>
    )
  }

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__top">

          <div className="footer__brand">
            <img src={LOGO_SRC} alt="Glaze" />
            <p className="footer__tag">{live ? settings.tagline : 'Designed to Disappear.'}</p>
          </div>

          <div className="footer__cols">
            <nav className="footer__col" aria-label={firstColumnLabel}>
              <p className="footer__col-title">{firstColumnTitle}</p>
              {exploreLinks.map(renderLink)}
            </nav>

            <div className="footer__col">
              <p className="footer__col-title">Reach Us</p>
              {reachLinks.map(renderLink)}
            </div>

            <div className="footer__col">
              <p className="footer__col-title">Follow</p>
              {followLinks.map(renderLink)}
            </div>
          </div>

        </div>

        <div className="footer__base">
          {/* "— A Sagar Asia Company" removed at the client's request:
              Glaze stands on its own. */}
          <span>&copy; 2026 Glaze Window Systems</span>
          <span>Aluminium Since 1989</span>
        </div>
      </div>
    </footer>
  )
}
