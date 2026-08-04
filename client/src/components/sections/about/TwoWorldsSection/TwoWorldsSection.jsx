import { useLayoutEffect, useRef } from 'react'
import { buildWorldsMoment } from './twoWorldsAnimation'
import './twoWorldsSection.css'

/**
 * TwoWorldsSection — port of about.html lines 2311-2350.
 *
 * The signature moment: a cool "Europe" panel and a warm "India" panel
 * that converge, merge along a glowing bronze seam, and open outward onto
 * one full-bleed image as "Global quality. Local soul." masks in.
 *
 * This markup IS the finished static state — the two graded panels side
 * by side with the merged image and its line below — so no JS, no GSAP
 * and reduced motion all read as a complete editorial spread. Everything
 * the moment adds (the `worlds--anim` class, the 350vh track height, and
 * every inline transform) is created by twoWorldsAnimation.js and
 * reverted on cleanup; the component renders none of it.
 *
 * ⚠ LAYOUT effect, matching ProcessSection. about.html runs this script at
 * parse time, so `worlds--anim` and the track height are in place before
 * the section is ever painted. From a passive effect React would paint the
 * static two-column spread — a 72vh row plus a 92vh image — and only then
 * swap it for the sticky single-viewport stage.
 *
 * Refs are used instead of the original's getElementById lookups, but the
 * ids are all still rendered: they are part of the authored markup, and
 * about.html's own script addresses the section through them.
 */
export default function TwoWorldsSection() {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const euRef = useRef(null)
  const inRef = useRef(null)
  const seamRef = useRef(null)
  const refractRef = useRef(null)
  const revealRef = useRef(null)
  const lineMainRef = useRef(null)
  const lineSoulRef = useRef(null)
  const lineNoteRef = useRef(null)

  useLayoutEffect(
    () =>
      buildWorldsMoment(sectionRef.current, {
        scrollEl: scrollRef.current,
        eu: euRef.current,
        india: inRef.current,
        seam: seamRef.current,
        refract: refractRef.current,
        reveal: revealRef.current,
        lineMain: lineMainRef.current,
        lineSoul: lineSoulRef.current,
        lineNote: lineNoteRef.current,
      }),
    []
  )

  return (
    <section id="about-worlds" className="worlds" aria-label="European precision, Indian soul" ref={sectionRef}>
      <div className="worlds__scroll" id="worldsScroll" ref={scrollRef}>
        <div className="worlds__stage" id="worldsStage">

          <figure className="worlds__half worlds__half--eu" id="worldsEu" ref={euRef}>
            <img src="/images/about/worlds-europe.webp"
                 alt="A precise woven-metal building facade in cool northern light" />
            <span className="worlds__grade" aria-hidden="true"></span>
            <figcaption>
              <span className="worlds__region">Europe</span>
              <p className="worlds__trait">Precision.<br />Minimalism.</p>
            </figcaption>
          </figure>

          <figure className="worlds__half worlds__half--in" id="worldsIn" ref={inRef}>
            <img src="/images/about/worlds-india.webp"
                 alt="A warmly lit modern Indian home glowing at dusk" />
            <span className="worlds__grade" aria-hidden="true"></span>
            <figcaption>
              <span className="worlds__region">India</span>
              <p className="worlds__trait">Light.<br />Life in every season.</p>
            </figcaption>
          </figure>

          <div className="worlds__refract" id="worldsRefract" aria-hidden="true" ref={refractRef}></div>
          <div className="worlds__seam" id="worldsSeam" aria-hidden="true" ref={seamRef}></div>

          <figure className="worlds__reveal" id="worldsReveal" ref={revealRef}>
            <img src="/images/about/worlds-merged.webp"
                 alt="Floor-to-ceiling aluminium glass doors opening a warm Indian living room to the light" />
            <figcaption className="worlds__line">
              <span className="worlds__line-mask"><span className="worlds__line-main" id="worldsLineMain" ref={lineMainRef}>Global quality.</span></span>
              <span className="worlds__line-mask"><em className="worlds__line-soul" id="worldsLineSoul" ref={lineSoulRef}>Local soul.</em></span>
              <span className="worlds__line-note" id="worldsLineNote" ref={lineNoteRef}>One window. Two worlds.</span>
            </figcaption>
          </figure>

        </div>
      </div>
    </section>
  )
}
