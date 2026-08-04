/**
 * Builds the catalogue seed from the site's own data modules.
 *
 *   node scripts/export-catalogue.mjs
 *
 * Writes server/glaze/catalogue/seed/catalogue.json, which
 * `manage.py seed_catalogue` then upserts into Postgres.
 *
 * WHY A GENERATOR rather than a fixture typed out by hand: the seven systems
 * and their thirty-one variants already exist, fully written, in
 * src/data/systems.js and src/data/variants.js — 1,000 lines of transcribed
 * copy, tested figures and clip paths. Re-typing that into a Python fixture
 * would be a thousand chances to introduce a typo into a U-value, and the two
 * copies would drift the first time either was edited.
 *
 * The same reasoning, and the same shape, as scripts/export-knowledge.mjs.
 *
 * THIS IS A ONE-WAY DOOR, and deliberately. Once the seed has run, the
 * DATABASE is the catalogue: it is what the admin panel edits and what the
 * site reads. Re-running this script would overwrite an editor's work with
 * whatever the JS modules said in the last build — so `seed_catalogue`
 * defaults to creating only what is missing and needs --force to touch a row
 * that already exists. Run it again after adding a system to the JS modules,
 * or never again, which is the ordinary case.
 *
 * The JS modules stay in the bundle regardless: they are the client's offline
 * fallback (see context/CatalogueContext.jsx), for the same reason
 * constants/navigation.js is still the footer's fallback.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SYSTEMS,
  SYSTEM_CARD_MEDIA,
  SYSTEM_CAROUSEL_ORDER,
  SYSTEM_ENQUIRY_NOTES,
  SYSTEM_TEASERS,
} from '../src/data/systems.js'
import { variantsFor } from '../src/data/variants.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../../server/glaze/catalogue/seed/catalogue.json')

const systems = SYSTEM_CAROUSEL_ORDER.map((slug, index) => {
  const system = SYSTEMS[slug]
  if (!system) throw new Error(`SYSTEM_CAROUSEL_ORDER names "${slug}", which SYSTEMS has no entry for.`)

  const card = SYSTEM_CARD_MEDIA[slug] || {}
  const teaser = SYSTEM_TEASERS[slug] || {}

  return {
    slug,
    name: system.name,
    /* ONE order for all of it. The site shipped with two — the carousel's
       and the footer column's — which the model does not reproduce; see
       SYSTEM_CAROUSEL_ORDER in data/systems.js. */
    order: index,
    is_published: true,

    page_title: system.title,
    meta_description: system.description,
    schema_name: system.schema.name,
    schema_category: system.schema.category,
    schema_description: system.schema.description,

    hero_video: system.hero.video || '',
    hero_image: system.hero.image || '',
    hero_title: system.hero.title,
    hero_accent: system.hero.accent,
    hero_lede: system.hero.lede,

    overview_title_lead: system.overview.title.lead,
    overview_title_em: system.overview.title.em,
    chips: system.overview.chips,
    overview_body: system.overview.body,
    stats: system.overview.stats,
    strengths: system.overview.strengths,

    series_note: system.seriesNote,
    fits: system.fits,
    series_order: system.order,

    card_video: card.video || '',
    card_poster: card.poster || '',
    card_image: card.image || '',

    teaser_lead: teaser.lead || '',
    teaser_em: teaser.em || '',
    teaser_desc: teaser.desc || '',
    teaser_specs: teaser.specs || [],
    teaser_cta: teaser.cta || '',

    enquiry_note: SYSTEM_ENQUIRY_NOTES[slug] || '',

    /* variantsFor() resolves the clip and still paths from the slug and the
       variant id, so the seed carries the same paths the pages render
       today — no filename is re-derived on the Python side. */
    variants: variantsFor(slug).map((variant, order) => ({
      key: variant.id,
      name: variant.name,
      kind: variant.kind,
      lede: variant.lede,
      specs: variant.specs,
      video: variant.video,
      poster: variant.poster,
      order,
      is_published: true,
    })),
  }
})

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({ systems }, null, 2)}\n`, 'utf8')

const variantCount = systems.reduce((total, s) => total + s.variants.length, 0)
console.log(`Wrote ${systems.length} systems and ${variantCount} variants to ${OUT}`)
