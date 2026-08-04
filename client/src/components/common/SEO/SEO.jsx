import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FORCE_NOINDEX, SITE_ORIGIN, absoluteUrl } from './siteOrigin'

/**
 * Per-page <head>: title, description, canonical, robots, Open Graph, X card
 * and JSON-LD.
 *
 * ⚠ WHAT THIS CAN AND CANNOT DO, because it decides how much to trust it.
 *
 * Googlebot renders JavaScript, so everything written here is what Google
 * indexes — titles, descriptions, canonicals and per-page schema all work.
 *
 * SOCIAL SCRAPERS DO NOT RENDER JAVASCRIPT. Facebook, WhatsApp, LinkedIn and
 * X fetch the HTML and read it as served, so a link to /products/casement
 * shared into WhatsApp shows index.html's tags — the homepage's — no matter
 * what this component writes afterwards. That is a property of client-side
 * rendering. The honest fixes are server-side rendering or a prerender layer
 * in front of the static build; both are real work and neither is in place,
 * so index.html carries values that are defensible for any URL on the site.
 * The README says the same thing where someone will find it.
 *
 * ⚠ IT CLEANS UP AFTER ITSELF. An SPA has one <head> that outlives every
 * route, so a tag added on a system page and not removed would still be there
 * on the contact page, describing the wrong thing. Every tag this writes is
 * marked `data-seo` and every one is removed on unmount — which also means it
 * must never touch a tag index.html ships, because it would take it away and
 * never put it back. Hence: it writes its own elements, always, even when the
 * name collides with a static one, and the static one is REMOVED first only
 * for the handful of head tags where two copies are actively wrong (title,
 * canonical, robots, and the og:/twitter: pairs).
 */

/** Marks every element this component owns, so cleanup is exact. */
const OWNED = 'data-seo'

/**
 * The static tags that must not coexist with a per-page one.
 *
 * Two <link rel="canonical"> is not "two hints", it is a page telling a
 * crawler two different things about itself; Google resolves it by ignoring
 * both. Same for robots and for each og: property. Duplicates are hidden
 * rather than deleted, so the served HTML is restored when the route changes.
 */
const EXCLUSIVE = [
  'title',
  'link[rel="canonical"]',
  'meta[name="description"]',
  'meta[name="robots"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
]

function setMeta(attribute, key, content) {
  if (!content) return
  const element = document.createElement('meta')
  element.setAttribute(attribute, key)
  element.setAttribute('content', String(content))
  element.setAttribute(OWNED, '')
  document.head.appendChild(element)
}

/**
 * @param {object}   props
 * @param {string}   props.title        the full <title>, already suffixed
 * @param {string}   props.description  150-160 characters, benefit-led
 * @param {string}   props.path         canonical path, defaults to the route
 * @param {string}   props.image        absolute or root-relative og:image
 * @param {string}   props.type         og:type — website | article
 * @param {boolean}  props.noindex      thank-you, 404, filtered views
 * @param {object[]} props.schema       JSON-LD nodes for this page
 */
export default function SEO({
  title,
  description,
  path,
  image = '/og-default.jpg',
  type = 'website',
  noindex = false,
  schema,
}) {
  const { pathname } = useLocation()
  const canonicalPath = path ?? pathname
  // Serialised so the effect re-runs when the CONTENT of the schema changes
  // rather than on every render — an array literal is a new identity each
  // time, and rewriting the whole head on every keystroke elsewhere in the
  // page would be a lot of DOM churn for no change.
  const schemaKey = schema ? JSON.stringify(schema) : ''

  useEffect(() => {
    const hidden = []
    EXCLUSIVE.forEach((selector) => {
      document.head.querySelectorAll(`${selector}:not([${OWNED}])`).forEach((element) => {
        // `title` cannot be "hidden" — it is read from the element's text — so
        // it is handled below by assignment, and only the meta/link tags are
        // detached and put back on cleanup.
        if (element.tagName === 'TITLE') return
        element.remove()
        hidden.push(element)
      })
    })

    const previousTitle = document.title
    if (title) document.title = title

    const canonical = absoluteUrl(canonicalPath)

    setMeta('name', 'description', description)
    // FORCE_NOINDEX is the staging kill switch — env-driven, so "the staging
    // site is still indexable" cannot happen by forgetting a step.
    setMeta(
      'name', 'robots',
      FORCE_NOINDEX
        ? 'noindex, nofollow'
        : noindex
          ? 'noindex, follow'
          : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    )

    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = canonical
    link.setAttribute(OWNED, '')
    document.head.appendChild(link)

    const ogImage = absoluteUrl(image)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:site_name', 'Glaze Window Systems')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:image', ogImage)
    setMeta('property', 'og:image:width', '1200')
    setMeta('property', 'og:image:height', '630')
    setMeta('property', 'og:locale', 'en_IN')

    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', ogImage)

    let script = null
    if (schemaKey) {
      script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute(OWNED, '')
      // textContent, never innerHTML: a system name with an apostrophe or a
      // stray `<` in an article title would otherwise be parsed as markup and
      // silently break the whole JSON block. This is the escaping mistake the
      // checklist calls out, in its JavaScript form.
      script.textContent = schemaKey
      document.head.appendChild(script)
    }

    return () => {
      document.head.querySelectorAll(`[${OWNED}]`).forEach((element) => element.remove())
      hidden.forEach((element) => document.head.appendChild(element))
      document.title = previousTitle
    }
  }, [title, description, canonicalPath, image, type, noindex, schemaKey])

  return null
}

export { SITE_ORIGIN, absoluteUrl }
