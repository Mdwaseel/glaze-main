import { SERIES } from '@/data/systems'
import { ROUTES } from '@/constants/routes'

/**
 * The questions people actually ask, and their answers.
 *
 * ⚠ EVERY FIGURE HERE IS ALREADY ON THE SITE. Nothing was invented to fill a
 * question. The standards (BS EN 1026/12207, 12208, 12210), the 600 Pa water
 * tightness, the Rw 41–44 dB range, the 2.087 W/m²K best U-value, the 300 kg
 * and six-metre maxima, the four hardware marques, the eight finishes and the
 * eight glass builds are all transcribed from the sections that publish them
 * — OverviewSection, SeriesSection, HardwareSection, FinishSection,
 * GlassSection — and where a number belongs to one system, it is READ from
 * that system's own catalogue entry rather than repeated here.
 *
 * ⚠ WHAT IS DELIBERATELY NOT ANSWERED. There is no question about price, no
 * lead time in weeks and no warranty period, because this site publishes none
 * of those and an FAQ is the easiest place on a website to accidentally make
 * a commercial commitment. Where somebody genuinely needs one of those, the
 * answer is the enquiry form, which is what those questions point at.
 *
 * ⚠ THE ANSWERS ARE PLAIN STRINGS, and must stay that way. They are rendered
 * on the page AND emitted as the `acceptedAnswer.text` of a FAQPage node; if
 * the two ever differ — a longer answer in the markup than on the page, or
 * markup in one and not the other — that is a structured-data violation
 * rather than a formatting choice. One string, both places. See faqSchema().
 */

/* ── The collection ─────────────────────────────────────────────
   Shown on /systems: someone at the top of the range deciding which of the
   seven to open. The questions are the ones that decide that. */
export const SYSTEMS_FAQS = [
  {
    q: 'Which Glaze system suits my opening?',
    a: 'It follows what the opening has to do. Sliding and Lift & Slide are for wide, uninterrupted spans where nothing should swing into the room. Casement and Tilt & Turn are for ventilation and for tall single leaves. Bi-Fold is for folding an entire elevation aside. Pivot is for oversized statement panels balanced on one axis, and Fixed is for the spans that never need to open, where the frame comes down to the structural minimum. Tell us the size of the opening and what it faces, and we will tell you which of the seven fits it.',
  },
  {
    q: 'How large can a single Glaze panel be?',
    a: 'The largest series in the range, the 201, carries a single sash up to six metres tall at up to 300 kg. The lighter series carry proportionally smaller leaves — a casement leaf runs to 2.8 metres at 130 kg. Those are the tested maxima for the series, not a promise that every combination up to them is buildable: what a specific opening takes also depends on its configuration, the glass specified and the structure around it.',
  },
  {
    q: 'Are Glaze systems thermally broken?',
    a: 'Yes. Every series in the catalogue is thermally broken aluminium — an insulating barrier through the profile rather than a solid metal path from outside to in. The best U-value in the range is 2.087 W/m²K; each series page publishes its own figure.',
  },
  {
    q: 'How well do they keep the weather out?',
    a: 'Class 4 air permeability tested to BS EN 1026 and BS EN 12207, water tightness to 600 Pa with no leakage tested to BS EN 12208, and wind load class P4 to P5 tested to BS EN 12210. Those are the same certificates across the range rather than a figure for one flagship product.',
  },
  {
    q: 'How much noise do they cut out?',
    a: 'Between 41 and 44 dB Rw across the range. At the top of that, with laminated acoustic glazing, a main road outside reads as a background murmur rather than traffic.',
  },
  {
    q: 'What finishes and glass can I have?',
    a: 'Eight standard finishes across four families — anodised, powder coat, PVDF and wood grain — including Champagne Bronze, Matte Black, Slate Grey, Bronze Grey and four wood-grain tones. Glass runs from clear through grey, bronze, frosted and reflective to Low-E, laminated and double glazed, and every system page lets you see them against that system.',
  },
  {
    q: 'Whose hardware is inside them?',
    a: 'German — Siegenia, Hoppe, GU and Roto. The hardware is the part of a window that is used tens of thousands of times, so it is the part where the specification is not varied to hit a price.',
  },
  {
    q: 'Where does Glaze supply and install?',
    a: 'Glaze designs, fabricates and installs from Hyderabad and supplies across India. The showroom is in Jubilee Hills, Hyderabad, and it is worth visiting: the difference between a 60-series and a 201-series sightline is much easier to see than to describe.',
    link: { to: ROUTES.CONTACT, label: 'Arrange a visit' },
  },
]

