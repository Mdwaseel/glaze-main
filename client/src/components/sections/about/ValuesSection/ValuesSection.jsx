import { useLayoutEffect, useRef } from 'react'
import { buildValuesDeck } from './valuesAnimation'
import './valuesSection.css'

/**
 * ValuesSection — port of about.html lines 3767-3852.
 *
 * Four dark cards on bone, one per value: mono index, the value set huge
 * in Playfair with a Bodoni-italic accent, one plain line, and a
 * full-height photograph.
 *
 * This markup IS the finished static state — all four cards stacked in
 * normal flow, fully readable — so touch, no-JS and reduced motion lose
 * nothing. Everything the deck adds (`values--anim`, the three
 * `.vcard__veil` divs, and every inline transform) is created by
 * valuesAnimation.js and reverted on cleanup; the component renders none
 * of it.
 *
 * ⚠ LAYOUT effect, matching Process (16), Two Worlds (17), Factory (19),
 * Manifesto (20) and People (21). about.html runs this script at parse
 * time, so `values--anim` — which switches all four cards to
 * `position: sticky` — and the `gsap.set(img, { scale: 1.12 })` priming
 * are both in place before the section is first painted. From a passive
 * effect React would paint the un-stacked static deck with unscaled
 * photographs and only then swap it.
 *
 * The page-level About hooks handle the rest with no wiring here:
 * `.fade-up` on the label, the four indices and the four bodies
 * (useAboutFadeReveal), and `js-word-reveal` on `#values-heading` plus
 * all four `.vcard__name` headings (useAboutWordReveal).
 */
export default function ValuesSection() {
  const sectionRef = useRef(null)
  const deckRef = useRef(null)

  useLayoutEffect(
    () => buildValuesDeck(sectionRef.current, deckRef.current),
    []
  )

  return (
    <section id="about-values" className="values" aria-labelledby="values-heading" ref={sectionRef}>
      <div className="values__inner">
        <p className="values__label fade-up">What We Build On</p>
        <h2 className="values__heading js-word-reveal" id="values-heading">
          Built on <em>four values.</em>
        </h2>

        {/* TODO(brochure): swap each one-line body for the exact
            brochure wording. Current lines stay factual and plain. */}
        <ul className="values__deck" id="valuesDeck" ref={deckRef}>

          <li className="vcard">
            <div className="vcard__text">
              <span className="vcard__index fade-up">01</span>
              <h3 className="vcard__name js-word-reveal">
                Durability that <em>endures.</em>
              </h3>
              <p className="vcard__body fade-up" style={{ '--reveal-delay': '0.1s' }}>
                Aluminium that shrugs off sun, salt and monsoon,
                season after season.
              </p>
            </div>
            <div className="vcard__media">
              <img src="/images/about/value-durability.webp"
                   alt="Monsoon rain beading on a bronze-finish aluminium window frame, hills beyond"
                   loading="lazy" />
            </div>
          </li>

          <li className="vcard" style={{ '--peek': '1.3rem' }}>
            <div className="vcard__text">
              <span className="vcard__index fade-up">02</span>
              <h3 className="vcard__name js-word-reveal">
                Low-maintenance <em>living.</em>
              </h3>
              <p className="vcard__body fade-up" style={{ '--reveal-delay': '0.1s' }}>
                No rot, no rust, no repainting. A wipe is all a
                Glaze frame ever asks.
              </p>
            </div>
            <div className="vcard__media">
              <img src="/images/about/value-lowmaintenance.webp"
                   alt="A calm living room behind slim black-framed sliding glass, morning light across the floor"
                   loading="lazy" />
            </div>
          </li>

          <li className="vcard" style={{ '--peek': '2.6rem' }}>
            <div className="vcard__text">
              <span className="vcard__index fade-up">03</span>
              <h3 className="vcard__name js-word-reveal">
                Design <em>versatility.</em>
              </h3>
              <p className="vcard__body fade-up" style={{ '--reveal-delay': '0.1s' }}>
                Slim sightlines, deep spans and a hundred finishes,
                at home in any architecture.
              </p>
            </div>
            <div className="vcard__media">
              {/* value-design, not value-versatility: the old file is still
                  the third photograph in the Contact page's enquiry media
                  stack, so it keeps its name and its portrait crop. */}
              <img src="/images/about/value-design.webp"
                   alt="Four houses in different architectural styles — concrete, timber, render and charred cladding — each glazed with the same slim black frames"
                   loading="lazy" />
            </div>
          </li>

          <li className="vcard" style={{ '--peek': '3.9rem' }}>
            <div className="vcard__text">
              <span className="vcard__index fade-up">04</span>
              <h3 className="vcard__name js-word-reveal">
                Eco-smart <em>engineering.</em>
              </h3>
              <p className="vcard__body fade-up" style={{ '--reveal-delay': '0.1s' }}>
                Endlessly recyclable metal, thermally broken to keep
                conditioned air where it belongs.
              </p>
            </div>
            <div className="vcard__media">
              <img src="/images/about/value-eco.webp"
                   alt="Low sun breaking through a tree canopy into a living room behind full-height glazing"
                   loading="lazy" />
            </div>
          </li>

        </ul>
      </div>
    </section>
  )
}
