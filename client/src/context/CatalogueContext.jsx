import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { catalogueApi } from '@/services/catalogue'
import { assetUrl } from '@/services/api'
import {
  SYSTEMS,
  SYSTEM_CARD_MEDIA,
  SYSTEM_CAROUSEL_ORDER,
  SYSTEM_ENQUIRY_NOTES,
  SYSTEM_TEASERS,
} from '@/data/systems'
import { variantsFor as staticVariantsFor } from '@/data/variants'

/**
 * The product catalogue — seven systems and the variants each is built in —
 * fetched once and shared.
 *
 * WHY IT IS A CONTEXT AND NOT AN IMPORT ANY MORE. Until the admin panel could
 * edit them, the systems and variants were modules compiled into the bundle:
 * `import { SYSTEMS } from '@/data/systems'`. Adding a variant meant a
 * developer, a build and a deploy. It now comes from /api/v1/catalogue/, so a
 * variant added in the panel appears on the system page, in its rail, and in
 * BOTH enquiry forms with nothing rebuilt — which is the whole point of the
 * change: nothing anywhere enumerates variants by hand.
 *
 * ⚠ THE STATIC MODULES ARE THE FALLBACK, and this is the same decision
 * SiteSettingsContext makes for the phone number, for the same reason. If the
 * API is unreachable — a static deploy with no Django, a cold backend, a
 * network blip — the site shows the catalogue it shipped with rather than an
 * empty carousel and a contact form with no systems to choose from. A window
 * company whose site lists no windows is worse than one listing a slightly
 * stale set.
 *
 * ⚠ THE FALLBACK IS ALSO THE FIRST PAINT, deliberately. State starts at the
 * static catalogue rather than at null or a spinner, so the carousel and the
 * system pages render complete on the first frame and the fetch, when it
 * lands, swaps values into an already-correct page. Gating the tree on the
 * request would put a network round-trip in front of every first paint on the
 * site to change, in the ordinary case, nothing.
 *
 * That swap is why `signature` exists. Several sections here are imperative
 * ports that capture their DOM nodes when they run — the carousel's spring
 * integrator, the variants' scroll controller. If the live catalogue differs
 * from the shipped one, those controllers must be rebuilt against the new
 * nodes rather than left bound to the old ones, and `signature` is the value
 * they can put in a dependency array to make that happen. It changes only
 * when the SET changes (slugs and variant keys), not on every render.
 */

/* ── Normalising ───────────────────────────────────────────────────── */

/**
 * API payload → the shape the sections already read.
 *
 * The section components were written against data/systems.js, and that shape
 * is fine; there was no reason to churn a dozen of them to match a serialiser.
 * So the API's flat, snake_case fields are mapped back to the nested,
 * camelCase ones here, in one place.
 */
function fromApi(system) {
  const overview = system.overview || {}
  const hero = system.hero || {}
  const card = system.card || {}
  const teaser = system.teaser || {}

  return {
    slug: system.slug,
    name: system.name,
    title: system.page_title || `${system.name} Systems — Glaze Window Systems`,
    description: system.meta_description || '',
    schema: {
      name: system.schema_name || system.name,
      category: system.schema_category || '',
      description: system.schema_description || '',
    },
    hero: {
      video: assetUrl(hero.video),
      image: assetUrl(hero.image),
      title: hero.title || '',
      accent: hero.accent || '',
      lede: hero.lede || '',
    },
    overview: {
      title: { lead: overview.title_lead || '', em: overview.title_em || '' },
      chips: overview.chips || [],
      body: overview.body || [],
      stats: overview.stats || [],
      strengths: overview.strengths || [],
    },
    seriesNote: system.series_note || '',
    fits: system.fits || [],
    /* `order` is the SERIES grid order — the name data/systems.js gave it and
       the one seriesFor() reads. The system's own position in the collection
       is the API's `order` integer, which is expressed here by the position
       of this record in the list and is not carried on the record. */
    order: system.series_order || [],
    card: {
      video: assetUrl(card.video),
      poster: assetUrl(card.poster),
      image: assetUrl(card.image),
    },
    teaser: {
      lead: teaser.lead || '',
      em: teaser.em || '',
      desc: teaser.desc || '',
      specs: teaser.specs || [],
      cta: teaser.cta || `Explore ${system.name}`,
    },
    enquiryNote: system.enquiry_note || '',
    variants: (system.variants || []).map((variant, index) => decorateVariant({
      id: variant.key,
      name: variant.name,
      kind: variant.kind,
      lede: variant.lede,
      specs: variant.specs || [],
      video: assetUrl(variant.video),
      poster: assetUrl(variant.poster),
    }, index)),
  }
}

