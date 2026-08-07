import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * The Ecosystem ledger's motion.
 *
 * Three things, and each one is tied to a structural element of the
 * layout rather than applied to it decoratively:
 *
 *   1. THE RULE DRAWS. Every entry is separated from the one above by a
 *      hairline, and that hairline is the entry's own opening gesture —
 *      it draws left to right as the entry arrives, so the eye is walked
 *      across the measure before it is given anything to read. This is
 *      why the rule is an element and not a `border-top`: a border cannot
 *      be scaled from one end.
 *
 *   2. THE COPY FOLLOWS THE RULE. Eyebrow, name, body and chips lift in
 *      behind it on a short stagger, so the entry assembles in the order
 *      it is read.
 *
 *   3. THE PLATE DRIFTS. A slow scrubbed parallax, ±18px across the whole
 *      passage. Enough to keep the figure alive against the type beside
 *      it; not enough to be caught doing it.
 *
 * ⚠ EVERY TRIGGER IS PER-ENTRY, NOT PER-SECTION. The ledger is several
 * viewports tall on a phone — one trigger on the section would fire the
 * fifth entry's reveal while it was still three screens below the fold,
 * and by the time it was reached it would already be over.
 *
 * ⚠ NOTHING HERE RUNS UNDER REDUCED MOTION. The caller checks and does not
 * build; the markup's resting state is the finished state, so the section
 * is complete without a frame of JS.
 */
export function buildEcosystemMotion(section) {
  const rows = gsap.utils.toArray(section.querySelectorAll('[data-eco-row]'))

  rows.forEach((row) => {
    const rule = row.querySelector('[data-eco-rule]')
    const lines = row.querySelectorAll('[data-eco-line]')
    const plate = row.querySelector('[data-eco-plate]')

    const tl = gsap.timeline({
      scrollTrigger: { trigger: row, start: 'top 82%', once: true },
      defaults: { ease: 'power3.out' },
    })

    if (rule) {
      tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power3.inOut' })
    }

    if (lines.length) {
      tl.from(lines, { y: 22, autoAlpha: 0, duration: 0.85, stagger: 0.07 }, '-=0.75')
    }

    if (plate) {
      tl.from(plate, { autoAlpha: 0, duration: 0.9 }, '-=0.85')

      /* The drift. `scrub: true` rather than a number: this is a
         positional relationship to the scroll, not an animation that
         happens to be triggered by it, so it should track the wheel
         exactly and never lag behind the type it sits beside. */
      gsap.fromTo(
        plate,
        { yPercent: -2.4 },
        {
          yPercent: 2.4,
          ease: 'none',
          scrollTrigger: {
            trigger: row,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      )
    }
  })

  return () => {
    /* useGSAP's context reverts the tweens; the ScrollTriggers created
       inside it go with them. This is here for the imperative call site
       that does not use a context. */
    ScrollTrigger.getAll().forEach((t) => {
      if (t.trigger && section.contains(t.trigger)) t.kill()
    })
  }
}

export default buildEcosystemMotion
