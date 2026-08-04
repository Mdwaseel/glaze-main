import { useLayoutEffect, useRef } from 'react'
import { buildCodaBeat } from './codaAnimation'
import './codaSection.css'

/**
 * CodaSection — port of about.html lines 4220-4225.
 *
 * A quiet closing beat, not a full section: one dark viewport of negative
 * space holding a two-line quote.
 *
 * This markup IS the finished static state — the quote fully visible, no
 * fade — so no JS and reduced motion both read it plainly. Everything the
 * beat adds (`coda--anim`, the curtain offsets, the dissolve's
 * `autoAlpha` and the section's animated `backgroundColor`) is created by
 * codaAnimation.js and reverted on cleanup; the component renders none of
 * it.
 *
 * ⚠ LAYOUT effect, matching Process (16), Two Worlds (17), Factory (19),
 * Manifesto (20), People (21), Values (22) and Numbers (23). about.html
 * runs this script at parse time, so `coda--anim` — which drops both
 * lines to `translateY(115%)` inside their masks — is applied before the
 * section is first painted. From a passive effect React would paint the
 * quote at rest and only then hide it behind its masks.
 *
 * The section carries no `.fade-up`, no `js-word-reveal` and no
 * `[data-count-to]`, so no page-level About hook touches it.
 */
export default function CodaSection() {
  const sectionRef = useRef(null)
  const innerRef = useRef(null)
  const mainRef = useRef(null)
  const soulRef = useRef(null)

  useLayoutEffect(
    () =>
      buildCodaBeat(sectionRef.current, {
        inner: innerRef.current,
        main: mainRef.current,
        soul: soulRef.current,
      }),
    []
  )

  return (
    <section id="about-coda" className="coda" aria-label="We engineer clarity" ref={sectionRef}>
      <blockquote className="coda__inner" id="codaInner" ref={innerRef}>
        <span className="coda__mask"><span className="coda__main" id="codaMain" ref={mainRef}>We don&apos;t manufacture windows.</span></span>
        <span className="coda__mask"><em className="coda__soul" id="codaSoul" ref={soulRef}>We engineer clarity.</em></span>
      </blockquote>
    </section>
  )
}
