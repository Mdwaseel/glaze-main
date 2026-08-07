import { useLayoutEffect, useRef } from 'react'
import { SERIES, SERIES_OPTION_ORDER } from '@/data/systems'
import { useCatalogue } from '@/context/CatalogueContext'
import { initSystemEnquiry } from './systemEnquiryController'
import './systemEnquirySection.css'

/**
 * SystemEnquirySection — port of products/sliding.html lines 2854-3066.
 *
 * Two columns on a bronze-washed black ground: the standing spec sheet
 * that mirrors whatever the visitor configured further up the page, and
 * the three-step form beside it.
 *
 * ⚠ THE ONLY PER-SYSTEM VALUE is the system name — in `#specSystem`, and
 * as the selected `<option>` of the System select. Both are set from the
 * shared spec by the controller on mount, but they are also rendered
 * correctly here so the section is right before any script runs, exactly
 * as each original ships it hard-coded.
 *
 * ⚠ THIS IS NOT CONTACT'S ENQUIRY FORM. Contact §02 (`.msf*` inside a
 * `.enq` card) is a four-step form that POSTS to FormSubmit. This one
 * (`.enq__*`) is a three-step form with attribution that logs its
 * payload. They share two class names, `.enq` and `.enq__inner`, which is
 * why both sheets carry mutually exclusive page scopes — see the header
 * of systemEnquirySection.css.
 *
 * ⚠ LAYOUT effect: `render()` hides two of the three panes and both of
 * the two inactive action buttons. From a passive effect the browser
 * would paint all three panes stacked first.
 *
 * The `<select>`s are UNCONTROLLED with `defaultValue`, so the controller
 * can write `select.value` directly the way the original does.
 */
