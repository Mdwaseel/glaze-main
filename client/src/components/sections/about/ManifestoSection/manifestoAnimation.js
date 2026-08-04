import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §05 Manifesto — scrub-highlighted line.
 *
 * Verbatim port of <script id="about-manifesto-script"> in about.html
 * (lines 5785-5815).
 *
 * The line is set huge on a dark viewport; each word lifts from 24% to
 * full strength as the block travels up the screen — a scrubbed stagger,
 * no pin, no track height. The words are authored as spans in the markup,
 * so the default CSS (every word at full colour) IS the finished static
 * state, and with reduced motion or no GSAP this is a no-op.
 *
 * The whole controller is one `gsap.to`. Nothing here generalises and
 * nothing is extracted: the only shared imports are utils/gsap (the
 * single registerPlugin point) and prefersReducedMotion — the same two
 * the Origin, Process, Two Worlds and Factory ports use.
 *
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * manifesto script registers no load refresh.
 *
 * Every value below is copied from the original.
 */

/**
 * @param {HTMLElement} section  #about-manifesto
 * @param {HTMLElement} quote    #mfsQuote
 * @returns {(() => void) | undefined} cleanup
 */
export function buildManifestoScrub(section, quote) {
  if (!section || !quote) return

  if (prefersReducedMotion()) return
  // (static quote stays at full strength)

  section.classList.add('mfs--anim')

  // gsap.context owns the tween and its ScrollTrigger, so a single
  // revert() on unmount kills them and clears the inline opacity it
  // wrote onto the eight words. The original never tears down —
  // about.html simply ends — but in React the section remounts on every
  // return to /about, and a surviving trigger would scrub a detached
  // quote (the leak Phase 15 measured on #originScroll).
  const ctx = gsap.context(() => {
    gsap.to(quote.querySelectorAll('.mfs__w'), {
      opacity: 1,
      ease: 'none',
      duration: 1.4,
      stagger: 1,
      scrollTrigger: {
        trigger: quote,
        start: 'top 80%',
        end: 'top 28%',
        scrub: 0.5,
      },
    })
  }, section)

  return function cleanup() {
    // revert() first, while `mfs--anim` is still applied, so the trigger
    // unwinds against the geometry it measured.
    ctx.revert()
    section.classList.remove('mfs--anim')
  }
}

export default buildManifestoScrub