/** The two derived fields the rail renders: its position and its number. */
function decorateVariant(variant, index) {
  return { ...variant, index, num: String(index + 1).padStart(2, '0') }
}

/** The shipped modules, in the same shape. */
function fromStatic() {
  return SYSTEM_CAROUSEL_ORDER.filter((slug) => SYSTEMS[slug]).map((slug) => {
    const system = SYSTEMS[slug]
    const card = SYSTEM_CARD_MEDIA[slug] || {}
    const teaser = SYSTEM_TEASERS[slug] || {}

    return {
      ...system,
      hero: { video: '', image: '', ...system.hero },
      card: { video: card.video || '', poster: card.poster || '', image: card.image || '' },
      teaser: {
        lead: teaser.lead || '',
        em: teaser.em || '',
        desc: teaser.desc || '',
        specs: teaser.specs || [],
        cta: teaser.cta || `Explore ${system.name}`,
      },
      enquiryNote: SYSTEM_ENQUIRY_NOTES[slug] || '',
      // Already carries index and num — variantsFor() adds them.
      variants: staticVariantsFor(slug),
    }
  })
}

/** Changes only when the SET changes — see the note in the header. */
function signatureOf(systems) {
  return systems
    .map((s) => `${s.slug}:${s.variants.map((v) => v.id).join(',')}`)
    .join('|')
}

function build(systems) {
  const bySlug = Object.fromEntries(systems.map((s) => [s.slug, s]))
  return { systems, bySlug, signature: signatureOf(systems) }
}

const FALLBACK = build(fromStatic())

const CatalogueContext = createContext({ ...FALLBACK, loaded: false, live: false })

export function CatalogueProvider({ children }) {
  const [catalogue, setCatalogue] = useState(FALLBACK)
  const [loaded, setLoaded] = useState(false)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    catalogueApi
      .get(controller.signal)
      .then((data) => {
        const systems = (data?.systems || []).map(fromApi)
        // An empty catalogue is not an answer. A backend that is up but has
        // never been seeded would otherwise blank the collection everywhere —
        // keep the shipped one until there is something to replace it with.
        if (!systems.length) return
        setCatalogue(build(systems))
        setLive(true)
      })
      .catch(() => {
        // Expected whenever the backend is not running. Not an error worth
        // showing anyone — the shipped catalogue is already on screen.
      })
      .finally(() => setLoaded(true))

    return () => controller.abort()
  }, [])

  const value = useMemo(() => ({ ...catalogue, loaded, live }), [catalogue, loaded, live])

  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>
}

export function useCatalogue() {
  return useContext(CatalogueContext)
}

/** One system, or undefined. */
export function useSystem(slug) {
  return useCatalogue().bySlug[slug]
}

/**
 * The cross-links at the foot of a system page: every OTHER system, in
 * catalogue order. Was `otherSystems()` in data/systems.js.
 */
export function useOtherSystems(slug) {
  const { systems } = useCatalogue()
  return useMemo(() => systems.filter((s) => s.slug !== slug), [systems, slug])
}

export { FALLBACK as CATALOGUE_FALLBACK }
