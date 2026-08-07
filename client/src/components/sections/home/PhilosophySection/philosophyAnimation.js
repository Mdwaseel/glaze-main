import { gsap, ScrollTrigger } from '@/utils/gsap'
import { readCountTarget, readDecimals, setFinalCount } from '@/utils/counters'

/**
 * Philosophy reveal sequence — verbatim port of the GSAP script in
 * hero.html (lines 4534-4656).
 *
 * Every duration, easing, position parameter and stagger below is copied
 * from the original. The position strings ('<', '-=0.3', '-=0.95') are
 * what make the steps overlap; changing one changes the whole rhythm.
 *
 * Two departures from hero.html:
 *
 *   · The original opened on an eyebrow tween the headline hung off at
 *     '-=0.4'. The eyebrow is gone, so the headline opens the timeline
 *     outright.
 *   · The whole sequence is played at 1.55x — see the note on
 *     `tl.timeScale` below. The composed rhythm is untouched; only the
 *     rate it runs at changed, because 3.2s was long enough that a
 *     visitor scrolling normally never saw the end of it.
 *
 * Deliberately NOT using useCountUp here: the base script excludes
 * `.philosophy` from its IntersectionObserver count-up precisely because
 * these numbers are driven by the timeline below, on a different easing
 * (power2.out over 1.2s vs easeOutQuart over 1.6s). Wiring the shared
 * hook in would animate them twice, on the wrong curve.
 */

/**
 * Rest state: final numbers, no movement. Used when the user prefers
 * reduced motion — everything else is already visible in the markup.
 */
export function setFinalNumbers(section) {
  const values = section.querySelectorAll('.philosophy__stat-value')
  Array.prototype.forEach.call(values, setFinalCount)
}

/**
 * Build the intro timeline and the scroll-scrubbed accent fade.
 * Call inside a useGSAP/gsap.context scope so both are reverted on unmount.
 */
export function buildPhilosophyAnimation(section) {
  const values = section.querySelectorAll('.philosophy__stat-value')

  const headline = section.querySelector('[data-anim="headline"]')
  const accent = section.querySelector('[data-anim="accent"]')
  const para = section.querySelector('[data-anim="para"]')
  const divider = section.querySelector('[data-anim="divider"]')
  const labels = section.querySelectorAll('[data-anim="label"]')

  // Gate the scroll-fade so it only takes over once the intro is done.
  let introDone = false

  // Calm, premium defaults — power easing only, no bounce/elastic.
  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: {
      trigger: section,
      start: 'top 70%', // fires once 30% of the section is in view
      once: true,
    },
    onComplete: function () {
      introDone = true
    },
  })

  /* ⚠ THE RHYTHM IS SCALED, NOT REWRITTEN, AND THAT IS THE WHOLE REASON
     THIS IS ONE LINE INSTEAD OF TEN EDITS.

     As authored the sequence ran 3.20s from trigger to last label — long
     enough that a visitor scrolling at any normal speed met it still in
     flight, which is what reads as "slow". It needed to come down, but
     every duration below is entangled with a position string ('-=0.3',
     '-=0.2', '-=0.95') and those strings are ABSOLUTE seconds, not
     fractions. Halving the durations by hand while leaving them alone
     would leave a 0.95s overlap sitting on a 0.6s tween — the labels
     would start before the counters, and the steps would collapse into
     each other rather than following one another.

     timeScale multiplies the durations AND the offsets by the same
     factor, so every overlap keeps its proportion and the choreography
     is exactly the one that was authored, just played faster. The
     numbers written below stay honest as the composed rhythm; this is
     the playback rate.

     1.55 puts the sequence at ~2.06s: the counters land in 0.77s, which
     still reads as counting rather than as a number appearing. Past
     about 1.8 they stop counting and start flickering. */
  tl.timeScale(1.55)

  // 1 — Headline fades up. It opens the timeline now that the eyebrow is
  // gone; leaving the old tween in place with a null target would have kept
  // its 0.8s slot on the timeline (a no-target tween still holds its
  // duration), so the '-=0.4' below would have opened on 0.4s of nothing.
  tl.from(headline, { y: 40, opacity: 0, duration: 1 })

  // 2 — The word "disappear." lifts in 0.2s after the headline starts
  tl.from(
    accent,
    { y: 10, opacity: 0, duration: 0.8, ease: 'power2.out', delay: 0.2 },
    '<'
  )

  // 3 — Supporting paragraph
  tl.from(para, { y: 20, opacity: 0, duration: 0.8 }, '-=0.3')

  // 4 — Divider grows from left to right
  tl.from(divider, { scaleX: 0, duration: 0.8, ease: 'power2.out' }, '-=0.2')

  // 5 — Performance numbers count up together (1.2s)
  Array.prototype.forEach.call(values, function (el, i) {
    const to = readCountTarget(el)
    const dec = readDecimals(el)
    const proxy = { v: 0 }
    tl.to(
      proxy,
      {
        v: to,
        duration: 1.2,
        ease: 'power2.out',
        onUpdate: function () {
          el.textContent = proxy.v.toFixed(dec)
        },
      },
      i === 0 ? '-=0.1' : '<'
    )
  })

  // 6 — Metric labels fade in one after another (0.1s stagger)
  tl.from(
    labels,
    { y: 10, opacity: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out' },
    '-=0.95'
  )

  // ── Scroll interaction ───────────────────────────────
  // As the section scrolls past, "disappear." eases to 40% opacity at
  // the midpoint and returns to 100% before leaving. Subtle; the
  // headline itself never moves.
  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: function (self) {
      if (!introDone) return
      // sine curve: 1 → 0.4 → 1 across the section
      const o = 1 - 0.6 * Math.sin(self.progress * Math.PI)
      gsap.set(accent, { opacity: o })
    },
  })

  return tl
}
