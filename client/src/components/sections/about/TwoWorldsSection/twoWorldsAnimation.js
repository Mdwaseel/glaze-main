import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §03 Two Worlds — the signature moment.
 *
 * Verbatim port of <script id="about-worlds-script"> in about.html
 * (lines 5598-5684).
 *
 * The viewport splits into a cool "Europe" panel and a warm "India" one.
 * On scroll the halves converge and merge along a glowing bronze seam; a
 * clip-path reveal then opens from the seam outward onto one full-bleed
 * image, and "Global quality. Local soul." masks in. Pinning is CSS
 * sticky inside a tall track (the site's Lenis-friendly pattern) — no
 * GSAP pin, no pin-spacer.
 *
 * With reduced motion (or no GSAP) this is a no-op: the default CSS is
 * already the finished static state — the two graded panels side by side
 * with the merged image and its line below.
 *
 * Nothing here generalises, so nothing is extracted. The only shared
 * imports are utils/gsap (single registerPlugin point) and
 * prefersReducedMotion — the same two the Origin and Process ports use.
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * worlds script registers no load refresh.
 *
 * Every numeric constant below is copied from the original; they are the
 * pacing and cannot be "tidied".
 */

/* ── PACING ─────────────────────────────────────────
   WORLDS_TRACK_VH — extra viewport-heights the moment lasts.
   The beats below are fractions of that scrub:
     0        → SEAM_AT   the halves converge
     SEAM_AT  → REVEAL_AT the seam glows at full strength
     REVEAL_AT→ 0.88      the merged world opens outward
     LINE_AT  → 1         "Global quality. Local soul." masks in */
const WORLDS_TRACK_VH = 250
const SEAM_AT = 0.40
const REVEAL_AT = 0.50
const LINE_AT = 0.76

/**
 * @param {HTMLElement} section  #about-worlds
 * @param {object} refs  { scrollEl, eu, india, seam, refract, reveal,
 *                         lineMain, lineSoul, lineNote }
 * @returns {(() => void) | undefined} cleanup
 */
export function buildWorldsMoment(section, refs) {
  const { scrollEl, eu, india, seam, refract, reveal, lineMain, lineSoul, lineNote } =
    refs || {}
  if (!section || !scrollEl || !eu || !india || !reveal) return

  if (prefersReducedMotion()) return
  // (static spread stays: both graded panels + the merged image)

  // ⚠ Order is load-bearing and matches the original: the class lands
  // FIRST, because `.worlds--anim .worlds__line-main` is what applies the
  // translateY(115%) resting state that the gsap.set below reads and
  // normalises. Adding it after the sets would leave the CSS transform
  // fighting the tween.
  section.classList.add('worlds--anim')
  scrollEl.style.height = (100 + WORLDS_TRACK_VH) + 'vh'

  // gsap.context owns every set, tween and the ScrollTrigger, so a single
  // revert() on unmount restores the authored markup. The original never
  // tears down — about.html simply ends — but in React the section
  // remounts on every return to /about, and a surviving trigger would
  // scrub a detached tree (the bug Phase 15 measured on #originScroll).
  const ctx = gsap.context(() => {
    // Opening state: the halves hold apart, a breath of dark
    // ground between them; the merged world is shut at the seam.
    gsap.set(eu, { xPercent: -16 })
    gsap.set(india, { xPercent: 16 })
    gsap.set([eu, india], { scale: 1.03, transformOrigin: '50% 50%' })
    gsap.set(seam, { opacity: 0 })
    if (refract) gsap.set(refract, { xPercent: -50, scaleX: 0.6, opacity: 0 })
    gsap.set(reveal, { clipPath: 'inset(0% 50% 0% 50%)' })
    // y: 0 clears the pixel offset GSAP parses out of the CSS
    // translateY(115%) resting state — without it the lines keep
    // that baked offset and never clear the mask.
    gsap.set([lineMain, lineSoul], { y: 0, yPercent: 115 })

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: scrollEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
      },
    })

    /* Beat 1 — convergence. The two worlds drift toward one
       another and settle flush at the centre line. */
    tl.to(eu, { xPercent: 0, duration: SEAM_AT }, 0)
      .to(india, { xPercent: 0, duration: SEAM_AT }, 0)
      .to([eu, india], { scale: 1, duration: SEAM_AT }, 0)

      /* Beat 2 — the seam ignites where they meet, and the glass
         band over it swells: blur + hue-shift refraction that is
         strongest at maximum convergence … */
      .to(seam, { opacity: 1, duration: (REVEAL_AT - SEAM_AT) * 0.5 }, SEAM_AT * 0.82)
      .to(refract, { opacity: 1, scaleX: 1.15, duration: (REVEAL_AT - SEAM_AT) * 0.7 }, SEAM_AT * 0.85)

      /* Beat 3 — … and the merged world opens outward from it.
         The seam dies away and the refraction resolves to clear
         glass as the image passes them. */
      .to(reveal, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.88 - REVEAL_AT }, REVEAL_AT)
      .to(seam, { opacity: 0, duration: 0.14 }, REVEAL_AT + 0.1)
      .to(refract, { opacity: 0, scaleX: 0.7, duration: 0.16 }, REVEAL_AT + 0.06)
      .to([eu, india], { scale: 1.05, duration: 0.88 - REVEAL_AT }, REVEAL_AT)

      /* Beat 4 — the line masks in, word-curtain style. */
      .to(lineMain, { yPercent: 0, duration: 0.12 }, LINE_AT)
      .to(lineSoul, { yPercent: 0, duration: 0.12 }, LINE_AT + 0.06)
      .to(lineNote, { opacity: 1, duration: 0.08 }, LINE_AT + 0.16)
  }, section)

  return function cleanup() {
    // revert() first, while the class and track height are still applied,
    // so the trigger unwinds against the same geometry it measured.
    ctx.revert()
    section.classList.remove('worlds--anim')
    scrollEl.style.height = ''
  }
}

export default buildWorldsMoment
