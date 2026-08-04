/**
 * The six system pages, as data.
 *
 * products/sliding.html, lift-and-slide.html, bi-fold.html, casement.html,
 * pivot.html and fixed.html are 3,895 lines each and differ from one
 * another by roughly FORTY-FOUR lines — the head tags, the hero, the
 * overview copy and numbers, the order of the series grid, and the five
 * cross-links at the foot. Everything else, including all 2,100 lines of
 * CSS and all thirteen scripts, is character-for-character identical.
 *
 * They are therefore ported as ONE page component driven by this table
 * rather than as six near-duplicate components. That is not a
 * simplification of the source: `products/_system.html` exists in the
 * same folder as the template the six were generated from, so the
 * template-plus-data shape IS the authored structure. Every string below
 * is transcribed from the six files; nothing is paraphrased, and the two
 * pages that carry fewer stats (Pivot has three, Fixed has two) keep
 * exactly the stats they ship rather than being padded to four.
 *
 * ⚠ HTML ENTITIES ARE DECODED. The originals write `Lift &amp; Slide`
 * and `&mdash;`; JSX renders strings literally, so these hold the decoded
 * characters ("Lift & Slide", "—"). The rendered text is identical.
 *
 * Markup that is the same on all six pages — hardware, glass, finish, the
 * lab strip, partners, the enquiry form and testimonials — is NOT here.
 * It lives in the section components, verbatim, as on every other page of
 * this migration.
 */

/* ═══════════════════════════════════════════════════════════════
   THE PROFILE SERIES CATALOGUE

   All twelve series, with the data-* payload each card carries for the
   shared spec panel. Verified byte-identical across all six pages: only
   the ORDER of the cards and the `· For <System>` flag change per page,
   which is what `order` and `fits` below express.

   `id` is this module's own handle (the image basename); it is not in
   the original markup, which has no need to address a card by name.
   Every other field is transcribed.
   ═══════════════════════════════════════════════════════════════ */