/* ── Contact ────────────────────────────────────────────────────
   A different reader: someone with the form already in front of them,
   hesitating. These answer the hesitation rather than the specification. */
export const CONTACT_FAQS = [
  {
    q: 'How quickly will I hear back?',
    a: 'Within one working day, and usually the same one. Someone who knows the systems reads the enquiry — if you have sent drawings, they will have been through them before they call.',
  },
  {
    q: 'What should I send with my enquiry?',
    a: 'Whatever you already have. Rough opening sizes are enough to start; elevations, plans or a photograph of the opening are better, and the form takes attachments so you can send them with the enquiry rather than in a second email. If you know which system you want, say so; if you do not, describe the opening and we will suggest one.',
  },
  {
    q: 'Do I have to know which system I want before I enquire?',
    a: 'No. Half the enquiries we answer start with an opening and a problem rather than a product. Choosing the system is the part we do — what we need from you is the opening, what it faces and what it has to do.',
  },
  {
    q: 'Can I see the systems before specifying them?',
    a: 'Yes. The showroom is at Jubilee Hills, Hyderabad, and has the systems built and operable rather than in a catalogue. Ask for a visit in the form and we will fix a time.',
  },
  {
    q: 'Do you work outside Hyderabad?',
    a: 'Yes. Glaze fabricates in Hyderabad and supplies projects across India. Tell us where the site is when you enquire — it is one of the things that shapes the answer.',
  },
  {
    q: 'What happens to the details I send?',
    a: 'They are used to answer your enquiry and to prepare a specification or quotation, and nothing else. We do not sell personal data and we do not add you to a marketing list for asking a question. Our Privacy Policy sets out exactly what is collected, who sees it and how long it is kept.',
    /* ⚠ THE LINK IS NOT PART OF THE ANSWER STRING. `a` is what the FAQPage
       node marks up and it has to read whole on its own; this is rendered
       after it. It is also the only CONTEXTUAL link into the privacy policy
       on the site — the footer's is furniture on every page, this one is
       where somebody is actually asking the question. */
    link: { to: ROUTES.PRIVACY, label: 'Read the privacy policy' },
  },
]

/* ── Working with Glaze ─────────────────────────────────────────
   Only on /faq. The other two sets are also shown in context — on /systems
   and on /contact — and repeating them here alone would make the hub page a
   copy of two others rather than the place that answers more.

   Every step named below is one of the six on the About page's process
   section (Consultation, Site Survey, Design & Drawings, Fabrication,
   Installation, Handover), so this describes a process the site already
   publishes rather than one invented for an FAQ. */
