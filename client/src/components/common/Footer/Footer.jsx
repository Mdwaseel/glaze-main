import { Link, useLocation } from 'react-router-dom'
import {
  FOOTER_EXPLORE_LINKS,
  FOOTER_REACH_LINKS,
  FOOTER_FOLLOW_LINKS,
  LOGO_SRC,
} from '@/constants/navigation'
import { resolveHref } from '@/utils/links'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { LEGAL_LINKS } from '@/data/legal'
import './footer.css'

/**
 * Footer.
 *
 * ⚠ THIS IS NO LONGER hero.html's FOOTER, and the brief is why. The
 * original was a logo, one italic line, three columns of plain links and
 * a base rule — which on a 1440px screen left the entire left half of the
 * band empty, the columns crowded against the right edge, and nothing to
 * do at the bottom of a page that is 16,000px tall. It read as the end of
 * the file rather than the end of the site.
 *
 * What was added, and why each earns its place:
 *
 *   CLOSING CTA   The site's whole purpose is an enquiry, and the footer
 *                 was the one full-width surface not asking for one. It
 *                 is the same target as the nav CTA (contact#enquiry) with
 *                 the phone number beside it, because a builder reading at
 *                 11pm calls and one reading at 11am fills the form.
 *   DESCRIPTION   The brand column now says what Glaze makes. A logo and
 *                 a three-word tagline tell a first-time visitor who has
 *                 scrolled past everything nothing they can act on.
 *   VISIT BLOCK   The address used to be `address.split('\n')[0]` — one
 *                 truncated line ending in a comma ("…, Road No. 5,"),
 *                 which is worse than no address. It is now the whole
 *                 thing, with the opening hours that were already in Site
 *                 Settings and had nowhere to appear.
 *   SOCIAL ICONS  The "Follow" column was four words in a stack. Same four
 *                 links as outline glyphs, which is a row rather than a
 *                 column and reads as a brand rather than a list.
 *
 * ⚠ NOTHING HERE IS INVENTED. Every value comes from Site Settings (with
 * the shipped fallback behind it) or from constants/navigation.js. The
 * description is the site's own copy — Home's meta description and the
 * hero subtitle — rather than new marketing claims, and no link points at
 * a route that does not exist.
 *
 * The `exploreLinks` / `firstColumnTitle` / `firstColumnLabel` API is
 * unchanged: the system pages still swap the first column for their own
 * catalogue-driven "Systems" list, which RootLayout builds.
 *
 * Motion stays CSS-only, as it always was — hover wipes and a fade, no
 * JS and no GSAP, all of it disabled under prefers-reduced-motion.
 */

/**
 * The company, in the words the rest of the site already uses.
 *
 * Assembled from Home's meta description (pages/Home) and the hero
 * subtitle, so the footer cannot drift from what the site claims
 * elsewhere. If the systems list changes, this sentence is the second
 * place to update — the first is the meta description it came from.
 */
const BRAND_BLURB =
  'Architectural aluminium window and door systems — sliding, casement, ' +
  'tilt & turn, lift & slide, bi-fold, pivot and fixed. Designed and ' +
  'installed from Hyderabad for light, silence and a view that stays unbroken.'

/**
 * Outline glyphs for the social row, inline rather than from a package.
 *
 * The icon database recommends Phosphor here; a dependency for four
 * glyphs is the wrong trade in a bundle this size, and every other icon
 * on this site (TrustSection, ProcessSection, LabSection) is already an
 * inline 24-unit stroke path. These match that set.
 *
 * Keyed by the link label lower-cased, so a social profile added in the
 * admin panel under a name with no glyph still renders — `fallback` is a
 * generic outbound link rather than a gap in the row.
 */
const SOCIAL_GLYPHS = {
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  youtube: (
    <>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </>
  ),
  fallback: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
}

