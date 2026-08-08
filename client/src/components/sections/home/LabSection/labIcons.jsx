/**
 * The five test marks, for the navigation bar at the foot of the Lab.
 *
 * Line art only — one stroke weight, `currentColor`, no fill and no
 * colour of their own, so an inactive chip renders them at its own muted
 * grey and the active chip lifts them to champagne with nothing else to
 * change. Same construction as the enquiry form's `formIcons.jsx`.
 *
 * 24×24 on a 24-unit viewBox, `stroke-width: 1.25` — at the 22px they are
 * drawn at, a heavier stroke reads as an app icon rather than a drawing.
 */

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.25,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
}

/** 01 — driving rain: a cloud with three falling strokes. */
function Rain() {
  return (
    <svg {...base}>
      <path d="M7 14.5a3.6 3.6 0 0 1 .3-7.2 5 5 0 0 1 9.5 1.3 3.2 3.2 0 0 1-.5 6.4" />
      <path d="M8.5 17.5 7.4 20.2M12 17.5l-1.1 2.7M15.5 17.5l-1.1 2.7" />
    </svg>
  )
}

/** 02 — gale-force wind: three drifting gusts, two of them curling. */
function Wind() {
  return (
    <svg {...base}>
      <path d="M3 8.6h8.4a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3 12.6h12.2a2.6 2.6 0 1 1-2.6 2.6" />
      <path d="M3 16.6h6.6" />
    </svg>
  )
}

/** 03 — street noise: a level meter, tallest in the middle. */
function Noise() {
  return (
    <svg {...base}>
      <path d="M3 10.5v3M6.5 8v8M10 4.5v15M13.5 7v10M17 9.5v5M20.5 11v2" />
    </svg>
  )
}

/** 04 — heat and cold: a sun with six rays. */
function Heat() {
  return (
    <svg {...base}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.4 12H2.2M21.8 12h-2.2M6.6 6.6 5 5M19 19l-1.6-1.6M17.4 6.6 19 5M5 19l1.6-1.6" />
    </svg>
  )
}

/** 05 — break-in attempt: a closed padlock. */
function BreakIn() {
  return (
    <svg {...base}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.2" />
      <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
      <path d="M12 14.4v2.4" />
    </svg>
  )
}

/**
 * Keyed by the test's number, which is the one identifier the five panels
 * already carry in the data — no second list to keep in step.
 */
export const LAB_ICONS = {
  '01': Rain,
  '02': Wind,
  '03': Noise,
  '04': Heat,
  '05': BreakIn,
}

export default LAB_ICONS