export const PROCESS_FAQS = [
  {
    q: 'What actually happens between an enquiry and a fitted window?',
    a: 'Six steps, and they are the ones set out on the About page. A consultation, on site or in the studio, to understand the opening and leave you with a realistic budget. A site survey to measure it properly. Design and drawings, where the series, configuration, glass and finish are settled. Fabrication. Installation. Handover. The specification is agreed before anything is cut, which is why the quotation is for the window you are going to have rather than an estimate that moves.',
    link: { to: ROUTES.ABOUT, label: 'See the six steps' },
  },
  {
    q: 'Do you measure the openings yourselves?',
    a: 'Yes — the site survey is a separate step for a reason. Aluminium is cut to the measurement, so the measurement is ours to get right; a system fabricated to somebody else\'s dimensions is a system nobody can stand behind. Rough sizes are all we need to quote, but nothing is manufactured against them.',
  },
  {
    q: 'Can Glaze work with my architect\'s drawings?',
    a: 'That is the normal case. Send elevations, plans or a schedule with the enquiry and we will work from them, come back on anything the drawing leaves open — sightline, opening direction, threshold detail — and issue our own shop drawings for approval before fabrication.',
  },
  {
    q: 'Are the windows made in-house?',
    a: 'Yes. Glaze fabricates in its own plant in Hyderabad, on CNC machining centres, and installs with its own teams. The profiles, the German hardware, the glass and the coatings come from the named partners listed on the About page; the cutting, the assembly, the glazing and the fitting are ours.',
    link: { to: ROUTES.ABOUT, label: 'Inside the factory' },
  },
  {
    q: 'Is the performance actually tested, or is it a manufacturer\'s claim?',
    a: 'Tested, and to named standards: air permeability to BS EN 1026 and BS EN 12207, water tightness to BS EN 12208, wind load to BS EN 12210. There is also an in-house performance lab where rain, wind, acoustic, thermal and security tests are run on built assemblies — the footage on the system pages is from it.',
  },
  {
    q: 'What maintenance do aluminium systems need?',
    a: 'Very little, and none of it structural. Aluminium does not rot, warp or need repainting, and the anodised and powder-coated finishes are the surface rather than a coat on top of one. The parts that benefit from attention are the moving ones: keeping the track clear and the drainage slots unblocked is most of it. Hardware from Siegenia, Hoppe, GU and Roto is serviceable and adjustable rather than sealed.',
  },
  {
    q: 'Can I see finished work before committing?',
    a: 'Yes, in two ways. The showroom in Jubilee Hills has the systems built and operable rather than in a catalogue, and the gallery on this site is photography and film of completed projects. Between them you can see both how a system works and how it looks once it is in a building.',
    link: { to: ROUTES.GALLERY, label: 'Open the gallery' },
  },
]

/**
 * The /faq page, in the order it reads.
 *
 * ⚠ THE HUB CARRIES THE FULL SET AND THE SECTIONS CARRY SUBSETS. /systems
 * shows SYSTEMS_FAQS and /contact shows CONTACT_FAQS because those are the
 * questions being asked at those two moments; /faq shows all three groups
 * because somebody who navigated to a page called FAQs wants the list, not a
 * relevant slice of it. The overlap is deliberate and the answers are the
 * same strings, not paraphrases — one source, three surfaces, so a corrected
 * answer is corrected everywhere.
 */
export const FAQ_GROUPS = [
  {
    id: 'systems',
    label: 'Choosing a system',
    heading: { lead: 'Choosing ', em: 'a system.' },
    note: 'Sizes, standards, finishes and where we work.',
    faqs: SYSTEMS_FAQS,
  },
  {
    id: 'process',
    label: 'Working with Glaze',
    heading: { lead: 'Working with ', em: 'Glaze.' },
    note: 'From the first conversation to the handover.',
    faqs: PROCESS_FAQS,
  },
  {
    id: 'enquiries',
    label: 'Enquiries and your data',
    heading: { lead: 'Enquiries and ', em: 'your data.' },
    note: 'What to send, how fast we reply, what happens to it.',
    faqs: CONTACT_FAQS,
  },
]

/** Every question on /faq, flattened — one FAQPage node, never three. */
export const ALL_FAQS = FAQ_GROUPS.flatMap((group) => group.faqs)

/**
 * One system's questions, generated from its own catalogue entry.
 *
 * ⚠ GENERATED, NOT AUTHORED PER SYSTEM. Seven hand-written sets would be
 * seven places for a figure to disagree with the stats table further up the
 * same page — and the catalogue is editable, so an eighth system added in the
 * admin panel would arrive with no FAQ at all. Every number below is read
 * from `system.overview.stats`, every use case from `system.overview.chips`,
 * and the series list from `system.fits`, so each answer is the same claim
 * the rest of the page is already making.
 *
 * Systems with a short stats row (Pivot ships three figures, Fixed two) drop
 * the questions those figures would have answered rather than padding them.
 */
