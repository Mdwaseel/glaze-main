import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §04 The Facility — pinned horizontal strip.
 *
 * Verbatim port of <script id="about-factory-script"> in about.html
 * (lines 5689-5780).
 *
 * The section pins when it reaches the viewport, then the five
 * production-zone frames drive sideways for the length of the pin,
 * leaning up to ±3° with scroll velocity. The frame nearest viewport
 * centre carries full colour. Pinning is CSS-sticky inside a tall track
 * — the site's Lenis-friendly pattern, no GSAP pin and no pin-spacer.
 *
 * With reduced motion (or no GSAP) this is a no-op: the default CSS is
 * already the finished static state, a natively swipeable snap-aligned
 * row in full colour with no pin.
 *
 * NOT reusing Home's ArchSection horizontal-gallery code, which is the
 * only comparable system on the site: that one injects its own section
 * height from a `refreshInit` listener, skews at `clamp(-4.5, 4.5)` of
 * `getVelocity() / -350` released over 0.8s, and drives six cards
 * through `containerAnimation` triggers. Every one of those numbers and
 * mechanisms differs here. The only shared imports are utils/gsap (the
 * single registerPlugin point) and prefersReducedMotion, the same two
 * the Origin, Process and Two Worlds ports use.
 *
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * factory script registers no load refresh. `invalidateOnRefresh: true`
 * on the trigger is the original's own recalculation hook and is kept.
 *
 * Every numeric constant below is copied from the original.
 */

/* ── PACING ─────────────────────────────────────────
   FAC_TRACK_VH — extra viewport-heights the pin lasts while
   the strip drives across. */
const FAC_TRACK_VH = 170

const MAX_SKEW = 3 /* degrees — the strip leans into fast scrolls */

/**
 * @param {HTMLElement} section  #about-factory
 * @param {object} refs  { scrollEl, viewport, track }
 * @returns {(() => void) | undefined} cleanup
 */
export function buildFactoryStrip(section, refs) {
  const { scrollEl, viewport, track } = refs || {}
  // The original reads `section.querySelectorAll` before its own null
  // guard, which would throw if the section were missing; the guard set
  // is otherwise identical (section, scrollEl, viewport, track, frames).
  if (!section) return
  const frames = [].slice.call(section.querySelectorAll('.fac__frame'))
  if (!scrollEl || !viewport || !track || !frames.length) return

  if (prefersReducedMotion()) return
  // (static strip stays: a swipeable full-colour row, no pin)

  section.classList.add('fac--anim')
  scrollEl.style.height = (100 + FAC_TRACK_VH) + 'vh'

  // gsap.context owns the quickTo, the tween and its ScrollTrigger, so a
  // single revert() on unmount kills them and restores the inline styles.
  // The original never tears down — about.html simply ends — but in React
  // the section remounts on every return to /about, and a surviving
  // trigger would drive a detached track (the leak Phase 15 measured on
  // #originScroll and Phase 17 pre-empted on #worldsScroll).
  let live = -1
  const ctx = gsap.context(() => {
    const skewTo = gsap.quickTo(track, 'skewX', {
      duration: 0.5,
      ease: 'power3.out',
    })

    function setLive(i) {
      if (i === live) return
      if (live > -1) {
        frames[live].classList.remove('is-live')
        // Only the centre frame ever plays: park and rewind the
        // clip we are leaving (clips are optional — see the
        // TODO(motion) comments in the markup).
        const oldClip = frames[live].querySelector('.fac__motion')
        if (oldClip) {
          oldClip.pause()
          oldClip.currentTime = 0
        }
      }
      frames[i].classList.add('is-live')
      const newClip = frames[i].querySelector('.fac__motion')
      if (newClip) {
        const playing = newClip.play()
        if (playing && playing.catch) playing.catch(function () {})
      }
      live = i
    }
    setLive(0)

    // The strip waits until the stage is pinned, then drives the
    // full width of the track across the length of the pin.
    gsap.to(track, {
      x: function () {
        return -(track.scrollWidth - document.documentElement.clientWidth)
      },
      ease: 'none',
      scrollTrigger: {
        trigger: scrollEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          // lean with scroll velocity, spring back to plumb
          const lean = gsap.utils.clamp(
            -MAX_SKEW, MAX_SKEW, self.getVelocity() / -400
          )
          skewTo(lean)

          // the frame nearest viewport centre carries the colour
          const mid = window.innerWidth / 2
          let best = 0
          let bestDist = Infinity
          frames.forEach(function (f, i) {
            const r = f.getBoundingClientRect()
            const d = Math.abs(r.left + r.width / 2 - mid)
            if (d < bestDist) { bestDist = d; best = i }
          })
          setLive(best)
        },
      },
    })
  }, section)

  return function cleanup() {
    // revert() first, while the class and the track height are still
    // applied, so the trigger unwinds against the geometry it measured.
    ctx.revert()
    section.classList.remove('fac--anim')
    scrollEl.style.height = ''
    // `is-live` is applied imperatively by setLive(), so gsap.context
    // does not own it — a remount would otherwise start with a stale
    // frame already lit.
    frames.forEach(function (f) {
      f.classList.remove('is-live')
    })
    live = -1
  }
}

export default buildFactoryStrip
