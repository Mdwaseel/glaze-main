import { useLayoutEffect, useRef } from 'react'
import { buildPeopleHoverFx } from './peopleAnimation'
import './peopleSection.css'

/**
 * PeopleSection — port of about.html lines 3463-3575.
 *
 * Six large portraits in a deliberately uneven grid on bone. At rest each
 * card shows only its role; on hover the portrait warms to colour through
 * a circular glass-mask (clip-path) and the name plus a one-line quote
 * rise in. Everything is CSS; peopleAnimation.js only gates the fx mode.
 *
 * ⚠ SHIPPED PARKED. about.html carries the `hidden` attribute on this
 * <section>, with the note:
 *
 *   TEMPORARILY HIDDEN (stock placeholders, awaiting the real team
 *   shoot). To bring the team section back, delete the `hidden`
 *   attribute on this <section> — styles, markup and the hover script
 *   are all still wired and untouched.
 *
 * The attribute is reproduced exactly, and so is the rest of the wiring:
 * `.ppl[hidden] { display: none !important }` in the CSS, and the
 * `section.hidden` early return in the script. Removing `hidden` here is
 * the single change needed to bring the section back, exactly as on the
 * static page. Phase 13 recorded that it would be migrated hidden.
 *
 * ⚠ LAYOUT effect, matching Process (16), Two Worlds (17), Factory (19)
 * and Manifesto (20). about.html runs this script at parse time, so
 * `ppl--fx` — which flips the rest state to monochrome and hides the
 * names and lines — is applied before the section is first painted. From
 * a passive effect React would paint the full-colour spread and only then
 * flip it. Moot while the section is parked; correct the day it is not.
 *
 * The page-level About hooks handle the rest with no wiring here:
 * `.fade-up` / `.wipe-in` (useAboutFadeReveal), `js-word-reveal` on
 * `#ppl-heading` (useAboutWordReveal), and the grid's
 * `data-cursor-label="Meet"` (useCursorCompanion, delegated).
 */
export default function PeopleSection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => buildPeopleHoverFx(sectionRef.current), [])

  return (
    <section id="about-people" className="ppl" aria-labelledby="ppl-heading" hidden ref={sectionRef}>
      <div className="ppl__inner">
        <h2 className="ppl__heading js-word-reveal" id="ppl-heading">
          Meet the<br /><em>hands behind.</em>
        </h2>
        <p className="ppl__intro fade-up" style={{ '--reveal-delay': '0.15s' }}>
          A window passes through many hands before it disappears
          into a wall. These are some of them.
        </p>

        {/* TODO(people): real portraits and real names go here — the
            roles and the one-line quotes are the keepers. */}
        <div className="ppl__grid" data-cursor-label="Meet">

          <article className="ppl__card ppl__card--craftsman fade-up">
            <div className="ppl__media wipe-in">
              <img src="/images/about/people/craftsman.jpg"
                   alt="A craftsman lit against a dark workshop ground"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/craftsman.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Craftsman</span>
              <h3 className="ppl__name">Elias Brandt</h3>
              <p className="ppl__line">The corner should feel like one piece.
                I keep working until it does.</p>
            </div>
          </article>

          <article className="ppl__card ppl__card--engineer fade-up" style={{ '--reveal-delay': '0.1s' }}>
            <div className="ppl__media wipe-in" style={{ '--reveal-delay': '0.1s' }}>
              <img src="/images/about/people/engineer.jpg"
                   alt="An engineer working at a laptop on the test floor"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/engineer.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Engineer</span>
              <h3 className="ppl__name">Ana Barros</h3>
              <p className="ppl__line">I run the wind and water numbers before
                a single profile is cut.</p>
            </div>
          </article>

          <article className="ppl__card ppl__card--qa fade-up" style={{ '--reveal-delay': '0.2s' }}>
            <div className="ppl__media wipe-in" style={{ '--reveal-delay': '0.2s' }}>
              <img src="/images/about/people/qa.jpg"
                   alt="A close portrait behind clear safety glasses"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/qa.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Quality</span>
              <h3 className="ppl__name">Meera Pillai</h3>
              <p className="ppl__line">We inspect every profile before it leaves.</p>
            </div>
          </article>

          <article className="ppl__card ppl__card--designer fade-up">
            <div className="ppl__media wipe-in">
              <img src="/images/about/people/designer.jpg"
                   alt="A designer drawing over an architectural plan"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/designer.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Designer</span>
              <h3 className="ppl__name">Karan Mehta</h3>
              <p className="ppl__line">Most of my drawing time goes into what
                you will never notice.</p>
            </div>
          </article>

          <article className="ppl__card ppl__card--fabricator fade-up" style={{ '--reveal-delay': '0.1s' }}>
            <div className="ppl__media wipe-in" style={{ '--reveal-delay': '0.1s' }}>
              <img src="/images/about/people/fabricator.jpg"
                   alt="A fabricator welding a frame under blue sparks"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/fabricator.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Fabricator</span>
              <h3 className="ppl__name">Suresh Rao</h3>
              <p className="ppl__line">A clean weld disappears under the finish.
                That is the point.</p>
            </div>
          </article>

          <article className="ppl__card ppl__card--installer fade-up" style={{ '--reveal-delay': '0.2s' }}>
            <div className="ppl__media wipe-in" style={{ '--reveal-delay': '0.2s' }}>
              <img src="/images/about/people/installer.jpg"
                   alt="Two installers reading a plan on site"
                   loading="lazy" />
              <span className="ppl__colour" aria-hidden="true"
                    style={{ backgroundImage: "url('/images/about/people/installer.jpg')" }}></span>
            </div>
            <div className="ppl__meta">
              <span className="ppl__role">Installer</span>
              <h3 className="ppl__name">Rafiq Ahmed</h3>
              <p className="ppl__line">We measure the opening twice on site.
                The window only goes in once.</p>
            </div>
          </article>

        </div>
      </div>
    </section>
  )
}
