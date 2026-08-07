/**
 * The consultation form's icon set.
 *
 * ⚠ DRAWN HERE RATHER THAN SOURCED, and both alternatives were checked
 * first. `public/icons.svg` holds seven social marks and nothing else, and
 * the only system imagery on disk is `products/systems/*-card.webp` — first
 * frames of the hero clips, which are installation photographs in real
 * rooms. In a 120px card those are eight different crops at eight different
 * exposures with no common ground; side by side they read as a photo album
 * rather than as a set of products. The comps show isolated renders on
 * white, which do not exist.
 *
 * So the set is line work: one stroke weight, one grid, one colour that
 * inherits from the card. That is also the first of the two options the
 * brief itself offered ("simple architectural line illustration, or minimal
 * product image"), and it is the one that can be drawn consistently from
 * what is actually here.
 *
 * ⚠ IF REAL RENDERS ARRIVE, THIS IS ONE LINE PER SYSTEM. The card markup
 * takes whatever `SYSTEM_ART[slug]` returns; swapping a component for an
 * <img> changes nothing else.
 *
 * ── The drawing rules ───────────────────────────────────────────
 * 24×24 box, 1.25 stroke, round caps and joins, no fills, `currentColor`
 * throughout — so a selected card inverting to black ink on bone needs no
 * second icon. Every glyph is built from the same three primitives (frame,
 * leaf, motion mark) so eight window systems read as one family and not as
 * eight illustrations.
 */

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

const Svg = ({ children, ...rest }) => <svg {...BASE} {...rest}>{children}</svg>

/* ── Step 01 · what is being built ──────────────────────────── */
export const IconVilla = () => (
  <Svg><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></Svg>
)
export const IconApartment = () => (
  <Svg><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 10h4a1 1 0 0 1 1 1v10" />
    <path d="M7 8h2M11 8h1M7 12h2M11 12h1M7 16h2M11 16h1M17 14h1M17 18h1" /><path d="M2 21h20" /></Svg>
)
export const IconHouse = () => (
  <Svg><path d="M4 10.5 12 4l8 6.5" /><path d="M6 9.8V20h12V9.8" /><path d="M10 20v-6h4v6" /><path d="M2 21h20" /></Svg>
)
export const IconCommercial = () => (
  <Svg><path d="M3 21V8l9-4 9 4v13" /><path d="M7 12h3M14 12h3M7 16h3M14 16h3" /><path d="M2 21h20" /></Svg>
)
export const IconRenovation = () => (
  <Svg><rect x="3" y="4" width="11" height="5" rx="1" /><path d="M14 6.5h4a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-6" />
    <rect x="9.5" y="14" width="5" height="7" rx="1" /><path d="M12 12v2" /></Svg>
)
export const IconHospitality = () => (
  <Svg><path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15" /><path d="M8 8h2M14 8h2M8 12h2M14 12h2" />
    <path d="M10 21v-4h4v4" /><path d="M2 21h20" /></Svg>
)
export const IconBuilder = () => (
  <Svg><path d="M4 21V4h11" /><path d="M4 7h13l3 3" /><path d="M12 7v4" /><path d="M10.5 11h3l-1.5 3z" />
    <path d="M2 21h20" /></Svg>
)
export const IconArchitect = () => (
  <Svg><circle cx="12" cy="4.5" r="1.5" /><path d="M11 6 5.5 20M13 6l5.5 14" /><path d="M8.5 14h7" /></Svg>
)

/* ── Step 02 · the systems ──────────────────────────────────────
   One frame, then leaves inside it, then the mark that says how it
   moves. The differences between eight products are the differences
   between eight motion marks, which is exactly what they are. */
const Frame = () => <rect x="2.5" y="3.5" width="19" height="17" rx="0.5" />