export function systemFaqs(system) {
  if (!system) return []

  const stats = system.overview?.stats || []
  const chips = system.overview?.chips || []
  const name = system.name

  const stat = (needle) =>
    stats.find((s) => String(s.key || '').toLowerCase().includes(needle))

  const weight = stat('weight')
  const height = stat('height')
  const uValue = stat('u-value')

  const faqs = []

  /* Size — the first question anyone asks about a system, and the one the
     stats table answers in numbers without saying what they mean. */
  if (weight || height) {
    const parts = []
    // `dec` is the catalogue's own decimal count, so 6 reads "6.0 m" here
    // exactly as the counter above it on the page lands.
    if (height) parts.push(`up to ${figure(height)} tall`)
    if (weight) parts.push(`weighing up to ${figure(weight)}`)
    faqs.push({
      q: `How large can a ${name} panel be?`,
      a: `${name} takes a single leaf ${parts.join(' and ')}. That is the tested maximum for the series that carries it, in the configuration the standard defines — what a particular opening takes also depends on how it is divided, the glass specified and the structure around it, which is what we confirm before quoting.`,
    })
  }

  if (chips.length) {
    faqs.push({
      q: `Where does ${name} work best?`,
      a: `${name} is specified most often for ${listSentence(chips.map((c) => c.toLowerCase()))}. Those are the situations its geometry is actually good at rather than a list of rooms — if your opening is none of them, one of the other Glaze systems probably suits it better, and we will say so.`,
    })
  }

  faqs.push({
    q: `How is ${name} sealed against wind and rain?`,
    a: `To the same certificates as the rest of the Glaze range: Class 4 air permeability tested to BS EN 1026 and BS EN 12207, water tightness to 600 Pa with no leakage tested to BS EN 12208, and wind load class P4 to P5 tested to BS EN 12210.${
      uValue ? ` The best thermal figure in this range is ${figure(uValue)}.` : ''
    }`,
  })

  /* Which profiles carry it. `fits` is the page's own flagged set, so this
     answer and the highlighted cards in the series grid cannot disagree. */
  const fits = (system.fits || []).map((id) => SERIES[id]?.name).filter(Boolean)
  faqs.push({
    q: `Which profile series does ${name} use?`,
    a: fits.length
      ? `${listSentence(fits)} — flagged on this page's series grid, where each one opens to its own tested numbers. The full Glaze catalogue runs to twelve series, and which of them suits a given opening depends on its span and the glass it has to carry.`
      : `${name} is drawn from the same twelve-series catalogue as the rest of the range. Which series suits a given opening depends on its span, its weight and the glass it has to carry, so we confirm it against the drawing rather than in advance.`,
  })

  faqs.push({
    q: `How do I specify ${name} for a project?`,
    a: `Send the opening — sizes, an elevation or a photograph — through the enquiry form on this page. We reply within one working day, agree the series and the configuration that suit it, and quote against that rather than against a guess. Drawings can be attached to the form directly.`,
  })

  return faqs
}

/**
 * A catalogue stat as prose: "300 kg", "6.0 m", "2.087 W/m²K".
 *
 * The decimal count is the catalogue's own, so the figure in an answer reads
 * identically to the one the counter above it settles on. A non-numeric value
 * is passed through rather than becoming NaN.
 */
function figure(stat) {
  const n = Number(stat.to)
  const dec = Number(stat.dec) || 0
  const value = Number.isFinite(n) ? n.toFixed(dec) : String(stat.to)
  return `${value} ${stat.unit}`.trim()
}

/** ['a', 'b', 'c'] → "a, b and c". Oxford-comma-free, as the site's copy is. */
function listSentence(items) {
  if (items.length <= 1) return items[0] || ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}
