/**
 * Reduced-motion check.
 *
 * The original scripts each read the media query ONCE at script-run time:
 *
 *   var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 *
 * and never listened for changes. This mirrors that exactly — a one-shot
 * read, no live subscription — so behaviour does not drift from the static
 * pages. Do not "upgrade" this to a change listener.
 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
