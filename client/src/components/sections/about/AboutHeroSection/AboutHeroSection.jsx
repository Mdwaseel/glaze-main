import { useEffect, useRef } from 'react'
import { initAboutHeroReveal, initAboutHeroDepth } from './aboutHeroAnimation'
import './aboutHeroSection.css'

/**
 * AboutHeroSection — port of about.html lines 950-995.
 *
 * Kinetic manifesto over a factory photograph, with a drifting dust
 * layer and a cursor-following glint. No video, no canvas, no GSAP.
 *
 * The heading carries [data-manual-reveal]: the page-level About reveal
 * system builds its character masks but deliberately does not observe it,
 * so this section can hold the assembly until the preloader curtain
 * clears. All animation lives in aboutHeroAnimation.js.
 */
export default function AboutHeroSection() {
  const sectionRef = useRef(null)
  const dustRef = useRef(null)
  const glintRef = useRef(null)
  const titleRef = useRef(null)

  // Passive effect on purpose. The page's useAboutWordReveal runs as a
  // LAYOUT effect, and every layout effect in a commit completes before
  // any passive effect, so the character masks this reveal re-times are
  // guaranteed to exist by the time this runs. (In the original, the base
  // script simply appears above the hero script in the document.)
  useEffect(() => initAboutHeroReveal(titleRef.current), [])

  useEffect(
    () => initAboutHeroDepth(sectionRef.current, dustRef.current, glintRef.current),
    []
  )

  return (
    <section id="about-hero" className="ahero" aria-label="About Glaze" ref={sectionRef}>
      {/* Real factory photograph (compressed from images/Glaze
          Factory.png — keep the original as the master). Decorative
          here; the section carries the accessible name. */}
      <div className="ahero__photo" aria-hidden="true">
        <img
          src="/images/about/factory-hero.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
        />
      </div>

      <div className="ahero__dust" id="aheroDust" aria-hidden="true" ref={dustRef}>
        <span className="ahero__mote"></span>
        <span className="ahero__mote"></span>
        <span className="ahero__mote"></span>
        <span className="ahero__mote"></span>
        <span className="ahero__mote"></span>
        <span className="ahero__mote"></span>
      </div>

      <div className="ahero__glint" id="aheroGlint" aria-hidden="true" ref={glintRef}></div>

      <div className="ahero__content">
        <span className="ahero__eyebrow">About Glaze</span>

        {/* data-manual-reveal: the shared observer builds the word masks
            but leaves the trigger to the hero script, so the assembly
            waits for the preloader curtain instead of racing it. */}
        {/* `data-manual-reveal=""` (not bare) so React serialises the empty
            string the HTML parser produces, rather than "true". Presence is
            all useAboutWordReveal tests, so this is exactness, not behaviour
            — the Phase 26 audit caught the value drift. Same convention as
            `data-draw=""` in §08 Numbers. */}
        <h1 className="ahero__title js-word-reveal" data-manual-reveal="" id="aheroTitle" ref={titleRef}>
          The Sound of Silence.<br />
          <em>The Strength of Design.</em>
        </h1>

        <p className="ahero__sub">
          The story of a window company that would
          rather you noticed the view.
        </p>
      </div>

      <div className="ahero__scroll" aria-hidden="true">
        <div className="ahero__scroll-mouse"></div>
        <span className="ahero__scroll-label">Scroll</span>
      </div>
    </section>
  )
}