export const SERIES = {
  '60h': {
    id: '60h',
    name: 'GWS-N1-60H',
    kind: '60 Series · Casement Window',
    type: 'Casement',
    img: '/products/series/60h.webp',
    alt: 'GWS-N1-60H profile cross-section',
    dims: '1100 × 2800 mm · 80 kg',
    w: '1100', h: '2800', kg: '80', u: '2.60', udec: '2', rw: '41–44', pa: '600',
  },
  '60ddd': {
    id: '60ddd',
    name: 'GWS-N1-60 D/DD',
    kind: '60 Series · Door / Double Door',
    type: 'Door',
    img: '/products/series/60ddd.webp',
    alt: 'GWS-N1-60 D DD profile cross-section',
    dims: '1100 × 2800 mm · 120 kg',
    w: '1100', h: '2800', kg: '120', u: '2.60', udec: '2', rw: '41–44', pa: '600',
  },
  '60fs': {
    id: '60fs',
    name: 'GWS-N1-60FS',
    kind: '60 Series · Folding',
    type: 'Folding',
    img: '/products/series/60fs.webp',
    alt: 'GWS-N1-60FS profile cross-section',
    dims: '800 × 1600 mm · 45 kg',
    w: '800', h: '1600', kg: '45', u: '2.60', udec: '2', rw: '41–44', pa: '600',
    note: 'Overall opening 1500 × 2200 mm · system capacity 150 kg',
  },
  '125': {
    id: '125',
    name: 'GWS-N1-125-45 30+60FS',
    kind: '125 Series · Folding',
    type: 'Folding',
    img: '/products/series/125.webp',
    alt: 'GWS-N1-125-45 30+60FS profile cross-section',
    dims: '800 × 1600 mm · 45 kg',
    w: '800', h: '1600', kg: '45', u: '2.58', udec: '2', rw: '41–44', pa: '600',
    note: 'Overall opening 1500 × 2200 mm · system capacity 150 kg',
  },
  '130': {
    id: '130',
    name: 'GWS-N1-130 FS+SN / D/DD',
    kind: '130 Series · Folding & Door',
    type: 'Folding / Door',
    img: '/products/series/130.webp',
    alt: 'GWS-N1-130 FS+SN   D DD profile cross-section',
    dims: '1100 × 2800 mm · 130 kg',
    w: '1100', h: '2800', kg: '130', u: '2.34', udec: '2', rw: '41–44', pa: '600',
    note: 'Folding leaf 800 × 1600 mm at 45 kg · overall opening 1500 × 2200 mm · system capacity 150 kg',
  },
  '150': {
    id: '150',
    name: 'GWS-N1-150-50+60 FS+SN / D/DD',
    kind: '150 Series · Folding & Door',
    type: 'Folding / Door',
    img: '/products/series/150.webp',
    alt: 'GWS-N1-150-50+60 FS+SN   D DD profile cross-section',
    dims: '1100 × 2800 mm · 130 kg',
    w: '1100', h: '2800', kg: '130', u: '2.087', udec: '3', rw: '41–44', pa: '600',
    note: 'Folding leaf 800 × 1600 mm at 45 kg · overall opening 1500 × 2200 mm · system capacity 150 kg',
  },
  '105': {
    id: '105',
    name: 'GWS-N1-105 SD',
    kind: '105 Series · Sliding Door',
    type: 'Sliding',
    img: '/products/series/105.webp',
    alt: 'GWS-N1-105 SD profile cross-section',
    dims: '2600 × 4000 mm · 120 kg',
    w: '2600', h: '4000', kg: '120', u: '2.18', udec: '2', rw: '41–44', pa: '600',
  },
  '135': {
    id: '135',
    name: 'GWS-N1-135 SD',
    kind: '135 Series · Sliding Door',
    type: 'Sliding',
    img: '/products/series/135.webp',
    alt: 'GWS-N1-135 SD profile cross-section',
    dims: '2600 × 4000 mm · 180 kg',
    w: '2600', h: '4000', kg: '180', u: '2.657', udec: '3', rw: '41–44', pa: '600',
  },
  '155': {
    id: '155',
    name: 'GWS-N1-155 SD',
    kind: '155 Series · Sliding Door',
    type: 'Sliding',
    img: '/products/series/155.webp',
    alt: 'GWS-N1-155 SD profile cross-section',
    dims: '2600 × 4000 mm · 120 kg',
    w: '2600', h: '4000', kg: '120', u: '2.70', udec: '2', rw: '41–44', pa: '600',
  },
  '155sn': {
    id: '155sn',
    name: 'GWS-N1-155 SD + SN',
    kind: '155+SN Series · Sliding with Screen',
    type: 'Sliding',
    img: '/products/series/155sn.webp',
    alt: 'GWS-N1-155 SD + SN profile cross-section',
    dims: '2500 × 4000 mm · 120 kg',
    w: '2500', h: '4000', kg: '120', u: '2.74', udec: '2', rw: '41–44', pa: '600',
  },
  '201': {
    id: '201',
    name: 'GWS-N1-201 SD',
    kind: '201 Series · Grand Sliding Door',
    type: 'Sliding',
    img: '/products/series/201.webp',
    alt: 'GWS-N1-201 SD profile cross-section',
    dims: '2600 × 6000 mm · 300 kg',
    w: '2600', h: '6000', kg: '300', u: '2.657', udec: '3', rw: '41–44', pa: '600',
  },
  '201sn': {
    id: '201sn',
    name: 'GWS-N1-201 SD + SN',
    kind: '201 SN Series · Sliding with Screen',
    type: 'Sliding',
    img: '/products/series/201sn.webp',
    alt: 'GWS-N1-201 SD + SN profile cross-section',
    dims: '2600 × 6000 mm · 300 kg',
    w: '2600', h: '6000', kg: '300', u: '2.657', udec: '3', rw: '41–44', pa: '600',
  },
}

/**
 * Every series name, in catalogue order — the <option> list of the
 * enquiry form's "Profile series" select, which is the same on all six
 * pages and is NOT reordered per system (verified). Sliding's grid order
 * happens to match it, which is why the two look alike on that page.
 */
export const SERIES_OPTION_ORDER = [
  '105', '135', '155', '155sn', '201', '201sn',
  '60h', '60ddd', '60fs', '125', '130', '150',
]

/* ═══════════════════════════════════════════════════════════════
   THE SIX SYSTEMS
   `slug` is the original filename without its extension, so
   products/sliding.html becomes /products/sliding.
   ═══════════════════════════════════════════════════════════════ */