export const IconSliding = () => (
  <Svg><Frame /><path d="M9 3.5v17M15 3.5v17" /><path d="M11 12h5.5M14.5 10l2 2-2 2" /></Svg>
)
export const IconLiftSlide = () => (
  <Svg><Frame /><path d="M9 3.5v17M15 3.5v17" /><path d="M12 15V9.5M10 11.5l2-2 2 2" /><path d="M11 16.5h5.5" /></Svg>
)
export const IconBiFold = () => (
  <Svg><Frame /><path d="M6 3.5v17M10 3.5v17M14 3.5v17M18 3.5v17" /><path d="M6 7l4 3-4 3M18 7l-4 3 4 3" /></Svg>
)
export const IconCasement = () => (
  <Svg><Frame /><path d="M12 3.5v17" /><path d="M12 6.5 19 4v16l-7-2.5" /></Svg>
)
export const IconTiltTurn = () => (
  <Svg><Frame /><path d="M3.5 8 20.5 5" /><path d="M12 11.5v6M10 15.5l2 2 2-2" /></Svg>
)
export const IconPivot = () => (
  <Svg><Frame /><path d="M12 3.5v17" /><path d="M7.5 8a6 6 0 0 1 0 8" /><path d="M16.5 8a6 6 0 0 0 0 8" /></Svg>
)
export const IconFixed = () => (
  <Svg><Frame /><path d="M6 7h5" /></Svg>
)
export const IconAccordion = () => (
  <Svg><Frame /><path d="M5 3.5v17M8 3.5v17M11 3.5v17M14 3.5v17M17 3.5v17" />
    <path d="M18.5 8.5 20.5 12l-2 3.5" /></Svg>
)

/* ── Step 04 · reaching you ─────────────────────────────────── */
export const IconCall = () => (
  <Svg><path d="M5 3.5h3.2l1.6 4-2 1.2a12 12 0 0 0 5.5 5.5l1.2-2 4 1.6V17a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5z" /></Svg>
)
export const IconWhatsApp = () => (
  <Svg><path d="M3.5 20.5 5 16.4A8 8 0 1 1 8.1 19.4z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5" /></Svg>
)
export const IconEmail = () => (
  <Svg><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="M3 6.5 12 13l9-6.5" /></Svg>
)
export const IconMorning = () => (
  <Svg><circle cx="12" cy="13" r="3.5" /><path d="M12 6.5V5M6.9 8.4 5.8 7.3M17.1 8.4l1.1-1.1" />
    <path d="M3 18h18" /></Svg>
)
export const IconAfternoon = () => (
  <Svg><circle cx="12" cy="11" r="4" /><path d="M12 4V2.5M12 19.5V21M4.6 11H3M21 11h-1.6M6.8 5.8 5.7 4.7M18.3 4.7l-1.1 1.1M6.8 16.2l-1.1 1.1M18.3 17.3l-1.1-1.1" /></Svg>
)
export const IconEvening = () => (
  <Svg><path d="M20 14.5A8 8 0 0 1 9.5 4 8.2 8.2 0 1 0 20 14.5z" /></Svg>
)
export const IconShield = () => (
  <Svg><path d="M12 2.5 20 5.5v6c0 4.6-3.2 8.6-8 10-4.8-1.4-8-5.4-8-10v-6z" /><path d="M9 12l2.2 2.2L15.5 10" /></Svg>
)

/* ── Step 05 · the review ───────────────────────────────────── */
export const IconPin = () => (
  <Svg><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></Svg>
)
export const IconGrid = () => (
  <Svg><rect x="3.5" y="3.5" width="17" height="17" rx="1" /><path d="M12 3.5v17M3.5 12h17" /></Svg>
)
export const IconCalendar = () => (
  <Svg><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></Svg>
)
export const IconRupee = () => (
  <Svg><circle cx="12" cy="12" r="9" /><path d="M9 7.5h6M9 10.5h6M13.5 7.5c1.6 0 2.4 1.2 2.4 2.6 0 1.6-1.2 2.7-3.2 2.7H9l5 4" /></Svg>
)
export const IconDoc = () => (
  <Svg><path d="M6 2.5h7L19 8v13.5H6z" /><path d="M13 2.5V8h6" /><path d="M9 13h7M9 16.5h5" /></Svg>
)
export const IconUser = () => (
  <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>
)
export const IconChat = () => (
  <Svg><path d="M3.5 5.5h17v11h-9l-5 4v-4h-3z" /></Svg>
)
export const IconUpload = () => (
  <Svg><path d="M6 2.5h7L19 8v13.5H6z" /><path d="M13 2.5V8h6" /><path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5" /></Svg>
)

/** Slug → system glyph. Anything unknown falls back to a plain frame,
    so a system added in the admin panel renders sensibly on day one. */
export const SYSTEM_ART = {
  sliding: IconSliding,
  'lift-and-slide': IconLiftSlide,
  'bi-fold': IconBiFold,
  casement: IconCasement,
  'tilt-and-turn': IconTiltTurn,
  pivot: IconPivot,
  fixed: IconFixed,
  /* Kept though nothing maps to it today: the fallback any
     media-less system reaches for, and the drawing already exists. */
  accordion: IconAccordion,
}

export const systemArt = (slug) => SYSTEM_ART[slug] || IconFixed
