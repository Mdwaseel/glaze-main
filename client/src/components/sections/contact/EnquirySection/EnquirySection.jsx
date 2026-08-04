import { useLayoutEffect, useRef } from 'react'
import { useCatalogue } from '@/context/CatalogueContext'
import { initEnquiryForm } from './enquiryFormController'
import './enquirySection.css'

/**
 * EnquirySection — port of contact.html lines 1474-1779.
 *
 * The core of the page: the 4-step consultation form in a soft rounded
 * white card on the left, and one tall cinematic image with a frosted
 * glass pill on the right.
 *
 * TWO of contact.html's scripts reach into this section:
 *
 *   <script id="contact-form-script">      → enquiryFormController.js here
 *   <script id="contact-parallax-script">  → useContactParallax (page-level,
 *                                            shared with §04 Visit)
 *
 * What this component RENDERS is the authored STACKED form — the exact
 * state contact.html shows with JavaScript disabled, and the state the
 * CSS is written around: without `.msf--stepped` the progress rail, the
 * system note, the variant disclosure, the character counter, the Back
 * control and the Next group are all `display: none`; all four steps sit
 * in normal flow; and the Send button is live, posting natively to the
 * `action` URL. The original's own comment calls this out: "DEFAULT
 * markup/CSS is the complete stacked form — readable and postable with
 * no JS." The controller then adds `msf--stepped` and takes over.
 *
 * ⚠ LAYOUT effect, not a passive one. contact.html runs the form script
 * at the bottom of <body>, so the form is already stepped before the
 * first paint. From a passive effect React would paint all four steps
 * stacked and only then collapse them to one — a full-height flash of a
 * form the visitor is never meant to see. Same reasoning as the
 * `page-contact` class on the page shell and as TwoWorldsSection.
 *
 * Everything else the page already mounts applies with no wiring here:
 *   .fade-up on the card / .wipe-in on the figure → useContactFadeReveal
 *   [data-magnetic] on the three buttons          → useContactMagneticButtons
 *
 * ⚠ Every field is UNCONTROLLED. No `value`, no `onChange`, no state —
 * exactly as the original, so `new FormData(form)` sees the same entries
 * and the native POST fallback behaves identically. The controller reads
 * and writes the DOM directly, as the original script does.
 *
 * `data-parallax="24"` and `data-parallax-target` are authored attributes
 * read by useContactParallax; the figure sits still without it, exactly
 * as it does when that script is absent.
 */
/**
 * ⚠ STEP 02 IS GENERATED FROM THE CATALOGUE — the one substantive change to
 * this section since the port, and the thing the brief asked for.
 *
 * The chips were seven hard-coded <label>s. The note under them was a map in
 * the controller keyed by DISPLAY NAME, which stopped matching the moment
 * anyone renamed a system. The variant was a free-text box captioned "As
 * named on the system page", which is a spelling test: the customer types
 * "3 track" and the specifier has to work out which of eleven formats that
 * was.
 *
 * All three now come off the catalogue. A system or a variant added in the
 * admin panel appears here — chip, note and option — with nothing rebuilt.
 * The note travels on the radio as `data-note` and the slug as `data-slug`,
 * so the controller reads both off the DOM and holds no product list of its
 * own; there is now exactly one place in the codebase that knows what the
 * products are.
 */
