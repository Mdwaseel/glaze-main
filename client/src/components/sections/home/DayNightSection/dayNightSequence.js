/**
 * Day & Night image-sequence configuration and its progress handler.
 *
 * Copied from the second ImageSequence config in hero.html (lines
 * 5065-5100). Note this is the SAME engine as the hero — only the
 * numbers differ:
 *
 *   count   120    frames/daynight/dn_000.webp … dn_119.webp
 *   pinVh   2.2    same scroll travel as the hero → 320vh
 *   zoom    0.06   half the hero's push-in (hero uses 0.12)
 *   anchorY 0.5    centred vertical crop
 */
export const DAYNIGHT_SEQUENCE = {
  dir: '/frames/daynight',
  prefix: 'dn',
  count: 120,
  pad: 3,
  pinVh: 2.2,
  zoom: 0.06,
  anchorY: 0.5,
  // Reduced motion → a static, representative frame mid-sequence.
  // Original: dn.setStatic(Math.round(119 * 0.55)) → frame 65.
  reducedMotionFrame: Math.round(119 * 0.55),

  /* ⚠ DO NOT REMOVE — this section is two screens below the fold and its
     frames are 8.6 MB. Starting them on mount, which is what happened
     before this line existed, put them in a straight fight with the
     hero's 8.1 MB for the same connection while the hero was the only
     thing anyone could see. The hero came in at roughly half speed and
     scrubbed on stale frames for it.

     150% of the viewport is ~1.5 screens of warning, the same lead the
     engineering sequence gives itself (performanceSequence.js) — the
     section is pinned for 320vh, so the set has the whole of the
     philosophy section plus its own approach to finish in. */
  deferUntilNear: '150% 0px',

  /* Same two-pass load as the hero (imageSequence.js): a spread of the
     sequence first, the gaps behind it. Nothing is gated on this one, but
     the section can be reached before 8.6 MB has landed — the spread pass
     is what makes the sun move smoothly rather than jumping between the
     handful of frames that happened to arrive in order. */
  priorityStride: 4,
}

/**
 * The portrait set, painted instead of the one above on phones — the
 * day/night half of the same job the hero's HERO_SEQUENCE_MOBILE does.
 * See the notes there for why a 16:9 frame cannot simply be cropped into
 * a 9:16 viewport, and for the ffmpeg recipe that cut these.
 *
 * Source: assets-source/videos/mobile-day-and-night-video.mp4, 1080×1916 @ 24fps.
 * Only `dir` differs — the phase table, the pin travel and the 6% push-in
 * are shared, so the sun still lands on Dawn/Midday/Night at the same
 * scroll positions on both.
 */
export const DAYNIGHT_SEQUENCE_MOBILE = {
  ...DAYNIGHT_SEQUENCE,
  dir: '/frames/daynight-mobile',
}

/** Reduced-motion progress, paired with the static frame above. */
export const REDUCED_MOTION_PROGRESS = 0.55

/**
 * Phase thresholds — the heading stays put while this indicator tracks
 * the sun. Verbatim from the original PHASES table.
 */
export const PHASES = [
  { p: 0.0, name: 'Dawn', time: '05:30' },
  { p: 0.22, name: 'Morning', time: '08:00' },
  { p: 0.44, name: 'Midday', time: '12:30' },
  { p: 0.66, name: 'Golden Hour', time: '17:45' },
  { p: 0.84, name: 'Dusk', time: '19:30' },
  { p: 0.95, name: 'Night', time: '21:30' },
]

/**
 * applyPhase() from the original, with refs in place of getElementById.
 *
 * Kept identical detail for detail:
 *  • progress bar width is written to one decimal place
 *  • the phase scan walks the whole table and keeps the LAST match, so
 *    thresholds are inclusive lower bounds
 *  • both text writes are guarded by a !== comparison, so the DOM is
 *    only touched when the phase actually changes
 *  • the clock is re-rendered as innerHTML because the colon carries its
 *    own blink animation (.daynight__time-colon). textContent of the
 *    initial markup already reads "05:30", so the guard means React's
 *    rendered node survives untouched until the first phase change.
 */
export function createDayNightProgressHandler(fillRef, phaseRef, timeRef) {
  return function applyPhase(p) {
    const fill = fillRef.current
    const phaseEl = phaseRef.current
    const timeEl = timeRef.current

    if (fill) fill.style.width = (p * 100).toFixed(1) + '%'

    let cur = PHASES[0]
    for (let i = 0; i < PHASES.length; i++) {
      if (p >= PHASES[i].p) cur = PHASES[i]
    }

    if (phaseEl && phaseEl.textContent !== cur.name) phaseEl.textContent = cur.name
    if (timeEl && timeEl.textContent !== cur.time) {
      timeEl.innerHTML = cur.time.replace(
        ':',
        '<span class="daynight__time-colon">:</span>'
      )
    }
  }
}
