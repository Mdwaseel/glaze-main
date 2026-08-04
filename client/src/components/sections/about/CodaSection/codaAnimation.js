import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §10 Coda — the quote rises, then the page dissolves into #contact.
 *
 * Verbatim port of <script id="about-coda-script"> in about.html
 * (lines 5971-6024).
 *
 * One dark viewport of negative space holding a two-line quote. The lines
 * curtain up out of their masks as the beat arrives; as it leaves, the
 * quote thins away while the ground eases into #contact's exact dark, so
 * the page seems to dissolve into the conversation.
 *
 * NOT pinned — the page's pinned moments stay Origin, Two Worlds and the
 * Facility strip. Two independent scrubbed timelines, no track height, no
 * pin-spacer.
 *
 * With reduced motion (or no GSAP) this is a no-op: the default CSS is
 * the static quote, fully visible, no fade.
 *
 * Nothing here generalises. The line-curtain shape is the same idea as
 * §03 Two Worlds' beat 4 (`yPercent 115 → 0` out of a `.worlds__line-mask`),
 * but the values, the trigger windows and the second dissolve timeline all
 * differ, so it stays local. The only shared imports are utils/gsap (the
 * single registerPlugin point) and prefersReducedMotion — the same two the
 * Origin, Process, Two Worlds, Factory, Manifesto and Values ports use.
 *
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * coda script registers no load refresh.
 *
 * Every value below is copied from the original.
 *
 * @param {HTMLElement} section  #about-coda
 * @param {object} refs  { inner, main, soul }
 * @returns {(() => void) | undefined} cleanup
 */
export function buildCodaBeat(section, refs) {
  const { inner, main, soul } = refs || {}
  if (!section || !inner || !main || !soul) return

  if (prefersReducedMotion()) return
  // (static quote stays, no fade)

  // ⚠ Order is load-bearing and matches the original: the class lands
  // FIRST, because `.coda--anim .coda__main` is what applies the
  // translateY(115%) resting state the gsap.set below reads and
  // normalises.
  section.classList.add('coda--anim')

  // gsap.context owns both timelines, both ScrollTriggers and the set, so
  // a single revert() on unmount kills them and clears every inline style
  // they wrote — including the section's animated backgroundColor. The
  // original never tears down (about.html simply ends), but the section
  // remounts on every return to /about, and surviving triggers would
  // scrub a detached quote (the leak Phase 15 measured on #originScroll).
  const ctx = gsap.context(() => {
    // Hand the resting offset to GSAP as yPercent, clearing the
    // pixel offset it parses out of the CSS translateY(115%) (the
    // computed style is a px matrix, so without y: 0 that offset
    // stays baked in and the lines never clear their masks).
    gsap.set([main, soul], { y: 0, yPercent: 115 })

    // The two lines curtain up as the beat arrives …
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        end: 'top 12%',
        scrub: 0.6,
      },
    })
      .to(main, { yPercent: 0, duration: 0.5 }, 0)
      .to(soul, { yPercent: 0, duration: 0.5 }, 0.22)

    // … and as it leaves, the quote thins away while the ground
    // eases into #contact's exact dark — the moment dissolves into
    // the conversation below.
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'bottom 85%',
        end: 'bottom 40%',
        scrub: 0.6,
      },
    })
      .to(inner, { autoAlpha: 0, duration: 1 }, 0)
      .to(section, { backgroundColor: '#0F0F0E', duration: 1 }, 0)
  }, section)

  return function cleanup() {
    // revert() first, while `coda--anim` is still applied, so the triggers
    // unwind against the geometry they measured.
    ctx.revert()
    section.classList.remove('coda--anim')
  }
}

export default buildCodaBeat
