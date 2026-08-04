import { useEffect, useRef } from 'react'
import { buildOriginFlight } from './originAnimation'
import './originSection.css'

/**
 * OriginSection — port of about.html lines 1320-1418.
 *
 * Thirty-seven years in the metal: an intro text block and five milestone
 * figures, flown through as depth planes inside a 520vh pinned track.
 * With reduced motion (or no GSAP) the markup stays exactly as authored —
 * a static archive strip revealed by the page's own .fade-up / .wipe-in
 * system. Every runtime artefact of the flight (the atmosphere wash, the
 * thread SVG, the .origin--anim class, the injected track height) is
 * created by originAnimation.js and removed again on cleanup.
 *
 * Passive effect, like AboutHeroSection: the page's useAboutWordReveal is
 * a layout effect, so #origin-heading's character masks already exist —
 * which matters because the flight strips the reveal primitives off the
 * era figures and must see the authored classes to restore them.
 */
export default function OriginSection() {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const textRef = useRef(null)
  const erasRef = useRef(null)

  useEffect(
    () =>
      buildOriginFlight(sectionRef.current, {
        scrollEl: scrollRef.current,
        textEl: textRef.current,
        erasWrap: erasRef.current,
      }),
    []
  )

  return (
    <section id="about-origin" className="origin" aria-labelledby="origin-heading" ref={sectionRef}>
      <div className="origin__scroll" id="originScroll" ref={scrollRef}>
        <div className="origin__stage">

          <div className="origin__inner">
            <div className="origin__text" id="originText" ref={textRef}>
              <p className="origin__label fade-up">Our Origin</p>
              <h2 className="origin__heading js-word-reveal" id="origin-heading">
                Thirty-seven years<br /><em>in the metal.</em>
              </h2>
              {/* Was "Sagar Asia has been extruding… Glaze is what happened
                  when that experience turned to windows and doors." The
                  parent-company framing is gone at the client's request, so
                  the 1989 heritage is now Glaze's own — which is also what
                  the section heading ("Thirty-seven years in the metal")
                  already claimed. */}
              <p className="origin__copy fade-up" style={{ '--reveal-delay': '0.15s' }}>
                Glaze has been extruding and engineering aluminium in
                Hyderabad since 1989 — experience that turned, in time,
                to windows and doors.
              </p>
              {/* In animated mode this whole text block becomes the
                  first plane of the depth flight; the thread SVG
                  is appended to the stage by the script. Static
                  pages carry no trace of either. */}

            </div>

            {/* Five milestone snapshots, one plane each in the depth
                flight (the camera passes them in DOM order). Each
                carries its year / title / one-line note: beside the
                image in the flight (--tr text right · --tl text
                left — the side the era leans toward, away from the
                centre corridor the thread runs through), below the
                image in the static strip.
                TODO(archive): swap all five for real Glaze archive
                photographs, keeping the same filenames.
                TODO(copy): confirm the one-line era notes. */}
            <div className="origin__eras" id="originEras" ref={erasRef}>
              <figure className="origin__era origin__era--tr" data-year="1989">
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-1989.jpg"
                       alt="A machinist working a lathe in the early workshop years"
                       loading="lazy" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">1989</span>
                  <span className="origin__era-title">Foundation</span>
                  <span className="origin__era-copy">Glaze begins extruding and engineering aluminium in Hyderabad.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tl" data-year="2001" style={{ '--reveal-delay': '0.08s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-craft.webp"
                       alt="Sparks from aluminium fabrication on the workshop floor"
                       loading="lazy" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2001</span>
                  <span className="origin__era-title">Expansion</span>
                  <span className="origin__era-copy">The workshop grows into a full fabrication floor.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tr" data-year="2010" style={{ '--reveal-delay': '0.16s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-automation.jpg"
                       alt="Robotic arms working a production line"
                       loading="lazy" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2010</span>
                  <span className="origin__era-title">Automation</span>
                  <span className="origin__era-copy">Automated lines take over the repetitive work; tolerances tighten.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tl" data-year="2020" style={{ '--reveal-delay': '0.24s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-facility.jpg"
                       alt="A vast steel-framed production hall"
                       loading="lazy" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2020</span>
                  <span className="origin__era-title">New Facility</span>
                  <span className="origin__era-copy">A purpose-built plant brings extrusion, finishing and assembly under one roof.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tr" data-year="2026" style={{ '--reveal-delay': '0.32s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-now.webp"
                       alt="Modern glass towers rising against the sky"
                       loading="lazy" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2026</span>
                  <span className="origin__era-title">GLAZE</span>
                  <span className="origin__era-copy">The window brand &mdash; everything the metal has learned, turned to glass.</span>
                </figcaption>
              </figure>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
