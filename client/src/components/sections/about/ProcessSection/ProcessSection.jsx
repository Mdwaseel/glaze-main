import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resolveHref } from '@/utils/links'
import { buildProcessStage } from './processAnimation'
import './processSection.css'

/**
 * ProcessSection — port of about.html lines 1790-1995.
 *
 * The engagement walk-through: six step units on a constant warm-beige
 * ground, each the same template — full-height photograph left, editorial
 * panel right. This markup IS the finished static brochure spread; no JS,
 * small screens and reduced motion all read exactly as authored.
 *
 * At ≥861px processAnimation.js clones these six steps into a sticky
 * stage, hides them, and scrubs each slide up over the previous one. Every
 * runtime artefact of that (the .proc__stage subtree, the .proc--anim
 * class, the injected track height) is created by the controller and
 * removed again on cleanup — the component renders none of it.
 *
 * ⚠ LAYOUT effect, not a passive one (unlike OriginSection). about.html runs
 * this section's script at parse time, so the stage exists, the in-flow
 * steps are hidden and the 550vh track is set before the section is ever
 * painted. From a passive effect React paints the six full-height in-flow
 * steps — a ~4700px static spread — and only then swaps in the pinned deck.
 * Same reasoning as the Phase 14 fix to useAboutWordReveal.
 *
 * Effect ORDER is unchanged by that: layout effects and passive effects both
 * run child-before-parent, so useAboutWordReveal (a layout effect since
 * Phase 14) still builds #proc-heading's masks, and useAboutFadeReveal (a
 * parent passive effect) still observes after the stage exists — seeing the
 * stripped clones (unmatched) and the already-hidden in-flow steps, which is
 * the same net state about.html reaches by running its base script first.
 */
export default function ProcessSection() {
  const sectionRef = useRef(null)
  const runRef = useRef(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const cta = resolveHref('contact.html#enquiry', pathname)

  // The controller reaches the router through a ref so the effect never
  // re-runs (and never rebuilds the stage) when the location object changes.
  // It is handed the router-relative destination, NOT the rendered href —
  // the latter already carries the basename.
  const ctaClickRef = useRef(null)
  useEffect(() => {
    ctaClickRef.current = () => navigate(cta.to)
  })

  useLayoutEffect(
    () =>
      buildProcessStage(sectionRef.current, runRef.current, () =>
        ctaClickRef.current?.()
      ),
    []
  )

  return (
    <section id="about-process" className="proc" aria-labelledby="proc-heading" ref={sectionRef}>
      <div className="proc__intro">
        <p className="proc__label fade-up">How We Work</p>
        <h2 className="proc__heading js-word-reveal" id="proc-heading">
          Six steps,<br /><em>start to finish.</em>
        </h2>
      </div>

      {/* The run: in animated mode the script prepends the sticky
          .proc__stage — six complete slides (photograph + panel)
          stacked — turns this wrapper into the tall scroll track,
          and hides the in-flow steps; each slide then wipes up
          over the previous one on scroll. */}
      <div className="proc__run" ref={runRef}>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            <img src="/images/about/process/process-estimate.jpg"
                 alt="Two people talking through plans and figures at a desk"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              {/* Conversation, not a document — this step is now the meeting. */}
              <svg viewBox="0 0 24 24"><path d="M4 4.5h16v12H9.5L5 20.5v-4H4z" /><path d="M8 9h8M8 12.5h5" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 01 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Consultation</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              A realistic budget and timeline, from the first conversation.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              We meet on site, in our studio or over a call to understand
              the space, the light and how you live in it. You leave with a
              realistic budget and timeline.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            {/* Swapped from process-design.webp, which moved to step 03 with
                the drawings copy it actually depicts. */}
            <img src="/images/about/process/process-verify.webp"
                 alt="Two people checking floor plans and confirming measurements"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              {/* Dividers — already a measuring icon, and now on the
                  measuring step. */}
              <svg viewBox="0 0 24 24"><circle cx="12" cy="4.6" r="1.6" /><path d="M11.2 6.1 6 20M12.8 6.1 18 20" /><path d="M8.4 14.6a7.6 7.6 0 0 0 7.2 0" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 02 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Site Survey</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              Every opening laser-surveyed to the millimetre.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              Once the structure is ready, our engineers laser-survey every
              opening to the millimetre, and each frame is made for the exact
              wall it will sit in.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            <img src="/images/about/process/process-design.webp"
                 alt="A designer detailing production drawings on screen"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              {/* A drawing sheet with a dimension line, replacing the stacked
                  layers that belonged to the old material-selection step. */}
              <svg viewBox="0 0 24 24"><path d="M5 3.5h9l5 5v12H5z" /><path d="M14 3.5v5h5" /><path d="M8 17.5 15.5 10" /><path d="M8 13.5v4h4" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 03 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Design &amp; Drawings</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              Sightlines, finishes and hardware agreed before anything is made.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              Working alongside your architect and designer, we turn
              elevations into system drawings, so sightlines, finishes and
              hardware are agreed before anything is made.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            {/* ⚠ NOT factory-fabrication.jpg, the obvious pick — FactorySection
                already uses that exact file further down this same page, and
                the two would sit a few screens apart. factory-assembly.jpg is
                the closest unused shot and shows the assembly this step
                describes. */}
            <img src="/images/about/factory-assembly.jpg"
                 alt="Aluminium frame sections being assembled on the workshop bench"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              {/* Machining, replacing the clipboard-and-tick of the old
                  verification step. */}
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.1" /><path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20M6.3 6.3 8 8M16 16l1.7 1.7M17.7 6.3 16 8M8 16l-1.7 1.7" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 04 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Fabrication</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              Cut, machined and assembled in-house.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              Profiles are cut, machined and assembled in-house. Every unit
              is glazed, sealed and checked before it leaves the factory.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            <img src="/images/about/process/process-install.webp"
                 alt="A fitter seating a window sash into its frame on site"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" /><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 05 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Installation</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              Most installations are complete within the week.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              Our certified teams protect the site, set each frame level and
              true, and seal it to specification. Most installations are
              complete within the week.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      <article className="proc__step">
        <figure className="proc__media">
          <div className="proc__media-inner wipe-in">
            <img src="/images/about/process/process-handover.webp"
                 alt="A finished living room, its glazed doors and transoms opening onto a wooded deck"
                 loading="lazy" />
          </div>
        </figure>
        <div className="proc__panel">
          <div className="proc__heart">
            <span className="proc__icon fade-up" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3.2" /><path d="M11.2 12H20M16.8 12v3M19.4 12v2.2" /></svg>
            </span>
            <p className="proc__stepnum fade-up" style={{ '--reveal-delay': '0.06s' }}>Step 06 <span>/ 06</span></p>
            <h3 className="proc__title fade-up" style={{ '--reveal-delay': '0.12s' }}>Handover</h3>
            <span className="proc__rule fade-up" style={{ '--reveal-delay': '0.18s' }} aria-hidden="true"></span>
            <p className="proc__lede fade-up" style={{ '--reveal-delay': '0.22s' }}>
              Care guidance, warranty and one point of contact.
            </p>
            <p className="proc__copy fade-up" style={{ '--reveal-delay': '0.28s' }}>
              We walk through every opening and finish together. You receive
              care guidance, your warranty and a single point of contact for
              anything that comes up later.
            </p>
            <Link className="proc__cta fade-up" style={{ '--reveal-delay': '0.34s' }} to={cta.to} data-cursor-label="Plan">
              Plan your project <span className="proc__cta-arrow">&rarr;</span>
            </Link>
          </div>
        </div>
      </article>

      </div>
    </section>
  )
}