export default function Footer({
  exploreLinks = FOOTER_EXPLORE_LINKS,
  firstColumnTitle = 'Explore',
  firstColumnLabel = 'Site',
}) {
  const { pathname } = useLocation()
  const { settings, live } = useSiteSettings()

  /* `live` distinguishes "the API answered" from "we are still on the
     fallback". Without it a partially-populated response would produce a
     column with gaps in it.

     ⚠ THE ADDRESS IS NO LONGER IN THIS LIST. It was the third entry,
     truncated to its first line, and it now has a block of its own below
     — see the Visit column. */
  const contactLinks = live
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
      ].filter((link) => link.label)
    : FOOTER_REACH_LINKS.filter((link) => !link.external)

  const followLinks = live
    ? [
        { label: 'Instagram', href: settings.instagram_url, external: true },
        { label: 'Facebook', href: settings.facebook_url, external: true },
        { label: 'LinkedIn', href: settings.linkedin_url, external: true },
        { label: 'YouTube', href: settings.youtube_url, external: true },
      ].filter((link) => link.href)
    : FOOTER_FOLLOW_LINKS

  // The full address, every line of it. Settings holds it as one string
  // with newlines; the fallback is a single line, which renders the same.
  const addressLines = (settings.address || '').split('\n').map((l) => l.trim()).filter(Boolean)

  // The primary phone, for the CTA's "or call" — the first tel: in the
  // column, so it follows Site Settings without a second source of truth.
  const phoneLink = contactLinks.find((link) => String(link.href).startsWith('tel:'))

  const enquiry = resolveHref('contact.html#enquiry', pathname)

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
      {/* Oversized wordmark bled off the left edge, the same device the
          Architectural Freedom section uses for its ghost word. Clipped by
          .footer's own overflow, aria-hidden, and gone under 900px where
          there is no room for it to be anything but noise. */}
      <span className="footer__ghost" aria-hidden="true">glazé</span>

      <div className="footer__inner">

        {/* ── Closing CTA ─────────────────────────────────────────── */}
        <div className="footer__cta">
          <div className="footer__cta-copy">
            <p className="footer__cta-line">
              Let&rsquo;s design something that <em>disappears.</em>
            </p>
          </div>

          <div className="footer__cta-actions">
            {enquiry.internal ? (
              <Link className="footer__cta-btn" to={enquiry.to}>
                Discuss your project<span className="footer__cta-arrow" aria-hidden="true">&rarr;</span>
              </Link>
            ) : (
              <a className="footer__cta-btn" href={enquiry.to}>
                Discuss your project<span className="footer__cta-arrow" aria-hidden="true">&rarr;</span>
              </a>
            )}
            {phoneLink && (
              <a className="footer__cta-alt" href={phoneLink.href}>
                or call {phoneLink.label}
              </a>
            )}
          </div>
        </div>

        {/* ── Brand + columns ─────────────────────────────────────── */}
        <div className="footer__top">

          <div className="footer__brand">
            <img src={LOGO_SRC} alt="Glaze" />
            <p className="footer__tag">{live ? settings.tagline : 'Designed to Disappear.'}</p>
            <p className="footer__blurb">{BRAND_BLURB}</p>

            {followLinks.length > 0 && (
              <div className="footer__social">
                <p className="footer__col-title">Follow</p>
                <ul className="footer__social-row">
                  {followLinks.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener"
                        aria-label={`Glaze on ${link.label}`}
                        title={link.label}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          {SOCIAL_GLYPHS[link.label.toLowerCase()] || SOCIAL_GLYPHS.fallback}
                        </svg>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="footer__cols">
            <nav className="footer__col" aria-label={firstColumnLabel}>
              <p className="footer__col-title">{firstColumnTitle}</p>
              {exploreLinks.map(renderLink)}
            </nav>

            <div className="footer__col">
              <p className="footer__col-title">Reach Us</p>
              {contactLinks.map(renderLink)}
            </div>

            <div className="footer__col footer__col--visit">
              <p className="footer__col-title">Visit</p>
              {addressLines.length > 0 && (
                <a
                  className="footer__address"
                  href={settings.map_url}
                  target="_blank"
                  rel="noopener"
                >
                  {addressLines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </a>
              )}
              {settings.business_hours && (
                <p className="footer__hours">{settings.business_hours}</p>
              )}
            </div>
          </div>

        </div>

        <div className="footer__base">
          {/* "— A Sagar Asia Company" removed at the client's request:
              Glaze stands on its own. The year is read at render rather
              than written into the markup — the old one said 2026 in a
              file that would still say 2026 in 2027. */}
          <span>&copy; {new Date().getFullYear()} Glaze Window Systems</span>
          <span>Aluminium Since 1989</span>

          {/* ⚠ THE POLICY LINKS BELONG HERE AND NOWHERE ELSE. The footer's
              base rule is the one strip that appears on every page of the
              site, which is exactly the requirement: a privacy policy linked
              only from the contact page is not "linked from the site" as far
              as an ad platform's review or a crawler's trust signals are
              concerned, and a visitor looking for it looks at the bottom.

              They are NOT in the Explore column above. That column is the
              site's own navigation, and putting "Cookie Policy" beside
              "Systems" gives a legal notice the weight of a product page.

              ⚠ AFTER both <span>s, not between them: the hairline separator
              is a `span + span::before` rule, and a <nav> in the middle stops
              it matching. */}
          <nav className="footer__legal" aria-label="Policies">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} to={link.href}>{link.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