export default function SystemEnquirySection({ system }) {
  const sectionRef = useRef(null)
  const { systems } = useCatalogue()

  const variants = system.variants || []
  // Re-initialised when the SET of options changes, not only when the route
  // does — the catalogue provider paints the shipped set first and swaps in
  // the live one, and this controller caches the select elements.
  const signature = `${system.slug}:${systems.map((s) => s.slug).join(',')}:${
    variants.map((v) => v.id).join(',')}`

  useLayoutEffect(() => initSystemEnquiry(sectionRef.current), [signature])

  return (
    <section className="enq" id="contact" aria-labelledby="enq-title" ref={sectionRef}>
      <div className="enq__inner">
        <h2 className="sec-title enq__title" id="enq-title" data-curtain>
          Tell us what you are <em>building.</em>
        </h2>
        <p className="enq__sub" data-reveal>
          Three short steps. Whatever you configured on this page comes
          with the enquiry, so the first call starts where you left off.
        </p>

        <div className="enq__grid">

          <aside className="enq__spec" aria-label="Your configuration so far" data-reveal>
            <p className="enq__spec-title">Your configuration</p>
            <div className="enq__spec-list">
              <div className="enq__spec-row">
                <span className="enq__spec-key">System</span>
                <span className="enq__spec-val" id="specSystem">{system.name}</span>
              </div>
              {/* ⚠ NOT IN THE ORIGINALS. `spec.variant` was the one slot of
                  the five-layer attribution store that nothing ever wrote —
                  there was no section to write it. §04 Variants is that
                  section, and there is now a Variant control in the form
                  below as well, so this row fills from either. Empty until
                  the visitor picks one, exactly like Profile series. */}
              <div className="enq__spec-row">
                <span className="enq__spec-key">Variant</span>
                <span className="enq__spec-val is-empty" id="specVariant">Not chosen yet</span>
              </div>
              <div className="enq__spec-row">
                <span className="enq__spec-key">Profile series</span>
                <span className="enq__spec-val is-empty" id="specSeries">Not chosen yet</span>
              </div>
              <div className="enq__spec-row">
                <span className="enq__spec-key">Glass</span>
                <span className="enq__spec-val" id="specGlass">Clear</span>
              </div>
              <div className="enq__spec-row">
                <span className="enq__spec-key">Frame finish</span>
                <span className="enq__spec-val" id="specFinish">Champagne Bronze</span>
              </div>
            </div>
            <p className="enq__spec-note">
              Every selection you make above lands here, and travels with
              the enquiry to the specifier who calls you.
            </p>
          </aside>

          <form className="enq__form" id="enqForm" noValidate>

            {/* Step rail: dots fill as steps complete, links wipe between them */}
            <div className="enq__rail" id="enqRail" role="list" aria-label="Enquiry progress">
              <div className="enq__step is-current" data-rail="1" role="listitem">
                <span className="enq__step-dot">1</span>
                <span className="enq__step-name">Project</span>
              </div>
              <span className="enq__link" data-link="1" aria-hidden="true"></span>
              <div className="enq__step" data-rail="2" role="listitem">
                <span className="enq__step-dot">2</span>
                <span className="enq__step-name">Configuration</span>
              </div>
              <span className="enq__link" data-link="2" aria-hidden="true"></span>
              <div className="enq__step" data-rail="3" role="listitem">
                <span className="enq__step-dot">3</span>
                <span className="enq__step-name">Brief</span>
              </div>
            </div>

            <div className="enq__panes" id="enqPanes">

              {/* Step 1 */}
              <fieldset className="enq__pane is-live" data-step="1">
                <legend className="enq__legend">Who we are speaking to</legend>
                <p className="enq__pane-note">
                  So we can put a name and a place to the drawings.
                </p>
                <div className="enq__fields">
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fName">Name <span>*</span></label>
                    <input className="enq__input" id="fName" name="name" type="text" placeholder="Your full name" required autoComplete="name" />
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fPhone">Phone <span>*</span></label>
                    <input className="enq__input" id="fPhone" name="phone" type="tel" placeholder="+91" required autoComplete="tel" />
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fEmail">Email <span>*</span></label>
                    <input className="enq__input" id="fEmail" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fCity">City</label>
                    <input className="enq__input" id="fCity" name="city" type="text" placeholder="Where is the project?" autoComplete="address-level2" />
                    <span className="enq__err" data-err></span>
                  </div>
                </div>
              </fieldset>

              {/* Step 2 */}
              <fieldset className="enq__pane" data-step="2">
                <legend className="enq__legend">What you have configured</legend>
                <p className="enq__pane-note">
                  Already filled in from your choices on this page. Change
                  anything here and the sheet on the left follows.
                </p>
                <div className="enq__fields">
                  {/* Both of these lists come from the catalogue, so a system
                      or a variant added in the admin panel is offered here
                      the moment it is published — there is no list of
                      products in this file to forget to update. */}
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fSystem">System</label>
                    <select className="enq__select" id="fSystem" name="system" defaultValue={system.name}>
                      {systems.map((s) => (
                        <option key={s.slug}>{s.name}</option>
                      ))}
                    </select>
                    <span className="enq__err" data-err></span>
                  </div>
                  {/* ⚠ NEW CONTROL. Picking a variant in §04 wrote the spec
                      sheet but left the visitor no way to change their mind
                      here, and no way to name a format at all on the systems
                      whose §04 has no footage yet. Rendered only when this
                      system HAS variants — an empty select is a dead control
                      that says the range is empty, which it is not. */}
                  {variants.length > 0 && (
                    <div className="enq__field">
                      <label className="enq__label" htmlFor="fVariant">Variant</label>
                      <select className="enq__select" id="fVariant" name="variant" defaultValue="">
                        <option value="">Not sure yet</option>
                        {variants.map((v) => (
                          <option key={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <span className="enq__err" data-err></span>
                    </div>
                  )}
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fSeries">Profile series</label>
                    <select className="enq__select" id="fSeries" name="series" defaultValue="">
                      <option value="">Not sure yet</option>
                      {SERIES_OPTION_ORDER.map((id) => (
                        <option key={id}>{SERIES[id].name}</option>
                      ))}
                    </select>
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fGlass">Glass</label>
                    <select className="enq__select" id="fGlass" name="glass" defaultValue="Clear">
                      <option>Clear</option>
                      <option>Grey</option>
                      <option>Bronze</option>
                      <option>Frosted</option>
                      <option>Reflective</option>
                      <option>Low-E</option>
                      <option>Laminated</option>
                      <option>Double Glazed</option>
                    </select>
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fFinishType">Finish type</label>
                    <select className="enq__select" id="fFinishType" name="finishType" defaultValue="Anodised">
                      <option>Powder Coat</option>
                      <option>PVDF</option>
                      <option>Wood Grain</option>
                      <option>Anodised</option>
                    </select>
                    <span className="enq__err" data-err></span>
                  </div>
                </div>
              </fieldset>

              {/* Step 3 */}
              <fieldset className="enq__pane" data-step="3">
                <legend className="enq__legend">The brief</legend>
                <p className="enq__pane-note">
                  Rough numbers are fine — we survey before anything is priced.
                </p>
                <div className="enq__fields">
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fStage">Project stage</label>
                    <select className="enq__select" id="fStage" name="stage" defaultValue="Design / drawings">
                      <option>Design / drawings</option>
                      <option>Under construction</option>
                      <option>Ready for measurement</option>
                      <option>Replacing existing windows</option>
                    </select>
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field">
                    <label className="enq__label" htmlFor="fCount">Approx. openings</label>
                    <input className="enq__input" id="fCount" name="openings" type="text" placeholder="e.g. 12" inputMode="numeric" />
                    <span className="enq__err" data-err></span>
                  </div>
                  <div className="enq__field enq__field--full enq__field--area">
                    <label className="enq__label" htmlFor="fMsg">Anything else</label>
                    <textarea className="enq__area" id="fMsg" name="message" placeholder="Spans, site conditions, timelines — whatever helps."></textarea>
                  </div>
                </div>
              </fieldset>

            </div>

            <div className="enq__actions" id="enqActions">
              <button className="enq__btn enq__btn--ghost" type="button" id="enqBack" hidden>
                <i aria-hidden="true">&larr;</i><span>Back</span>
              </button>
              <button className="enq__btn" type="button" id="enqNext">
                <span>Continue</span><i aria-hidden="true">&rarr;</i>
              </button>
              <button className="enq__btn" type="submit" id="enqSend" hidden>
                <span>Send enquiry</span><i aria-hidden="true">&rarr;</i>
              </button>
            </div>

            <p className="enq__legal" id="enqLegal">We reply within one working day &middot; no marketing lists</p>

            <div className="enq__done" id="enqDone" role="status">
              <span className="enq__done-mark" aria-hidden="true">&#10003;</span>
              <h3>That is everything <em>we need.</em></h3>
              <p id="enqDoneLine">A specifier will call you within one working day.</p>
              <div className="enq__done-recap" id="enqDoneRecap"></div>
            </div>
          </form>

        </div>
      </div>
    </section>
  )
}
