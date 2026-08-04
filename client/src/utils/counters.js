/**
 * [data-count-to] / [data-decimals] helpers.
 *
 * Two independent count-up implementations exist on the static site and
 * both read the same attributes:
 *   • the base script's IntersectionObserver count-up (see useCountUp)
 *   • the Philosophy section's GSAP proxy tween, which the base script
 *     deliberately excludes so no number is ever animated twice
 * Only the attribute reading and formatting are shared here — the two
 * animations keep their own, different easings and durations.
 */

/** Decimal places declared on the element (default 0). */
export function readDecimals(el) {
  return parseInt(el.getAttribute('data-decimals') || '0', 10)
}

/** Target value declared on the element. */
export function readCountTarget(el) {
  return parseFloat(el.getAttribute('data-count-to'))
}

/** Write a value with the element's declared precision. */
export function formatCount(el, value) {
  el.textContent = value.toFixed(readDecimals(el))
}

/**
 * Jump straight to the final value — the no-JS-motion rest state used by
 * both implementations when motion is reduced.
 */
export function setFinalCount(el) {
  formatCount(el, readCountTarget(el))
}
