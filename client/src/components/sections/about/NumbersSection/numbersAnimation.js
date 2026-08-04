import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §08 Numbers — the factory-floor blueprint draw.
 *
 * Verbatim port of <script id="about-numbers-script"> in about.html
 * (lines 5922-5965).
 *
 * NO GSAP. The original comment says it outright: "No GSAP needed: dash
 * lengths are measured here, the CSS transitions do the drawing, and
 * IntersectionObserver fires it." So there is no gsap import here, no
 * ScrollTrigger and no gsap.context — the controller measures each
 * stroke, zeroes it inline, and lets the `.nums--plananim` CSS
 * transitions draw it back when the plan enters the viewport. The
 * champagne floor-fill sweeps 2400 ms later.
 *
 * ⚠ The COUNT-UPS ARE NOT HERE. All four ride the shared
 * `[data-count-to]` system in the About base script — `useAboutCountUp`,
 * mounted page-level by About.jsx. That hook is About's own: `Math.round`
 * + `data-format="comma"` → `toLocaleString('en-IN')`, comma-stripped
 * target, counters zeroed up front. Home's `useCountUp` (`data-decimals`
 * + `toFixed`, markup value left until scroll-in) is deliberately NOT
 * used — see the Phase 13 table.
 *
 * The marquee is likewise pure CSS (`nums-drift 46s linear infinite`,
 * paused on hover, `animation: none` under reduced motion) with the
 * swatch set duplicated in the markup. Nothing to wire.
 *
 * The only shared import is `prefersReducedMotion`, behaviour-identical
 * to the original's `matchMedia('(prefers-reduced-motion: reduce)')`.
 *
 * Every value below is copied from the original.
 *
 * @param {HTMLElement} section  #about-numbers
 * @param {SVGSVGElement} plan   #numsPlan
 * @returns {(() => void) | undefined} cleanup
 */
export function buildNumbersPlan(section, plan) {
  if (!section || !plan) return

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return
  // (static state stays: the finished drawing, fill at rest)

  section.classList.add('nums--plananim')

  // Zero every stroke against its own measured length …
  const strokes = [].slice.call(plan.querySelectorAll('[data-draw]'))
  strokes.forEach(function (el) {
    const len = Math.ceil(el.getTotalLength()) + 1
    el.style.strokeDasharray = len + ' ' + len
    el.style.strokeDashoffset = len
  })

  // React-only: the fill timer has to be cancellable. The original lets
  // it run because about.html simply ends; here the section unmounts on
  // every route change, and a pending timer would add `is-filled` to a
  // detached node 2.4s later.
  let fillTimer = 0

  // … then let the CSS transitions draw them back on entry, the
  // count-up running alongside via the shared [data-count-to]
  // observer. The champagne floor-fill sweeps once the last
  // partition has settled.
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return
      io.unobserve(entry.target)
      strokes.forEach(function (el) {
        el.style.strokeDashoffset = 0
      })
      fillTimer = setTimeout(function () {
        plan.classList.add('is-filled')
      }, 2400)
    })
  }, { rootMargin: '-10% 0px', threshold: 0 })

  io.observe(plan)

  return function cleanup() {
    io.disconnect()
    if (fillTimer) clearTimeout(fillTimer)
    fillTimer = 0
    section.classList.remove('nums--plananim')
    // `is-filled` and the inline dash properties are written imperatively
    // onto React-owned nodes, so React will not clear them: without this
    // a remount would start from a half-drawn (or already-filled) plan
    // instead of from the authored markup.
    plan.classList.remove('is-filled')
    strokes.forEach(function (el) {
      el.style.strokeDasharray = ''
      el.style.strokeDashoffset = ''
    })
  }
}

export default buildNumbersPlan
