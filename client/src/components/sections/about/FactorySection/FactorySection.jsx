import { useLayoutEffect, useRef } from 'react'
import { buildFactoryStrip } from './factoryAnimation'
import './factorySection.css'

/**
 * FactorySection — port of about.html lines 2983-3084.
 *
 * The Hyderabad facility: five production-zone frames — profile stock,
 * cutting, fabrication, glazing, dispatch — that drive sideways while the
 * stage is pinned, the one nearest viewport centre carrying full colour.
 *
 * This markup IS the finished static state: a natively swipeable,
 * snap-aligned row in full colour with no pin, so no JS and reduced
 * motion both read as a complete strip. Everything the moment adds (the
 * `fac--anim` class, the 270vh track height, `is-live`, the track
 * transform and skew) is created by factoryAnimation.js and reverted on
 * cleanup; the component renders none of it.
 *
 * ⚠ LAYOUT effect, matching ProcessSection and TwoWorldsSection.
 * about.html runs this script at parse time, so `fac--anim` — which
 * zeroes the section padding, flips `overflow` to visible and makes the
 * stage sticky — plus the injected track height are all in place before
 * the section is ever painted. From a passive effect React would paint
 * the padded static strip first and only then swap in the pinned stage.
 *
 * The counter (`data-count-to="50000" data-format="comma"`), the heading
 * curtain (`js-word-reveal`), the intro's `.fade-up` and the viewport's
 * `data-cursor-label` are all handled by the page-level About hooks
 * mounted in About.jsx — this section wires none of them.
 */
export default function FactorySection() {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const viewportRef = useRef(null)
  const trackRef = useRef(null)

  useLayoutEffect(
    () =>
      buildFactoryStrip(sectionRef.current, {
        scrollEl: scrollRef.current,
        viewport: viewportRef.current,
        track: trackRef.current,
      }),
    []
  )

  return (
    <section id="about-factory" className="fac" aria-labelledby="fac-title" ref={sectionRef}>
      <div className="fac__scroll" id="facScroll" ref={scrollRef}>
        <div className="fac__stage">

      <div className="fac__head">
        <div>
          <h2 className="fac__title js-word-reveal" id="fac-title">
            Hyderabad.<br />
            <em><span data-count-to="50000" data-format="comma">50,000</span> sq ft.</em>
          </h2>
          {/* TODO(brochure): confirm the facility line against the brochure copy */}
          <p className="fac__intro fade-up">
            Every Glaze system is cut, fabricated, glazed and checked
            under one roof — five zones, one standard.
          </p>
        </div>
      </div>

      <div className="fac__viewport" id="facViewport" data-cursor-label="Explore" ref={viewportRef}>
        <div className="fac__track" id="facTrack" ref={trackRef}>

          <figure className="fac__frame" data-zone="Profile Stock">
            <img src="/images/about/factory-profiles.jpg"
                 alt="Racks of wrapped aluminium profiles in the stores" />
            {/* TODO(motion): zone 01 clip — a stacker moving down the
                profile aisle. Shoot a 4–6s loop, save it as
                videos/about/factory-profiles.mp4 and uncomment:
            <video class="fac__motion" src="videos/about/factory-profiles.mp4"
                   muted loop playsinline preload="none" aria-hidden="true"></video>
            */}
            <figcaption className="fac__zone">
              <span className="fac__zone-index">01</span>
              <span className="fac__zone-name">Profile Stock</span>
            </figcaption>
          </figure>

          <figure className="fac__frame" data-zone="Precision Cutting">
            <img src="/images/about/factory-cutting-line.jpg"
                 alt="The cutting line running aluminium profiles to length" />
            {/* TODO(motion): zone 02 clip — the cutter head running
                through a profile. Save as
                videos/about/factory-cutting.mp4 and uncomment:
            <video class="fac__motion" src="videos/about/factory-cutting.mp4"
                   muted loop playsinline preload="none" aria-hidden="true"></video>
            */}
            <figcaption className="fac__zone">
              <span className="fac__zone-index">02</span>
              <span className="fac__zone-name">Precision Cutting</span>
            </figcaption>
          </figure>

          <figure className="fac__frame" data-zone="Fabrication &amp; Assembly">
            <img src="/images/about/factory-fabrication.jpg"
                 alt="Fabricators assembling hardware on the shop floor" />
            {/* TODO(motion): zone 03 clip — hands fitting hardware on
                the assembly bench. Save as
                videos/about/factory-assembly.mp4 and uncomment:
            <video class="fac__motion" src="videos/about/factory-assembly.mp4"
                   muted loop playsinline preload="none" aria-hidden="true"></video>
            */}
            <figcaption className="fac__zone">
              <span className="fac__zone-index">03</span>
              <span className="fac__zone-name">Fabrication &amp; Assembly</span>
            </figcaption>
          </figure>

          <figure className="fac__frame" data-zone="Glazing">
            <img src="/images/about/factory-glazing.jpg"
                 alt="Glass packs staged on A-frames before glazing" />
            {/* TODO(motion): zone 04 clip — a glass unit being lifted
                onto the glazing bench. Save as
                videos/about/factory-glazing.mp4 and uncomment:
            <video class="fac__motion" src="videos/about/factory-glazing.mp4"
                   muted loop playsinline preload="none" aria-hidden="true"></video>
            */}
            <figcaption className="fac__zone">
              <span className="fac__zone-index">04</span>
              <span className="fac__zone-name">Glazing</span>
            </figcaption>
          </figure>

          <figure className="fac__frame" data-zone="Quality &amp; Dispatch">
            <img src="/images/about/factory-dispatch.jpg"
                 alt="Finished frames wrapped and laid out for final checks" />
            {/* TODO(motion): zone 05 clip — a finished frame being
                wrapped for dispatch. Save as
                videos/about/factory-dispatch.mp4 and uncomment:
            <video class="fac__motion" src="videos/about/factory-dispatch.mp4"
                   muted loop playsinline preload="none" aria-hidden="true"></video>
            */}
            <figcaption className="fac__zone">
              <span className="fac__zone-index">05</span>
              <span className="fac__zone-name">Quality &amp; Dispatch</span>
            </figcaption>
          </figure>

        </div>
      </div>

        </div>
      </div>
    </section>
  )
}