export default function EnquirySection() {
  const sectionRef = useRef(null)
  const { systems } = useCatalogue()

  // Re-initialised if the SET changes — the provider paints the shipped
  // catalogue first and swaps in the live one, and the controller caches the
  // chips, the note element and the variant select.
  const signature = systems
    .map((s) => `${s.slug}:${s.variants.map((v) => v.id).join(',')}`)
    .join('|')

  useLayoutEffect(() => initEnquiryForm(sectionRef.current), [signature])

  return (
    <section id="enquiry" className="enq" aria-labelledby="msf-title" ref={sectionRef}>
      <div className="enq__inner">

        {/* ── LEFT — the 4-step consultation form ── */}
        <div className="enq__card fade-up">

          <form
            id="enquiryForm"
            action="https://formsubmit.co/info@glazewindowsystems.com"
            method="POST"
            noValidate
          >
            <p className="msf__title" id="msf-title">Request a consultation</p>

            {/* polite step announcements for screen readers (the
                visual progress rail below is decorative) */}
            <p className="sr-only" id="msfLive" aria-live="polite"></p>

            {/* FormSubmit delivery settings + spam honeypot */}
            <input type="hidden" name="_subject" value="New enquiry — glazewindowsystems.com" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="text" name="_honey" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" aria-hidden="true" />

            {/* Progress rail (stepped mode only) */}
            <div className="msf__progress" aria-hidden="true">
              <span className="msf__count" id="msfCount">01 / 04</span>
              <span className="msf__track"><span className="msf__fill" id="msfFill"></span></span>
              <span className="msf__pct" id="msfPct">25%</span>
            </div>

            {/* ── Step 01 — What are you building? ── */}
            <fieldset className="msf__step" data-step="1">
              <legend className="msf__legend">
                <span className="msf__legend-num">01</span>
                <span className="msf__legend-title">What are you building?</span>
              </legend>
              <div className="msf__chips" role="radiogroup" aria-label="Project type">
                <label className="chip">
                  <input type="radio" name="project_type" value="Villa" />
                  <span className="chip__face">Villa</span>
                </label>
                <label className="chip">
                  <input type="radio" name="project_type" value="Apartment" />
                  <span className="chip__face">Apartment</span>
                </label>
                <label className="chip">
                  <input type="radio" name="project_type" value="Commercial" />
                  <span className="chip__face">Commercial</span>
                </label>
                <label className="chip">
                  <input type="radio" name="project_type" value="Renovation" />
                  <span className="chip__face">Renovation</span>
                </label>
                <label className="chip">
                  <input type="radio" name="project_type" value="Showroom visit" />
                  <span className="chip__face">Showroom visit</span>
                </label>
              </div>
              <p className="msf__error" role="alert">Choose one to continue.</p>
            </fieldset>

            {/* ── Step 02 — System & variant ── */}
            <fieldset className="msf__step" data-step="2">
              <legend className="msf__legend">
                <span className="msf__legend-num">02</span>
                <span className="msf__legend-title">System &amp; variant</span>
              </legend>
              <div className="msf__chips" role="radiogroup" aria-label="System">
                {systems.map((s) => (
                  <label className="chip" key={s.slug}>
                    <input
                      type="radio" name="system" value={s.name}
                      data-slug={s.slug} data-note={s.enquiryNote}
                    />
                    <span className="chip__face">{s.name}</span>
                  </label>
                ))}
                {/* data-only radio: the visible control is the skip
                    link below; keeps ?system=not-sure pre-fill and the
                    posted value working */}
                <label className="chip chip--sr">
                  <input
                    type="radio" name="system" value="Not sure yet"
                    data-slug="not-sure"
                    data-note="No problem — tell us about the space and we’ll recommend the right system."
                  />
                  {' '}Not sure yet{' '}
                </label>
              </div>
              <p className="msf__error" role="alert">Choose a system, or skip if you&rsquo;re not sure yet.</p>

              {/* one-line note on the selected system, swapped by the
                  controller from the chosen chip's `data-note`. */}
              <p className="msf__sysdesc" id="msfSysdesc" aria-live="polite"></p>

              <button className="msf__skip" id="msfSkipSystem" type="button">
                Not sure? We&rsquo;ll help you choose &mdash; skip this step &rarr;
              </button>

              {/* variant folds away until asked for; plainly visible in
                  the no-JS stacked form */}
              <button
                className="msf__vtoggle" id="msfVariantToggle" type="button"
                aria-expanded="false" aria-controls="msfVariantWrap"
              >+ Add a variant (optional)</button>
              <div className="msf__variant" id="msfVariantWrap">
                <div className="msf__variant-inner">
                  <div className="msf__grid">
                    <div className="msf__field msf__field--full">
                      <label className="msf__label" htmlFor="msfVariant">Variant <small>(if you know)</small></label>
                      {/*
                        ⚠ A SELECT, NOT THE ORIGINAL TEXT BOX.

                        Every variant of every system is rendered here, each
                        tagged with the system it belongs to; the controller
                        hides the ones that do not match the chosen chip and
                        folds the whole disclosure away when a system has no
                        variants to offer. Doing the filtering in the DOM
                        rather than in React state is what keeps every field
                        in this form uncontrolled, which is the contract the
                        no-JS fallback and `new FormData(form)` depend on.

                        Optgroups, so the no-JS stacked form — where nothing
                        is hidden, because nothing is running to hide it —
                        still reads as a grouped list rather than thirty-one
                        undifferentiated formats.
                      */}
                      <select className="msf__input msf__input--mono" id="msfVariant" name="variant" defaultValue="">
                        <option value="">Not sure yet</option>
                        {systems.filter((s) => s.variants.length > 0).map((s) => (
                          <optgroup label={s.name} key={s.slug}>
                            {s.variants.map((v) => (
                              <option key={v.id} value={v.name} data-system={s.name}>{v.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* ── Step 03 — Project details ── */}
            <fieldset className="msf__step" data-step="3">
              <legend className="msf__legend">
                <span className="msf__legend-num">03</span>
                <span className="msf__legend-title">Project details</span>
              </legend>
              <div className="msf__grid">
                <div className="msf__field">
                  <label className="msf__label" htmlFor="msfCity">City / Location</label>
                  <input
                    className="msf__input" id="msfCity" name="city" type="text"
                    autoComplete="address-level2"
                  />
                </div>
                <div className="msf__field">
                  <span className="msf__label" id="msfOpeningsLabel">Approx. openings <small>(optional)</small></span>
                  <div className="msf__chips" role="radiogroup" aria-labelledby="msfOpeningsLabel">
                    <label className="chip">
                      <input type="radio" name="openings" value="1-5" />
                      <span className="chip__face">1–5</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="openings" value="6-15" />
                      <span className="chip__face">6–15</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="openings" value="16-40" />
                      <span className="chip__face">16–40</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="openings" value="40+" />
                      <span className="chip__face">40+</span>
                    </label>
                  </div>
                </div>
                <div className="msf__field msf__field--full">
                  <span className="msf__label" id="msfTimelineLabel">Timeline <small>(optional)</small></span>
                  <div className="msf__chips" role="radiogroup" aria-labelledby="msfTimelineLabel">
                    <label className="chip">
                      <input type="radio" name="timeline" value="Immediately" />
                      <span className="chip__face">Immediately</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="timeline" value="1-3 months" />
                      <span className="chip__face">1–3 months</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="timeline" value="3-6 months" />
                      <span className="chip__face">3–6 months</span>
                    </label>
                    <label className="chip">
                      <input type="radio" name="timeline" value="6+ months" />
                      <span className="chip__face">6+ months</span>
                    </label>
                  </div>
                </div>
                <div className="msf__field msf__field--full">
                  <label className="msf__label" htmlFor="msfMessage">About the project <small>(optional)</small></label>
                  <textarea
                    className="msf__input" id="msfMessage" name="message" rows="3"
                    maxLength="500"
                    placeholder="The rooms it's for, the view you want to keep, what's there now — whatever you know so far."
                  ></textarea>
                  <span className="msf__charcount" id="msfCharCount" aria-hidden="true">0 / 500</span>
                </div>
              </div>
            </fieldset>

            {/* ── Step 04 — Your contact ── */}
            <fieldset className="msf__step" data-step="4">
              <legend className="msf__legend">
                <span className="msf__legend-num">04</span>
                <span className="msf__legend-title">Your contact</span>
              </legend>
              <div className="msf__grid">
                <div className="msf__field">
                  <label className="msf__label" htmlFor="msfName">Name</label>
                  <input
                    className="msf__input" id="msfName" name="name" type="text"
                    autoComplete="name" required
                  />
                  <p className="msf__error" id="msfNameError" role="alert">Please add your name.</p>
                </div>
                <div className="msf__field">
                  <label className="msf__label" htmlFor="msfPhone">Phone</label>
                  <input
                    className="msf__input" id="msfPhone" name="phone" type="tel"
                    inputMode="tel" autoComplete="tel" required
                  />
                  <p className="msf__error" id="msfPhoneError" role="alert">Please add a phone number so we can call you back.</p>
                </div>
                <div className="msf__field msf__field--full">
                  <label className="msf__label" htmlFor="msfEmail">Email</label>
                  <input
                    className="msf__input" id="msfEmail" name="email" type="email"
                    inputMode="email" autoComplete="email" required
                  />
                  <p className="msf__error" id="msfEmailError" role="alert">Please check the email address.</p>
                </div>
              </div>

              {/* TODO(copy): confirm the privacy line with the team */}
              <p className="msf__assure">
                Your details stay with Glaze &mdash; never shared, never sold.<br />
                We usually respond within one working day.
              </p>
            </fieldset>

            {/* ── Back / Next / Send rail ── */}
            <div className="msf__nav">
              <button className="msf__back" id="msfBack" type="button">&larr; Back</button>

              <span className="msf__next-group">
                <button className="btn-pill sheen" id="msfNext" type="button" data-magnetic="">Next</button>
                <button className="btn-circ" id="msfNextArrow" type="button" aria-label="Next step" data-magnetic="">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </span>

              <span className="msf__submit-group">
                <button className="btn-pill sheen" id="msfSubmit" type="submit" data-magnetic="">
                  Send Enquiry
                </button>
              </span>

              <p className="msf__status" id="msfStatus" aria-live="polite"></p>
            </div>
          </form>

          {/* Success note — hidden until the fetch submit lands */}
          <div className="msf__done" id="msfDone" role="status" tabIndex="-1">
            <p className="msf__done-title">Thank you. <em>We have it.</em></p>
            <p className="msf__done-copy">
              We will call you back within a working day. If it is urgent,
              call <a href="tel:+917675023939">+91 76750 23939</a> now.
            </p>
          </div>
        </div>

        {/* ── RIGHT — tall cinematic image, slower parallax plane ──
             TODO(photography): replace with a real GLAZE installation
             shot — same filename, images/contact/space-tall.webp
             (tall vertical, large glass, natural light). */}
        <figure
          className="enq__media wipe-in"
          data-parallax="24"
          role="img"
          aria-label="Architectural photography — glazing in lived-in spaces"
        >
          {/* one image per step, crossfaded by the form controller;
              the stack div is the parallax plane */}
          <div className="enq__media-stack" data-parallax-target="">
            <img className="is-current"
              src="/images/contact/space-tall.webp" alt=""
              loading="eager" decoding="async"
            />
            <img
              src="/images/contact/showroom-window.jpg" alt=""
              loading="lazy" decoding="async"
            />
            <img
              src="/images/about/value-versatility.webp" alt=""
              loading="lazy" decoding="async"
            />
            <img
              src="/images/about/worlds-europe.webp" alt=""
              loading="lazy" decoding="async"
            />
          </div>
          <span className="enq__media-pill">Your Space</span>
        </figure>

      </div>
    </section>
  )
}
