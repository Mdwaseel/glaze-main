/**
 * Builds the chatbot's knowledge corpus from the site's own data.
 *
 *   node scripts/export-knowledge.mjs
 *
 * Writes server/glaze/chatbot/knowledge/site-content.json, which
 * `manage.py build_knowledge` then ingests into Postgres.
 *
 * WHY THIS EXISTS AS A GENERATOR rather than a hand-written corpus:
 * the brief is that the assistant answers from "the data which is there in
 * the website". A corpus transcribed by hand starts accurate and drifts the
 * first time someone edits a stat in systems.js — and a chatbot quoting a
 * U-value the page no longer claims is worse than one that says "I don't
 * know". Importing the real modules means the numbers are the page's
 * numbers by construction.
 *
 * Two kinds of content go in:
 *
 *   GENERATED — the six systems and the twelve-series catalogue, read
 *     straight out of src/data/systems.js. This is the bulk of the factual
 *     surface and the part most likely to be asked about.
 *
 *   CURATED — company, process, performance, glass/hardware/finish and
 *     visiting copy, written below. These live in JSX section components
 *     where the prose is interleaved with markup and animation hooks;
 *     parsing them would be fragile. ⚠ They must be kept in step with those
 *     sections by hand — each carries the path of the page it summarises.
 *
 * Blog posts and contact details are NOT here. Both change without a
 * rebuild, so build_knowledge pulls them live from the database instead.
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SERIES, SYSTEMS, SYSTEM_SLUGS } from '../src/data/systems.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../../server/glaze/chatbot/knowledge/site-content.json')

const chunks = []

/** Every chunk needs a stable `key` so re-running upserts instead of duplicating. */
function add({ key, title, body, sourceLabel, sourcePath, topic, keywords = [] }) {
  const text = Array.isArray(body) ? body.filter(Boolean).join('\n\n') : body
  chunks.push({
    key,
    title,
    body: text.replace(/\s+\n/g, '\n').trim(),
    source_label: sourceLabel,
    source_path: sourcePath,
    topic,
    keywords: keywords.join(' '),
  })
}

// ── Systems ───────────────────────────────────────────────────────────
// One chunk per system. Kept whole rather than split per-paragraph: a
// question like "which system for a sea-facing balcony" needs the chips,
// the prose and the stats together to answer well, and these run only a few
// hundred words each — comfortably inside the context budget.
for (const slug of SYSTEM_SLUGS) {
  const s = SYSTEMS[slug]
  const stats = s.overview.stats
    .map((x) => `${x.key}: ${x.to}${x.unit}`)
    .join('. ')
  const strengths = s.overview.strengths
    .map((x) => `${x.title} — ${x.copy}`)
    .join('\n')

  add({
    key: `system:${slug}`,
    title: `${s.name} systems`,
    topic: 'systems',
    sourceLabel: `${s.name} Systems`,
    sourcePath: `/products/${slug}`,
    keywords: [s.name, slug, ...s.overview.chips],
    body: [
      s.description,
      s.hero.lede,
      ...s.overview.body,
      `Best suited to: ${s.overview.chips.join(', ')}.`,
      `Key figures — ${stats}.`,
      strengths,
      `Series that fit ${s.name}: ${s.fits.map((id) => SERIES[id]?.name || id).join(', ')}.`,
    ],
  })
}

// ── Series catalogue ──────────────────────────────────────────────────
// One chunk per series so a question naming a profile ("GWS-N1-60H")
// retrieves that profile alone rather than a wall of all twelve.
for (const [id, series] of Object.entries(SERIES)) {
  add({
    key: `series:${id}`,
    title: `${series.name} (${series.kind})`,
    topic: 'series',
    sourceLabel: `${series.name}`,
    sourcePath: '/products/sliding#series',
    keywords: [series.name, series.id, series.type, series.kind],
    body: [
      `${series.name} is a ${series.kind}, type ${series.type}.`,
      `Maximum sash dimensions ${series.dims} (width ${series.w} mm, height ${series.h} mm, weight ${series.kg} kg).`,
      `Thermal transmittance U-value ${series.u} W/m²K. Acoustic rating Rw ${series.rw} dB. Water tightness ${series.pa} Pa with no leakage.`,
      series.note ? `Note: ${series.note}` : '',
    ],
  })
}

