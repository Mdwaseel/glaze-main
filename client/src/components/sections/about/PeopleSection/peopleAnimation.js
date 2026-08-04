import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §06 The Hands Behind — hover-fx gate.
 *
 * Verbatim port of <script id="about-people-script"> in about.html
 * (lines 5823-5844).
 *
 * There is no animation controller here in any real sense: pure CSS does
 * all the work, and this script only opts hover-capable fine pointers
 * (with motion allowed) into the monochrome-rest / colour-on-hover mode
 * by adding one class. No GSAP, no ScrollTrigger, no timeline, no rAF, no
 * observer — the original imports none of them for this section, so
 * neither does this port. `gsap.context` would have nothing to own.
 *
 * ⚠ THE SECTION IS PARKED. `#about-people` ships with the `hidden`
 * attribute, so `section.hidden` is true and this returns immediately —
 * `ppl--fx` is never added and the section is never rendered. The guard
 * is the original's, comment and all: it wakes the hover mode back up the
 * moment the attribute is removed, which is exactly how about.html
 * intends the team section to be brought back.
 *
 * The only shared import is `prefersReducedMotion` — behaviour-identical
 * to the original's `matchMedia('(prefers-reduced-motion: reduce)')`.
 * The `(hover: hover) and (pointer: fine)` query has no shared helper and
 * is queried inline, as in the original.
 *
 * @param {HTMLElement} section  #about-people
 * @returns {(() => void) | undefined} cleanup
 */
export function buildPeopleHoverFx(section) {
  // section is parked with the `hidden` attribute for now —
  // this guard wakes the hover mode back up the moment the
  // attribute is removed
  if (!section || section.hidden) return

  const reduceMotion = prefersReducedMotion()
  const hoverFine = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  ).matches
  if (reduceMotion || !hoverFine) return
  // (static spread stays: colour portraits, names and lines visible)

  section.classList.add('ppl--fx')

  // React-only. The original never removes the class — about.html simply
  // ends — but the section remounts on every return to /about, and React
  // owns this node's className, so a class it did not render must be
  // taken back off. Harmless while the section is parked (the guard above
  // returns before the class is ever added); mandatory the day `hidden`
  // comes off.
  return function cleanup() {
    section.classList.remove('ppl--fx')
  }
}

export default buildPeopleHoverFx