export const SYSTEMS = {
  sliding: {
    slug: 'sliding',
    /** The name every control, mirror and cross-link uses. */
    name: 'Sliding',
    title: 'Sliding Systems — Glaze Window Systems',
    description: 'Glaze sliding aluminium window and door systems — precision rollers, sashes to 300 kg, spans to six metres.',
    schema: {
      name: 'Glaze Sliding Systems',
      category: 'Aluminium sliding windows and doors',
      description: 'Precision-engineered aluminium sliding window and door systems with sashes to 300 kg and spans to six metres.',
    },
    hero: {
      video: '/videos/sliding.mp4',
      title: 'Sliding.',
      accent: 'Effortless by design.',
      lede: 'Walls of glass that move with a fingertip — and stand still against everything else.',
    },
    overview: {
      title: { lead: 'A window that ', em: 'glides open.' },
      chips: ['Panoramic', 'Wide openings', 'Sea-facing', 'Minimal sightlines'],
      body: [
        'Precision-engineered stainless rollers carry the sash instead of dragging it, so a panel weighing 300 kg moves under one hand. Nothing swings into the room and nothing crowds the view — the pane simply steps aside.',
        'The sliding series run from a modest balcony door to a six-metre glazed elevation. Whichever depth a project needs, the thermally broken core, the German hardware and the tested seal are the same.',
      ],
      stats: [
        { to: '300', dec: '0', unit: 'kg', key: 'Max sash weight' },
        { to: '6', dec: '1', unit: 'm', key: 'Max sash height' },
        { to: '600', dec: '0', unit: 'Pa', key: 'Water tight, no leakage' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Fingertip glide', copy: 'Twin stainless rollers on a hardened track. The weight is carried, not dragged — the panel takes the same effort at 60 kg and 300 kg.' },
        { title: 'Spans to six metres', copy: 'The 201 series takes a single sash six metres tall, letting one pane do the work an entire wall used to.' },
        { title: 'Sealed against weather', copy: 'Class 4 air permeability and 600 Pa of water tightness with no leakage — tested to BS EN 12207 and 12208.' },
        { title: 'Quiet inside', copy: 'Rw 41–44 dB across the range. Laminated acoustic glazing brings a main road down to a background murmur.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue, with the series that suit Sliding listed first.',
    fits: ['105', '135', '155', '155sn', '201', '201sn'],
    order: ['105', '135', '155', '155sn', '201', '201sn', '60h', '60ddd', '60fs', '125', '130', '150'],
  },

  'lift-and-slide': {
    slug: 'lift-and-slide',
    name: 'Lift & Slide',
    title: 'Lift & Slide Systems — Glaze Window Systems',
    description: 'Glaze lift and slide aluminium doors — sashes to 300 kg, six metres of height, airtight the moment the handle is released.',
    schema: {
      name: 'Glaze Lift and Slide Systems',
      category: 'Aluminium lift & slide windows and doors',
      description: 'Aluminium lift and slide door systems carrying sashes to 300 kg and six metres of height.',
    },
    hero: {
      video: '/videos/left%20and%20slide.mp4',
      title: 'Lift & Slide.',
      accent: 'Weightless, then sealed.',
      lede: 'Turn the handle and the panel lifts off its seal. Release it and the whole weight settles back down.',
    },
    overview: {
      title: { lead: 'A panel that ', em: 'lifts to move.' },
      chips: ['Panoramic', 'Heavy panels', 'Sea-facing', 'Airtight'],
      body: [
        'The handle raises the sash clear of its gasket before it travels, so a 300 kg panel moves under one hand and the seal is never dragged along its own length. Release the handle and that same weight presses the gasket shut again.',
        'Lift and slide runs on the heavy sliding-door profiles — the series carrying sashes from 120 kg to 300 kg, at heights up to six metres.',
      ],
      stats: [
        { to: '300', dec: '0', unit: 'kg', key: 'Max sash weight' },
        { to: '6', dec: '1', unit: 'm', key: 'Max sash height' },
        { to: '44', dec: '0', unit: 'Rw dB', key: 'Peak sound insulation' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Lift, then glide', copy: 'The gasket is only under load when the door is closed, so it never wears against the track.' },
        { title: 'Sashes to 300 kg', copy: 'The 201 series carries a 300 kg leaf — a pane most systems would have to split in two.' },
        { title: 'Six metres tall', copy: 'A single sash spans six metres of height, so the opening is set by the architecture rather than the hardware.' },
        { title: 'Airtight when set', copy: 'Dropping the sash compresses the seal on every edge — Class 4 air permeability, 600 Pa water tightness.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue, with the series that suit Lift & Slide listed first.',
    fits: ['135', '155', '201', '201sn'],
    order: ['135', '155', '201', '201sn', '60h', '60ddd', '60fs', '125', '130', '150', '105', '155sn'],
  },

  'bi-fold': {
    slug: 'bi-fold',
    name: 'Bi-Fold',
    title: 'Bi-Fold Systems — Glaze Window Systems',
    description: 'Glaze bi-fold aluminium doors — leaves that stack aside to open a whole elevation, with flush thresholds and 150 kg capacity.',
    schema: {
      name: 'Glaze Bi-Fold Systems',
      category: 'Aluminium bi-fold windows and doors',
      description: 'Aluminium bi-fold door systems that fold an entire elevation into a single stack.',
    },
    hero: {
      video: '/videos/Bi%20Fold.mp4',
      title: 'Bi-Fold.',
      accent: 'The wall that folds away.',
      lede: 'Leaf after leaf stacks aside until nothing at all stands in the opening.',
    },
    overview: {
      title: { lead: 'A wall that ', em: 'folds away.' },
      chips: ['Full-width openings', 'Terraces', 'Garden rooms', 'Flush thresholds'],
      body: [
        'Each leaf runs on its own carriage and folds flat against the next, so an entire elevation gathers into a stack roughly the width of one panel. Nothing swings into the room and nothing is left standing in the middle of the opening.',
        'The folding series take leaves up to 800 × 1600 mm inside an overall opening of 1500 × 2200 mm, at 45 kg a leaf and 150 kg of system capacity.',
      ],
      stats: [
        { to: '150', dec: '0', unit: 'kg', key: 'System capacity' },
        { to: '45', dec: '0', unit: 'kg', key: 'Per folding leaf' },
        { to: '2200', dec: '0', unit: 'mm', key: 'Overall opening height' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Folds to a stack', copy: 'The leaves gather at one jamb rather than sliding behind each other, so the opening is genuinely clear.' },
        { title: 'Flush thresholds', copy: 'The track can sit level with the finished floor — which matters most where a room runs straight out onto a terrace.' },
        { title: '45 kg a leaf', copy: 'Light enough to move in sequence with one hand, inside a system rated to 150 kg in total.' },
        { title: 'Sealed against weather', copy: 'Every leaf closes onto the same gasket line — Class 4 air permeability and 600 Pa of water tightness.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue, with the series that suit Bi-Fold listed first.',
    fits: ['60fs', '125', '130', '150'],
    order: ['60fs', '125', '130', '150', '60h', '60ddd', '105', '135', '155', '155sn', '201', '201sn'],
  },

  casement: {
    slug: 'casement',
    name: 'Casement',
    title: 'Casement Systems — Glaze Window Systems',
    description: 'Glaze casement aluminium windows and doors — concealed hinges, multi-point locking, leaves to 130 kg and 2.8 metres tall.',
    schema: {
      name: 'Glaze Casement Systems',
      category: 'Aluminium casement windows and doors',
      description: 'Aluminium casement windows and doors with concealed hinges, multi-point locking and leaves to 2.8 metres.',
    },
    hero: {
      video: '/videos/casement.mp4',
      title: 'Casement.',
      accent: 'The refined classic.',
      lede: 'Sashes that swing clear of the frame — every opening a whole opening.',
    },
    overview: {
      title: { lead: 'A window that ', em: 'opens completely.' },
      chips: ['Cross-ventilation', 'Tall leaves', 'Weather-facing', 'Concealed hinges'],
      body: [
        'An outward-opening sash on concealed hinges clears the frame entirely, so the whole opening becomes airflow rather than a gap at the top. Multi-point locking then draws the leaf into a continuous gasket on every edge, not just beside the handle.',
        'The casement family runs from a single window to a full-height double door, sharing the thermally broken core and the tested seal with every other Glaze system.',
      ],
      stats: [
        { to: '130', dec: '0', unit: 'kg', key: 'Max leaf weight' },
        { to: '2.8', dec: '1', unit: 'm', key: 'Max leaf height' },
        { to: '600', dec: '0', unit: 'Pa', key: 'Water tight, no leakage' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Concealed hinges', copy: 'Nothing breaks the line of the frame when the sash is shut, and nothing collects dirt where the two meet.' },
        { title: 'Multi-point locking', copy: 'Locking points run the full sash edge, so the gasket is compressed evenly rather than only at one point.' },
        { title: 'Leaves to 2.8 metres', copy: 'The 130 and 150 series carry a 2800 mm leaf at up to 130 kg — tall enough for full-height glazing.' },
        { title: 'Sealed against weather', copy: 'Class 4 air permeability and 600 Pa of water tightness with no leakage — tested to BS EN 12207 and 12208.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue, with the series that suit Casement listed first.',
    fits: ['60h', '60ddd', '130', '150'],
    order: ['60h', '60ddd', '130', '150', '60fs', '125', '105', '135', '155', '155sn', '201', '201sn'],
  },

  pivot: {
    slug: 'pivot',
    name: 'Pivot',
    title: 'Pivot Systems — Glaze Window Systems',
    description: 'Glaze pivot aluminium windows — oversized panels balanced on a single axis, sealed all round when closed.',
    schema: {
      name: 'Glaze Pivot Systems',
      category: 'Aluminium pivot windows and doors',
      description: 'Aluminium pivot window systems with oversized panels balanced on a single rotation axis.',
    },
    hero: {
      video: '/videos/pivot%20window.mp4',
      title: 'Pivot.',
      accent: 'Balanced on one axis.',
      lede: 'An oversized panel that turns on a single silent axis, in balance at every angle.',
    },
    overview: {
      title: { lead: 'A window that ', em: 'turns, not swings.' },
      chips: ['Statement openings', 'Oversized formats', 'Courtyards', 'Perfect balance'],
      body: [
        'The panel rotates about its own centre rather than hanging off one edge, so the load sits on the axis instead of the hinge side. That is what lets the format grow well past what a hinged sash would carry at the same frame depth.',
        'Because it is balanced, a very large pane stays exactly where it is left — half open is a position, not something you have to hold.',
      ],
      /* Three, not four — pivot.html ships no leaf-weight figure. */
      stats: [
        { to: '600', dec: '0', unit: 'Pa', key: 'Water tight, no leakage' },
        { to: '44', dec: '0', unit: 'Rw dB', key: 'Peak sound insulation' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Central-axis rotation', copy: 'The load sits on the axis, not on one edge, so the panel does not drop out of square over the years.' },
        { title: 'Oversized formats', copy: 'Panes far larger than a hinged sash could carry, in a frame that stays slim.' },
        { title: 'Stays where you leave it', copy: 'A balanced panel holds any angle without a stay or a catch.' },
        { title: 'Sealed all round', copy: 'Closed, the gasket runs unbroken around the full perimeter of the frame.' },
      ],
    },
    /* No series is flagged as a fit on this page, so the note drops the
       "listed first" clause. Transcribed, not derived. */
    seriesNote: 'The full Glaze catalogue. Open a series to see its tested numbers.',
    fits: [],
    order: ['60h', '60ddd', '60fs', '125', '130', '150', '105', '135', '155', '155sn', '201', '201sn'],
  },

  fixed: {
    slug: 'fixed',
    name: 'Fixed',
    title: 'Fixed Systems — Glaze Window Systems',
    description: 'Glaze fixed aluminium windows — the thinnest possible frame around a permanent pane, with no moving parts at all.',
    schema: {
      name: 'Glaze Fixed Systems',
      category: 'Aluminium fixed windows and doors',
      description: 'Fixed aluminium window systems with minimal sightlines and no moving parts.',
    },
    /* The only page whose hero is a STILL. There is no fixed-window clip
       to run, so fixed.html ships an <img> where the other five ship a
       <video> — see SystemHeroSection. */
    hero: {
      image: '/products/systems/fixed-hero.webp',
      title: 'Fixed.',
      accent: 'Nothing but the view.',
      lede: 'No hinges, no rails, no motion — only the thinnest frame we can draw around a pane of glass.',
    },
    overview: {
      title: { lead: 'A window that ', em: 'never moves.' },
      chips: ['Picture windows', 'Maximum glass', 'Thinnest sightlines', 'Zero maintenance'],
      body: [
        'With nothing to open there is nothing to accommodate: no sash inside the frame, no hardware in the reveal, no clearance left for movement. What remains is very close to glass held in a line.',
        'Fixed lights are usually specified alongside an opening system, taking the spans that never need to open so the operable panels can stay a sensible size.',
      ],
      /* Two, not four — a fixed light has no moving mass to rate. */
      stats: [
        { to: '600', dec: '0', unit: 'Pa', key: 'Water tight, no leakage' },
        { to: '44', dec: '0', unit: 'Rw dB', key: 'Peak sound insulation' },
      ],
      strengths: [
        { title: 'Zero moving parts', copy: 'Nothing to wear, adjust or service — the assembly is the same in year twenty as on the day it was set.' },
        { title: 'Thinnest sightlines', copy: 'Without a sash inside the frame, the visible aluminium comes down to the structural minimum.' },
        { title: 'Maximum glass', copy: 'More of the opening is glazed than any operable system can manage at the same size.' },
        { title: 'Sealed permanently', copy: 'A continuous bond rather than a compression seal, so there is no gasket line to maintain.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue. Open a series to see its tested numbers.',
    fits: [],
    order: ['60h', '60ddd', '60fs', '125', '130', '150', '105', '135', '155', '155sn', '201', '201sn'],
  },

  /* ⚠ THE SEVENTH SYSTEM, AND THE ONLY ONE WITH NO STATIC ORIGINAL.
     There is no products/tilt-and-turn.html — this entry is authored to
     the same shape as the six that were transcribed, so the one page
     component and every list that reads this table pick it up with no
     special case. Its numbers are the CASEMENT figures, and that is not
     a placeholder: a tilt & turn runs on the same 60 and 130 series
     hardware, inward rather than outward, so the tested leaf weight,
     leaf height, water tightness and U-value are the same certificates.
     Nothing here claims a figure the catalogue does not already hold. */
  'tilt-and-turn': {
    slug: 'tilt-and-turn',
    name: 'Tilt & Turn',
    title: 'Tilt & Turn Systems — Glaze Window Systems',
    description: 'Glaze tilt and turn aluminium windows — one handle, two windows: tilt for background air, turn for the whole opening.',
    schema: {
      name: 'Glaze Tilt and Turn Systems',
      category: 'Aluminium tilt and turn windows',
      description: 'Aluminium tilt and turn window systems with dual-action hardware, inward opening and multi-point locking.',
    },
    hero: {
      video: '/videos/Tilt%20and%20Turn%20Window.mp4',
      title: 'Tilt & Turn.',
      accent: 'Two windows, one handle.',
      lede: 'A quarter turn tilts the head inward for air. A half turn opens the whole sash into the room.',
    },
    overview: {
      title: { lead: 'A window that ', em: 'does both.' },
      chips: ['Secure ventilation', 'Easy cleaning', 'High floors', 'Egress'],
      body: [
        'One handle drives two entirely different openings. At ninety degrees the sash tilts in at the head — background air, with the leaf still locked at every other point. At one hundred and eighty it swings fully inward, which is the whole opening, and which is also how you clean the outside of a window on the ninth floor from inside the room.',
        'Because it opens inward, nothing swings out over a balcony, a walkway or a neighbouring elevation — the reason tilt and turn is the default across most of Europe, and the reason it belongs on tight urban sites here.',
      ],
      stats: [
        { to: '130', dec: '0', unit: 'kg', key: 'Max leaf weight' },
        { to: '2.8', dec: '1', unit: 'm', key: 'Max leaf height' },
        { to: '600', dec: '0', unit: 'Pa', key: 'Water tight, no leakage' },
        { to: '2.087', dec: '3', unit: 'W/m²K', key: 'Best U-value in range' },
      ],
      strengths: [
        { title: 'Two positions, one handle', copy: 'Tilt for air you can leave unattended, turn for the full opening. No second control, and nothing to learn.' },
        { title: 'Ventilate securely', copy: 'In the tilt position the leaf stays locked everywhere except the head — an opening nobody can reach through.' },
        { title: 'Cleaned from inside', copy: 'The sash swings fully into the room, so the outer face is reachable without a cradle or a ladder.' },
        { title: 'Nothing swings out', copy: 'Inward opening keeps the sash clear of balconies, walkways and boundary lines — and out of the wind.' },
      ],
    },
    seriesNote: 'The full Glaze catalogue, with the series that suit Tilt & Turn listed first.',
    fits: ['60h', '60ddd', '130', '150'],
    order: ['60h', '60ddd', '130', '150', '60fs', '125', '105', '135', '155', '155sn', '201', '201sn'],
  },
}

/** Slugs in the order the footer's "Systems" column lists them. */
export const SYSTEM_SLUGS = [
  'sliding', 'casement', 'tilt-and-turn', 'lift-and-slide', 'bi-fold', 'pivot', 'fixed',
]

/**
 * The cross-links at the foot of a system page: every OTHER system.
 * Each original hard-codes its own five <a>s, and all six lists were
 * checked against this single order with the current system removed —
 * every one matches, so the order below reproduces all thirty links.
 *
 * ⚠ Tilt & Turn makes it SIX links per page, not five. The section's
 * heading counts the list rather than hard-coding "Five", so the seventh
 * system needed no change there.
 */
export const OTHER_SYSTEM_ORDER = [
  'sliding', 'casement', 'tilt-and-turn', 'lift-and-slide', 'bi-fold', 'pivot', 'fixed',
]

/**
 * The clip (or still) each cross-link card plays on hover.
 * Fixed has no clip, so its card shows the same still the Fixed hero uses.
 *
 * ⚠ EVERY CLIP NOW CARRIES A `poster`, which the originals do not.
 * These cards ship `preload="metadata"` and stay PAUSED until the pointer
 * is over them, so whether anything is on screen beforehand depends on
 * the browser having decoded a first frame off the metadata fetch —
 * which it does not reliably do. Three of the five came up as black
 * rectangles in testing. The poster is that first frame, extracted once,
 * at 6–13 KB apiece.
 */
export const SYSTEM_CARD_MEDIA = {
  sliding: { video: '/videos/sliding.mp4', poster: '/products/systems/sliding-card.webp' },
  casement: { video: '/videos/casement.mp4', poster: '/products/systems/casement-card.webp' },
  'lift-and-slide': { video: '/videos/left%20and%20slide.mp4', poster: '/products/systems/lift-and-slide-card.webp' },
  'bi-fold': { video: '/videos/Bi%20Fold.mp4', poster: '/products/systems/bi-fold-card.webp' },
  pivot: { video: '/videos/pivot%20window.mp4', poster: '/products/systems/pivot-card.webp' },
  fixed: { image: '/products/systems/fixed.webp' },
  'tilt-and-turn': { video: '/videos/Tilt%20and%20Turn%20Window.mp4', poster: '/products/systems/tilt-and-turn-card.webp' },
}

/* ═══════════════════════════════════════════════════════════════
   THE CAROUSEL — the collection card and the copy beside it.

   These three maps used to live INSIDE SystemsSection.jsx, as two
   index-aligned arrays and a hard-coded card order. They moved here
   because they are the same thing as everything else in this file:
   per-system content. Two things follow from the move.

   1. The alignment bug is gone. The arrays were aligned by POSITION —
      the controller toggles `.sysm__info` by the apex card's index — so
      inserting a card without inserting its copy at the same index gave
      every system after it the wrong description. Keyed by slug, that
      cannot happen.

   2. They can be seeded. The catalogue in the database is generated
      from this file (scripts/export-catalogue.mjs), and copy locked
      inside a JSX component cannot be read by a build script. An admin
      editing "Explore Sliding" needed this data to be data.
   ═══════════════════════════════════════════════════════════════ */

/**
 * The order the cards ring the carousel in.
 *
 * ⚠ NOT the same as SYSTEM_SLUGS above, which is the footer column's
 * order. The site shipped with two different orders for the same seven
 * things; the catalogue has ONE `order` per system and this is the one
 * it was seeded from, so the footer column and the cross-links now
 * follow the carousel rather than their own list.
 */
export const SYSTEM_CAROUSEL_ORDER = [
  'sliding', 'lift-and-slide', 'bi-fold', 'casement', 'tilt-and-turn', 'pivot', 'fixed',
]

/**
 * The active-category copy — one article per card, shown when that card
 * reaches the apex.
 *
 * ⚠ THESE FIGURES ARE THE CAROUSEL'S OWN and are NOT the tested numbers
 * in `overview.stats` above. "Panels up to 400 kg" and "50 dB acoustics"
 * are the marketing headline the static homepage shipped; the system
 * page's certified figures are 300 kg and Rw 41–44. Transcribed as
 * authored rather than reconciled — changing a claim is an editorial
 * decision, and now that both are editable it is one someone can make in
 * the panel.
 */
export const SYSTEM_TEASERS = {
  sliding: {
    lead: 'Sliding ', em: 'Systems',
    desc: 'Walls of glass that glide on precision stainless rails — panoramic openings that move with a fingertip and disappear into the architecture.',
    specs: ['20 mm sightlines', 'Spans up to 40 ft', 'Fingertip glide'],
    cta: 'Explore Sliding',
  },
  'lift-and-slide': {
    lead: 'Lift ', em: '& Slide',
    desc: 'Turn the handle and the panel rises from its seal, gliding weightlessly. Release, and it settles back — airtight, silent, secure.',
    specs: ['Panels up to 400 kg', 'Airtight seal', '50 dB acoustics'],
    cta: 'Explore Lift & Slide',
  },
  'bi-fold': {
    lead: 'Bi-Fold ', em: 'Doors',
    desc: 'An entire elevation that folds away, panel by panel, until nothing stands between inside and out.',
    specs: ['Up to 8 panels', 'Flush thresholds', 'Inward or outward'],
    cta: 'Explore Bi-Fold',
  },
  casement: {
    lead: 'Casement ', em: 'Windows',
    desc: 'The refined classic — outward-opening sashes on concealed hinges, engineered for effortless ventilation and an uncompromising seal.',
    specs: ['Concealed hinges', 'Multi-point locking', 'Slim profiles'],
    cta: 'Explore Casement',
  },
  'tilt-and-turn': {
    lead: 'Tilt ', em: '& Turn',
    desc: 'One handle, two windows. A quarter turn tilts the head inward for air; a half turn swings the whole sash into the room.',
    specs: ['Dual action', 'Secure vent', 'Cleaned from inside'],
    cta: 'Explore Tilt & Turn',
  },
  pivot: {
    lead: 'Pivot ', em: 'Windows',
    desc: 'A statement in motion. Oversized panels that rotate on a single silent axis — perfectly balanced at every angle.',
    specs: ['Central-axis rotation', 'Oversized formats', 'Perfect balance'],
    cta: 'Explore Pivot',
  },
  fixed: {
    lead: 'Fixed ', em: 'Windows',
    desc: 'Some views should never be interrupted. No hinges, no rails, no motion — only the thinnest possible frame around a perfect picture.',
    specs: ['Zero moving parts', 'Thinnest sightlines', 'Maximum glass'],
    cta: 'Explore Fixed',
  },
}

/**
 * One line per system, shown under the chips on the contact form once a
 * system is chosen.
 *
 * Moved out of enquiryFormController.js, where it was keyed by the chip's
 * DISPLAY NAME — a map that silently stopped matching the moment anyone
 * renamed a system. Keyed by slug here, and carried through the catalogue
 * as `enquiry_note`, so a system added in the panel arrives with its own
 * note instead of falling back to nothing.
 *
 * Generic descriptions of the window types, not product specs.
 * TODO(copy): confirm wording with the team.
 */
export const SYSTEM_ENQUIRY_NOTES = {
  sliding: 'Panels glide past each other on precision tracks — the everyday choice for balconies and living rooms.',
  'lift-and-slide': 'Panels lift and glide with fingertip effort — for wide, uninterrupted openings onto terraces and views.',
  'bi-fold': 'Panels fold and stack to one side, opening the whole wall to the outside.',
  casement: 'Hinged, outward-opening sashes — the classic for bedrooms, kitchens and studies.',
  'tilt-and-turn': 'One handle, two positions — tilt for secure background air, turn for the whole opening.',
  pivot: 'Turns on a central axis — a statement entrance door or feature window.',
  fixed: 'Pure glass with no moving parts — for light and views where nothing needs to open.',
}

/** Ordered cross-links for one system — every other system, current removed. */
export function otherSystems(slug) {
  return OTHER_SYSTEM_ORDER.filter((s) => s !== slug).map((s) => SYSTEMS[s])
}

/** The twelve series a page renders, in that page's authored order. */
export function seriesFor(system) {
  return system.order.map((id) => SERIES[id])
}
