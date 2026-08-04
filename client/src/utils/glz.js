import { prefersReducedMotion } from '@/utils/motion'

/**
 * GLZ — the products pages' shared helpers and page state.
 *
 * Port of the first of the thirteen scripts in products/sliding.html
 * (lines 3326-3377), which the original assigns to `window.GLZ` and every
 * later script reads.
 *
 * It is two things at once:
 *
 *   1. THE FIVE-LAYER ATTRIBUTION STORE. Every signature section (series
 *      accordion, glass switcher, finish switcher, the form's own selects)
 *      writes into one `spec` object and fires a `glz:spec` CustomEvent on
 *      `document`. The enquiry form listens for that event, so it never
 *      has to know which section the visitor touched. Kept exactly as the
 *      original has it — a document-level event bus rather than React
 *      state, because the sections that write to it are imperative
 *      controllers ported one-for-one from the originals.
 *
 *   2. `countTo`, the shared number roll used by the overview counters,
 *      the series panel metrics and the glass spec rows.
 *
 * ⚠ TWO DEVIATIONS, both forced by there being six pages in one SPA:
 *
 *   `reduce` IS READ PER CALL, not captured once at module scope. The
 *   original reads the media query as the page parses; a module evaluated
 *   once per session would freeze whatever was true when the first
 *   products page happened to load. `prefersReducedMotion()` is the
 *   project's shared one-shot read and matches what the original computed
 *   at the equivalent moment.
 *
 *   `reset(system)` EXISTS ONLY HERE. Each original ships its own copy of
 *   this script with `system:` hard-coded to that page's name, so the
 *   store starts fresh on every page load. In an SPA the module is
 *   evaluated once and survives every route change, so the page shell
 *   calls `reset()` on mount to put the store back to that system's
 *   opening state. Without it, walking from Sliding to Casement would
 *   leave Sliding's series and glass attached to a Casement enquiry.
 */

/**
 * Five-layer attribution. Every signature section writes into this
 * one object and fires a change, so the enquiry form never has to
 * know which section the visitor touched.
 *
 * The values here are the opening state of every page: only `system`
 * differs between the six, and `reset` supplies it.
 */
export const spec = {
  system: '',
  variant: '',
  series: '',
  glass: 'Clear',
  /* The colour is what the visitor saw; the type is what the form
     records, because the exact RAL is settled with a specifier. */
  finish: 'Champagne Bronze',
  finishType: 'Anodised',
}

/** Opening state for a system page — see the `reset` note in the header. */
export function reset(system) {
  spec.system = system
  spec.variant = ''
  spec.series = ''
  spec.glass = 'Clear'
  spec.finish = 'Champagne Bronze'
  spec.finishType = 'Anodised'
}

export function setSpec(key, value) {
  if (spec[key] === value) return
  spec[key] = value
  document.dispatchEvent(new CustomEvent('glz:spec', { detail: { key: key, value: value } }))
}

/**
 * Number roll. Reduced motion lands on the final value at once —
 * the point of the count-up is emphasis, not information.
 */
export function countTo(el, target, decimals) {
  if (!el) return
  const to = parseFloat(target)
  if (isNaN(to)) { el.textContent = target; return }
  let from = parseFloat(String(el.textContent).replace(/[^\d.-]/g, ''))
  if (isNaN(from)) from = 0

  if (prefersReducedMotion()) { el.textContent = to.toFixed(decimals); return }
  if (el._raf) cancelAnimationFrame(el._raf)

  const dur = 900
  let t0 = null
  function tick(t) {
    if (t0 === null) t0 = t
    const p = Math.min(1, (t - t0) / dur)
    const e = 1 - Math.pow(1 - p, 4)            /* quartic ease-out */
    el.textContent = (from + (to - from) * e).toFixed(decimals)
    if (p < 1) el._raf = requestAnimationFrame(tick)
  }
  el._raf = requestAnimationFrame(tick)
}

/**
 * `GLZ.reduce` in the originals. A getter, not a constant, for the
 * reason in the header note.
 */
export const GLZ = {
  get reduce() { return prefersReducedMotion() },
  spec,
  reset,
  setSpec,
  countTo,
}

export default GLZ
