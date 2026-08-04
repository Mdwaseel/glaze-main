import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSiteSettings } from '@/context/SiteSettingsContext'

/**
 * Meta Pixel, GA4, GTM and the search-engine verification tags — all of them
 * configured in the admin panel and none of them in the bundle.
 *
 * WHY IT IS RUNTIME AND NOT BUILD-TIME. A pixel id baked in with a
 * `VITE_META_PIXEL_ID` would mean a rebuild and a deploy every time marketing
 * opens a new ad account, and it would mean the id lives in the repository
 * rather than in the one place someone thinks to look for it. Site Settings
 * serves them; a blank field injects nothing at all rather than an empty tag.
 *
 * ⚠ NOT MOUNTED UNDER /admin. Staff working in the panel are not an audience,
 * and counting them would corrupt the same conversion numbers those staff are
 * about to read — the built-in analytics already skips /admin for exactly
 * this reason.
 *
 * ⚠ THE PIXEL SETS COOKIES AND SENDS DATA TO META. Everything else on this
 * site is first-party and cookie-free by design (see the analytics section of
 * the README: no cookie, no IP stored, a key that rotates at midnight).
 * Turning the pixel on changes that — it is third-party tracking, and in the
 * EU/UK it needs consent before it fires. There is no consent banner on this
 * site yet, so the field should stay blank until either the audience is
 * outside those jurisdictions or a banner is in place. That is a decision for
 * whoever owns the site, which is why this is a setting rather than something
 * hard-coded on.
 *
 * ⚠ GTM AND THE INDIVIDUAL TAGS ARE MUTUALLY EXCLUSIVE IN PRACTICE. If GTM is
 * configured it usually carries GA4 and the pixel itself; running both means
 * every pageview and every conversion counted twice. The panel says so next
 * to the field, and nothing here can enforce it — only the person filling it
 * in knows what their container holds.
 */

/** Marks the nodes this component owns, so it can take them away again. */
const OWNED = 'data-tracking'

function injectScript(content, src) {
  const script = document.createElement('script')
  script.setAttribute(OWNED, '')
  script.async = true
  if (src) script.src = src
  else script.textContent = content
  document.head.appendChild(script)
  return script
}

function injectMeta(name, content) {
  if (!content) return
  const meta = document.createElement('meta')
  meta.setAttribute('name', name)
  meta.setAttribute('content', content)
  meta.setAttribute(OWNED, '')
  document.head.appendChild(meta)
}

export default function Tracking() {
  const { settings } = useSiteSettings()
  const { pathname } = useLocation()

  const {
    ga_measurement_id: ga,
    gtm_container_id: gtm,
    meta_pixel_id: pixel,
    google_site_verification: google,
    bing_site_verification: bing,
    facebook_domain_verification: facebook,
  } = settings

  const isAdmin = pathname.startsWith('/admin')

  // ── Install ────────────────────────────────────────────────────────
  // Re-runs only when an ID changes, NOT on navigation: re-injecting the
  // pixel's loader on every route change would re-initialise it and count
  // the same visitor as a new one on every click.
  useEffect(() => {
    if (isAdmin) return undefined

    injectMeta('google-site-verification', google)
    injectMeta('msvalidate.01', bing)
    injectMeta('facebook-domain-verification', facebook)

    if (gtm) {
      injectScript(
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
        `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
        `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);` +
        `})(window,document,'script','dataLayer','${gtm}');`,
      )
    }

    if (ga) {
      injectScript(null, `https://www.googletagmanager.com/gtag/js?id=${ga}`)
      injectScript(
        'window.dataLayer = window.dataLayer || [];' +
        'function gtag(){dataLayer.push(arguments);}' +
        'window.gtag = gtag;' +
        "gtag('js', new Date());" +
        // send_page_view is off because this is an SPA: the library's own
        // pageview fires once, on load, and every route change after that
        // would go uncounted. The effect below sends them instead.
        `gtag('config', '${ga}', { send_page_view: false });`,
      )
    }

    if (pixel) {
      injectScript(
        '!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?' +
        'n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;' +
        "n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;" +
        't.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,' +
        "document,'script','https://connect.facebook.net/en_US/fbevents.js');" +
        `fbq('init', '${pixel}');`,
      )
    }

    return () => {
      document.head.querySelectorAll(`[${OWNED}]`).forEach((node) => node.remove())
    }
  }, [ga, gtm, pixel, google, bing, facebook, isAdmin])

  // ── Pageviews ──────────────────────────────────────────────────────
  // A single-page app changes the URL without loading a document, so nothing
  // fires a pageview on its own. Both platforms get one per route.
  useEffect(() => {
    if (isAdmin) return
    if (ga && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
    if (pixel && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
  }, [pathname, ga, pixel, isAdmin])

  return null
}

/**
 * Report an enquiry to whatever is listening.
 *
 * Called from the two enquiry forms once the API has accepted the submission
 * — not when the button is clicked. A conversion counted on click counts the
 * failures too, and an ad platform optimising toward a number that includes
 * failed submissions will happily buy more of them.
 *
 * Safe to call when nothing is configured: every branch checks first, so this
 * is a no-op on a site with no pixel and no GA.
 */
export function trackEnquiry(detail = {}) {
  if (typeof window === 'undefined') return

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', {
      content_name: detail.system || 'General enquiry',
      content_category: detail.category || 'contact',
    })
  }
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      system: detail.system || '',
      variant: detail.variant || '',
      source: detail.category || 'contact',
    })
  }
  // GTM gets the raw event so a container can build its own tags on it
  // without either of the above being configured directly.
  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: 'enquiry_submitted', ...detail })
  }
}