// ── Curated ───────────────────────────────────────────────────────────
// ⚠ Mirrors copy that lives in JSX section components. Keep in step.
const CURATED = [
  {
    key: 'company:about',
    title: 'About Glaze Window Systems',
    topic: 'company',
    sourceLabel: 'About',
    sourcePath: '/about',
    // Deliberately includes the PHRASINGS people use, not just the topic.
    // "How long has Glaze been in business?" covered only 1 of its 3 terms
    // against the prose alone and was correctly refused for thin coverage —
    // the fix belongs in the corpus, not in a lower threshold.
    // ⚠ "sagar asia" was removed from BOTH the keywords and the body. Leaving
    // it in the keywords alone would be worse than useless: the assistant
    // would still retrieve this chunk for "is Glaze part of Sagar Asia?" and
    // then answer from a body that no longer mentions it. "parent company"
    // stays — it is a question people genuinely ask, and the honest answer is
    // now the one below.
    keywords: [
      'about', 'company', 'history', 'who are you', 'founded',
      'how long', 'business', 'years', 'experience', 'established', 'since',
      'trading', 'background', 'owner', 'parent company', 'in-house',
      'independent',
    ],
    body: [
      'Glaze Window Systems designs, fabricates and installs premium aluminium window and door systems. The house line is "Designed to Disappear" — the intent is that the architecture and the view are what you notice, not the frame.',
      'Glaze is an independent company and has been working in aluminium since 1989. Fabrication and installation are handled in-house rather than subcontracted, which is what lets the same team stand behind the tested performance figures on the finished opening.',
      'The workshop and offices are in Jubilee Hills, Hyderabad, Telangana.',
    ],
  },
  {
    key: 'company:process',
    title: 'How a Glaze project runs',
    topic: 'process',
    sourceLabel: 'Process',
    sourcePath: '/about',
    // ⚠ THESE SIX NAMES MUST MATCH THE PAGES. They are now stated identically
    // by home/ProcessSection and about/ProcessSection; a visitor who reads the
    // steps on the site and is then told a different set by the assistant has
    // caught the company contradicting itself. Change the sections, change
    // this line.
    keywords: [
      'process', 'how it works', 'lead time', 'survey', 'installation',
      'steps', 'timeline', 'consultation', 'drawings', 'fabrication', 'handover',
    ],
    body: [
      'A project moves through six steps: consultation, site survey, design and drawings, fabrication, installation, and handover. Consultation establishes a realistic budget and timeline; the site survey lasers every opening to the millimetre once the structure is ready; drawings settle sightlines, finishes and hardware before anything is made; profiles are cut, machined and assembled in-house; certified teams fit and seal on site, most installations completing within the week; handover covers care guidance, warranty and a single point of contact.',
      'Specification is done for the actual elevation rather than from a catalogue: frame, glass, spacer and opening ratio are calculated together, because a high-performance frame carrying the wrong glazing performs like neither.',
      'For an accurate lead time or a quotation on a live project, the team needs the drawings or the opening sizes — contact them directly.',
    ],
  },
  {
    key: 'performance:testing',
    title: 'Performance, testing and standards',
    topic: 'performance',
    sourceLabel: 'Performance',
    sourcePath: '/products/sliding#benefits',
    keywords: [
      'performance', 'u-value', 'uvalue', 'thermal', 'acoustic', 'rw', 'db', 'noise',
      'water', 'air', 'pa', 'wind', 'test', 'standard', 'en 12207', 'en 12208', 'certified',
    ],
    body: [
      'Glaze systems are tested to European standards: BS EN 12207 for air permeability and BS EN 12208 for water tightness.',
      'Across the range, water tightness is 600 Pa with no leakage and air permeability reaches Class 4. Acoustic performance is Rw 41–44 dB depending on series and glazing; laminated acoustic glass brings a main road down to a background murmur.',
      'Thermal transmittance runs from about 2.58 to 2.60 W/m²K on the standard series, with the best U-value in the sliding range at 2.087 W/m²K. Every profile is thermally broken with a polyamide bar separating the inner and outer aluminium shells.',
    ],
  },
  {
    key: 'spec:glass',
    title: 'Glass options',
    topic: 'specification',
    sourceLabel: 'Glass',
    sourcePath: '/products/sliding#glass',
    keywords: ['glass', 'glazing', 'double glazed', 'dgu', 'laminated', 'low-e', 'toughened', 'acoustic glass', 'solar'],
    body: [
      'Glaze glazes with single, double and laminated units, including low-emissivity and solar-control coatings and acoustic laminated build-ups.',
      'Glass is specified with the frame, not after it. A double-glazed unit in a frame with no thermal break will still condense on the aluminium while the glass stays clear, and a high-specification frame carrying single glazing wastes most of what it cost.',
      'The right build-up depends on orientation, exposure and what the room is for — the systems team will run the combined calculation for a specific elevation.',
    ],
  },
  {
    key: 'spec:hardware',
    title: 'Hardware',
    topic: 'specification',
    sourceLabel: 'Hardware',
    sourcePath: '/products/sliding#hardware',
    keywords: ['hardware', 'handle', 'lock', 'roller', 'hinge', 'german', 'cycles', 'ironmongery'],
    body: [
      'Systems are fitted with German hardware rated to 25,000 operating cycles.',
      'Sliding and lift-and-slide sashes run on twin stainless rollers over a hardened track, so the weight is carried rather than dragged and a 300 kg panel moves under one hand.',
      'Locking, handles and hinges are matched to the series and to the sash weight rather than fitted as a single default.',
    ],
  },
  {
    key: 'spec:finishes',
    title: 'Finishes and colours',
    topic: 'specification',
    sourceLabel: 'Finish',
    sourcePath: '/products/sliding#finish',
    keywords: ['finish', 'colour', 'color', 'ral', 'powder coat', 'anodised', 'wood', 'texture'],
    body: [
      'Frames are available powder-coated to RAL colours, anodised, and in wood-effect finishes.',
      'Any RAL reference can be matched. Finish affects appearance and durability in exposure but not the structural or thermal figures of the series.',
    ],
  },
  {
    key: 'contact:visit',
    title: 'Visiting, quotations and getting in touch',
    topic: 'contact',
    sourceLabel: 'Contact',
    sourcePath: '/contact',
    keywords: [
      'contact', 'quote', 'quotation', 'price', 'pricing', 'cost', 'enquiry', 'enquire',
      'visit', 'showroom', 'appointment', 'phone', 'email', 'address', 'where', 'book',
    ],
    body: [
      'The showroom and workshop are in Jubilee Hills, Hyderabad. Visits are best booked in advance so a systems specialist is free to walk through the profiles with you.',
      'Pricing is always project-specific — it depends on the series, the glass build-up, opening sizes, finish and quantity — so there is no published price list. Send the drawings or the opening sizes through the contact form and the team will come back with a quotation.',
      'The enquiry form on the contact page routes straight to the systems team, and a confirmation is sent back automatically.',
    ],
  },
]

for (const item of CURATED) add(item)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(
  OUT,
  `${JSON.stringify({ generated_from: 'src/data/systems.js + curated section copy', chunks }, null, 2)}\n`,
  'utf8',
)

const byTopic = chunks.reduce((acc, c) => ({ ...acc, [c.topic]: (acc[c.topic] || 0) + 1 }), {})
const words = chunks.reduce((n, c) => n + c.body.split(/\s+/).length, 0)
console.log(`Wrote ${chunks.length} chunks (${words} words) to ${OUT}`)
console.log('By topic:', byTopic)
