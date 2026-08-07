import { useEffect, useRef } from 'react'
import { buildOriginFlight } from './originAnimation'
import './originSection.css'

/**
 * OriginSection — port of about.html lines 1320-1418.
 *
 * Thirty-seven years in the metal: an intro text block and four milestone
 * figures, flown through as depth planes inside a 450vh pinned track.
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

            {/* Four milestone snapshots, one plane each in the depth
                flight (the camera passes them in DOM order). Each
                carries its year / title / one-line note: beside the
                image in the flight (--tr text right · --tl text
                left — the side the era leans toward, away from the
                centre corridor the thread runs through), below the
                image in the static strip.

                The photographs are commissioned Glaze shots and they
                are what fixes the count at four — there was a fifth
                era here ("2020 · New Facility", a stock production
                hall) with nothing to show for it, and the 2010 frame
                is that purpose-built plant anyway. One beat per
                photograph reads truer than a milestone propped up by
                a borrowed image.

                No width/height attributes on these imgs, deliberately.
                The usual CLS argument does not apply — originSection.css
                already pins the frame with `aspect-ratio: 4 / 3`, so the
                box is known before the file lands. Worse, the attributes
                actively break it: the page's only img reset
                (styles/about-global.css, `:where(.page-about) img`) sets
                max-width and display but never `height: auto`, so
                `height="1086"` survives as a presentational hint, and an
                element with both a used width and height ignores
                aspect-ratio. The photograph renders 1086px tall inside a
                445px plane. */}
            <div className="origin__eras" id="originEras" ref={erasRef}>
              <figure className="origin__era origin__era--tr" data-year="1989">
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-1989.webp"
                       alt="A fabricator checking an aluminium window profile with a micrometer in the early workshop"
                       loading="lazy" decoding="async" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">1989</span>
                  <span className="origin__era-title">Foundation</span>
                  <span className="origin__era-copy">One workshop in Hyderabad, extruding aluminium and measuring every section by hand.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tl" data-year="2001" style={{ '--reveal-delay': '0.08s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-2001.webp"
                       alt="Fabricators assembling window frames along racks of aluminium profiles on the fabrication floor"
                       loading="lazy" decoding="async" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2001</span>
                  <span className="origin__era-title">Expansion</span>
                  <span className="origin__era-copy">The workshop becomes a fabrication floor — racked stock, assembly bays, a full team.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tr" data-year="2010" style={{ '--reveal-delay': '0.16s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-2010.webp"
                       alt="A line of CNC machining centres cutting aluminium profiles in the modern plant"
                       loading="lazy" decoding="async" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2010</span>
                  <span className="origin__era-title">Automation</span>
                  <span className="origin__era-copy">CNC lines take the repetitive work under one purpose-built roof; tolerances tighten to the millimetre.</span>
                </figcaption>
              </figure>
              <figure className="origin__era origin__era--tl" data-year="2026" style={{ '--reveal-delay': '0.24s' }}>
                <div className="origin__era-media wipe-in">
                  <img src="/images/about/origin-2026.webp"
                       alt="Slim-framed sliding glass opening a living room onto a courtyard garden"
                       loading="lazy" decoding="async" />
                </div>
                <figcaption className="origin__era-text fade-up">
                  <span className="origin__year">2026</span>
                  <span className="origin__era-title">Today</span>
                  <span className="origin__era-copy">Everything the metal has learned, turned to glass — and to the rooms it opens.</span>
                </figcaption>
              </figure>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
