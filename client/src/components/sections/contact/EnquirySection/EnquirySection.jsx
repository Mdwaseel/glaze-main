import { useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCatalogue } from '@/context/CatalogueContext'
import { absoluteUrl } from '@/components/common/SEO'
import { ROUTES } from '@/constants/routes'
import {
  IconVilla, IconApartment, IconHouse, IconCommercial, IconRenovation,
  IconHospitality, IconBuilder, IconArchitect,
  IconCall, IconWhatsApp, IconEmail,
  IconMorning, IconAfternoon, IconEvening,
  IconShield, IconUpload, IconChat, IconUser,
  systemArt,
} from './formIcons'
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
/**
 * Step 01's answers.
 *
 * ⚠ THE LAST TWO ARE NOT BUILDING TYPES, and that is deliberate rather than
 * sloppy. "Builder / Developer" and "Architect / Interior Designer" answer
 * who is asking, not what is being built — but they are the two answers that
 * change the enquiry most, because a developer's enquiry is a volume
 * conversation and an architect's is a specification one. Asked as a
 * separate question they would cost every visitor a whole extra step to
 * route perhaps one in ten; sat at the end of this list they cost nothing
 * and the two people who need them find them immediately.
 */
const PROJECT_TYPES = [
  { value: 'Villa', icon: IconVilla },
  { value: 'Apartment', icon: IconApartment },
  { value: 'Independent House', icon: IconHouse },
  { value: 'Commercial', icon: IconCommercial },
  { value: 'Renovation', icon: IconRenovation },
  { value: 'Hospitality', icon: IconHospitality },
  { value: 'Builder / Developer', icon: IconBuilder },
  { value: 'Architect / Interior Designer', icon: IconArchitect },
]

/** Contact preferences, with the window each one actually means. */
const CONTACT_METHODS = [
  { value: 'Call', icon: IconCall },
  { value: 'WhatsApp', icon: IconWhatsApp },
  { value: 'Email', icon: IconEmail },
]
const CONTACT_TIMES = [
  { value: 'Morning', hint: '9am – 12pm', icon: IconMorning },
  { value: 'Afternoon', hint: '12pm – 5pm', icon: IconAfternoon },
  { value: 'Evening', hint: '5pm – 9pm', icon: IconEvening },
]

/**
 * Where Glaze sells, and what a "state" is called in each.
 *
 * ⚠ THE REGION LIST IS PER COUNTRY, NOT ONE LONG LIST. Region names are only
 * unambiguous inside a country — "Victoria" is an Australian state and also
 * a district in several other places — so a single flat select would collect
 * an answer that cannot be read back with confidence, and the column could
 * not be filtered on.
 *
 * ⚠ `regionLabel` CHANGES THE FIELD'S OWN LABEL. Asking an Australian for a
 * "State" is right, asking for a "State" in the Emirates is not. The label
 * follows the country, which costs one string per entry and removes the one
 * thing about this control that would read as an oversight abroad.
 *
 * ⚠ "DUBAI" IS THE LABEL THE BRIEF ASKED FOR, and it is an emirate rather
 * than a country — so its region list is the seven emirates, and Dubai
 * appears at both levels. That is odd on paper and correct in practice:
 * everyone in this market says "Dubai" for the whole UAE, and an enquiry
 * from Sharjah still needs somewhere to go. Renaming this one entry to
 * "United Arab Emirates" is a single-word change here if the group prefers
 * the accurate form.
 */
const COUNTRIES = [
  {
    value: 'India',
    regionLabel: 'State',
    regions: [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
      'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
      'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
      'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
      'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman & Nicobar Islands', 'Chandigarh',
      'Dadra & Nagar Haveli and Daman & Diu', 'Delhi', 'Jammu & Kashmir', 'Ladakh',
      'Lakshadweep', 'Puducherry',
    ],
  },
  {
    value: 'Malaysia',
    regionLabel: 'State',
    regions: [
      'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
      'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
      'Kuala Lumpur', 'Labuan', 'Putrajaya',
    ],
  },
  {
    value: 'Australia',
    regionLabel: 'State / Territory',
    regions: [
      'Australian Capital Territory', 'New South Wales', 'Northern Territory',
      'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia',
    ],
  },
  {
    value: 'Dubai',
    regionLabel: 'Emirate',
    regions: [
      'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah',
      'Sharjah', 'Umm Al Quwain',
    ],
  },
]

/** Step 03's single-choice groups. Order is the order they are asked in. */
const OPENINGS = ['Up to 5', '5–15', '15–40', '40+']
const TIMELINES = ['Immediately', '1–3 Months', '3–6 Months', '6+ Months']
const BUDGETS = ['Under ₹3L', '₹3L–₹6L', '₹6L–₹10L', '₹10L+']

/**
 * ⚠ MIRRORS `EnquiryAttachment` ON THE SERVER, which is the authority.
 * These exist so the visitor gets a fast, kind error instead of a round
 * trip — they are not a control. The same three rules are re-applied in
 * `_clean_attachments` against the real bytes, because anything checked
 * only in a browser is checked nowhere.
 */
const MAX_FILES = 6
const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.heic,.heif'

/** The system's own still, or '' when it has none. */
const stillOf = (sys) => (sys.card && (sys.card.poster || sys.card.image)) || ''

export default function EnquirySection() {
  const sectionRef = useRef(null)
  const { systems } = useCatalogue()

  // Re-initialised if the SET changes — the provider paints the shipped
  // catalogue first and swaps in the live one, and the controller caches the
  // chips, the note element and the variant select.
  /* ⚠ THE CATALOGUE, AND NOTHING ELSE. Accordion was briefly appended here
     as an "offered but not yet published" supplement; it is removed, and
     the supplement mechanism with it. The list is once again exactly what
     the admin panel says the products are — which is the property that
     made step 02 worth generating in the first place, and which a second
     hand-maintained array quietly costs. Anything Glaze wants offered here
     is added in the panel. */
  const offered = systems

  const signature = offered
    .map((s) => `${s.slug}:${(s.variants || []).map((v) => v.id).join(',')}`)
    .join('|')

  /* Held in a ref, NOT closed over. The effect below re-runs only when the
     catalogue's SET changes, so it would otherwise capture whichever
     `navigate` identity existed at mount; reading it through a ref at submit
     time keeps it current without putting the router in the effect's
     dependency surface, where a routing-layer re-render would tear the whole
     stepped form down and rebuild it mid-enquiry. Same arrangement as
     SystemsSection's carousel. */
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  useLayoutEffect(
    () =>
      initEnquiryForm(sectionRef.current, {
        onSuccess: (detail) => {
          // `replace`: Back from the confirmation should return to the page
          // the visitor came from, not re-post the form they just sent.
          navigateRef.current(ROUTES.THANK_YOU, { replace: true, state: detail })
          return true
        },
      }),
    [signature],
  )

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
            {/* ⚠ THE NO-`fetch` PATH USED TO END NOWHERE. When `fetch` is
                unavailable the submit handler lets the browser POST this form
                natively, which navigates away to FormSubmit's own generic
                confirmation — a page with no Glaze branding, no phone number
                and no way back. `_next` is FormSubmit's redirect target, and
                it sends that visitor to the same /thank-you the fetch path
                does. Absolute because it leaves this origin first. */}
            <input type="hidden" name="_next" value={absoluteUrl(ROUTES.THANK_YOU)} />
            <input type="text" name="_honey" style={{ display: 'none' }} tabIndex="-1" autoComplete="off" aria-hidden="true" />

            {/* Progress rail (stepped mode only) */}
            {/* ⚠ THE PERCENTAGE IS GONE, THE BAR IS NOT. "01 / 04" and "25%"
                were the same fact twice — and the weaker of the two was
                taking the end of the rail, where the eye lands last. The
                count says where you are in words the visitor can act on; the
                bar says it as a picture. A number that only restates the
                picture is noise on a step the visitor is trying to read
                past. */}
            {/* ⚠ FIVE SEGMENTS, NOT ONE BAR THAT FILLS. A continuous bar
                answers "how far along?"; five marks answer "how many left?",
                which is the question someone decides whether to start on.
                The count stays because it names the step you are ON — the
                segments cannot. What went is the "25%", which said the same
                thing as the bar in worse words. */}
            <div className="msf__progress" aria-hidden="true">
              <span className="msf__count" id="msfCount">01 / 05</span>
              <span className="msf__track" id="msfTrack">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span className="msf__seg" key={n}></span>
                ))}
              </span>
            </div>

            {/* ── Step 01 — What are you building? ── */}
            <fieldset className="msf__step" data-step="1">
              <legend className="msf__legend">
                <span className="msf__legend-num">01</span>
                <span className="msf__legend-title">What are you building?</span>
              </legend>
              <p className="msf__help">Tell us about your project. Choose one.</p>
              {/* ⚠ "SHOWROOM VISIT" IS GONE, and it is the only option
                  removed rather than reworded. Every other choice here
                  answers "what are you building?"; that one answered "how
                  would you like to talk to us?", which is a different
                  question and now has its own field on step 04. Left in
                  place it was the reason this step could return an answer
                  that told the specifier nothing about the project. */}
              {/* ⚠ CARDS, NOT PILLS, AND THE ICON IS WHY. Eight pills of
                  tracked-out 10px capitals are eight strings the eye has to
                  READ before it can choose; eight cards with a mark are
                  eight things it can recognise. At this count that is the
                  difference between scanning and deciding, which is what
                  the first step of a consultation is for.

                  The <input> stays a real radio, visually hidden but in the
                  tab order — so arrow keys walk the group and Space selects,
                  both from the browser, with no key handling of our own. */}
              <div className="msf__cards" role="radiogroup" aria-label="Project type">
                {PROJECT_TYPES.map((t) => {
                  const Art = t.icon
                  return (
                    <label className="ocard" key={t.value}>
                      <input type="radio" name="project_type" value={t.value} />
                      <span className="ocard__face">
                        <span className="ocard__art"><Art /></span>
                        <span className="ocard__label">{t.value}</span>
                        <span className="ocard__tick" aria-hidden="true">
                          <svg viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 8.4 6.6 11.4 12.5 5" stroke="currentColor"
                              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="msf__error" role="alert">Choose one to continue.</p>
            </fieldset>

            {/* ── Step 02 — System & variant ── */}
            <fieldset className="msf__step" data-step="2">
              <legend className="msf__legend">
                <span className="msf__legend-num">02</span>
                <span className="msf__legend-title">Which systems are you interested in?</span>
              </legend>
              <p className="msf__help">
                Select one or more systems you&rsquo;d like to explore.
                <span className="msf__help-note">Multiple selections allowed.</span>
              </p>
              {/* ⚠ CHECKBOXES, NOT RADIOS, AND THE `name` CHANGED WITH THEM.
                  A real project is rarely one system — sliding to the terrace
                  and casements everywhere else is the normal case, and the
                  single-choice version forced that visitor to under-report.
                  `systems` (plural) posts every box ticked; the controller
                  still writes the FIRST one to `system` so the admin filter,
                  the inbox column and the notification routing keep working
                  on a single value. Both columns exist server-side for
                  exactly this reason.

                  `role="group"`, not `radiogroup` — the group is no longer a
                  single-answer question and announcing it as one would tell a
                  screen reader the opposite of what is true. */}
              {/* ⚠ CARDS WITH A DRAWING, NOT PILLS. Eight product names in
                  tracked capitals ask a visitor to already know what a
                  "Tilt & Turn" is; a picture of a frame tilting does not.
                  This is the one step where the answer is a THING rather
                  than a word, so it is the one step that earns pictures.

                  The art is line work rather than photography — see the
                  header of formIcons.jsx for why the installation stills on
                  disk could not do this job. */}
              <div className="msf__cards msf__cards--sys" role="group" aria-label="Systems of interest">
                {offered.map((sys) => {
                  const Art = systemArt(sys.slug)
                  return (
                    <label className="ocard ocard--sys" key={sys.slug}>
                      <input
                        type="checkbox" name="systems" value={sys.name}
                        data-slug={sys.slug} data-note={sys.enquiryNote}
                      />
                      <span className="ocard__face">
                        {/* ⚠ THE STILL IF THERE IS ONE, THE DRAWING IF NOT.
                            `card.poster` is the first frame of the clip the
                            homepage carousel plays for this system, and
                            `card.image` covers Fixed, which has no footage.
                            Accordion has neither and falls back to the glyph
                            — so a system added tomorrow with no media still
                            renders a card rather than a broken image. */}
                        {/* WARNING: THE FALLBACK KEEPS THE SAME BOX. Drawn at
                            its own size next to seven photographs it made one
                            card a different height and read as a mistake in
                            the artwork rather than as a system awaiting a
                            still. Same 4:3 frame, same ground — only the
                            contents differ. */}
                        <span className="ocard__shot">
                          {stillOf(sys)
                            ? <img src={stillOf(sys)} alt="" loading="lazy" decoding="async" />
                            : <span className="ocard__shot-fallback"><Art /></span>}
                        </span>
                        <span className="ocard__label">{sys.name}</span>
                        <span className="ocard__tick" aria-hidden="true">
                          <svg viewBox="0 0 16 16" fill="none">
                            <path d="M3.5 8.4 6.6 11.4 12.5 5" stroke="currentColor"
                              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="msf__error" role="alert">Choose at least one, or skip if you&rsquo;re not sure yet.</p>
              {/* ⚠ UNDER THE GRID AND FULL WIDTH. It was floated beside the
                  question so it would be read before the cards were
                  scanned — but at 16rem it squeezed the eight cards into a
                  narrower measure for the whole step to serve a case that
                  is the exception, and the heading had to set around it.
                  Full width underneath, it is the last thing on the step
                  and reads as the way out of it, which is when it is
                  actually wanted. */}
              <aside className="msf__unsure">
                <span className="msf__unsure-art" aria-hidden="true"><IconChat /></span>
                <p className="msf__unsure-title">Not sure yet?</p>
                <p className="msf__unsure-copy">We&rsquo;ll help you choose the right systems.</p>
                <button className="msf__skip" id="msfSkipSystem" type="button">
                  {/* The label and the arrow are separate elements so the
                      rule can underline the WORDS only — see the note on
                      `.msf__skip-text` for why it ran under the arrow. */}
                  <span className="msf__skip-text">I&rsquo;m not sure yet</span>
                  <span className="msf__skip-arrow" aria-hidden="true">&rarr;</span>
                </button>
              </aside>

              {/* one-line note on the selected system, swapped by the
                  controller from the chosen chip's `data-note`. */}
              <p className="msf__sysdesc" id="msfSysdesc" aria-live="polite"></p>


              {/* ⚠ THE VARIANT DISCLOSURE NOW APPEARS ONLY FOR A SINGLE
                  SELECTION, and the controller enforces that. A variant is a
                  format OF one system; with two systems ticked the question
                  "which variant?" has no single answer, and offering it
                  anyway would collect a value that belongs to whichever
                  system the visitor happened to be thinking of. So it folds
                  away at zero selections and at two or more, and the field is
                  cleared on the way — an unticked system must not leave its
                  variant behind on the payload. */}
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
              {/* ⚠ SIX SECTIONS, NOT ONE GRID OF EIGHT CONTROLS. This step
                  asks more than it used to — location gained a state, and
                  budget and drawings are new — and a flat grid of that many
                  fields is the point where a consultation starts reading as
                  a form. Each block is one question with its own hairline
                  and its own air, so the step is scrolled through rather
                  than confronted. Every one is optional; nothing here blocks
                  Continue. */}

              <div className="msf__block">
                <p className="msf__block-title"><span className="msf__block-num">01</span>Project location</p>
                <div className="msf__grid">
                  {/* ⚠ COUNTRY FIRST, BECAUSE IT DECIDES THE NEXT FIELD.
                      The region select below holds every country's list at
                      once and the controller hides the ones that do not
                      apply — the same mechanism the variant select uses, and
                      for the same reason: it keeps every field uncontrolled,
                      which is the contract `new FormData(form)` and the no-JS
                      fallback both depend on. With no JS the visitor sees one
                      grouped list of all regions, which is still answerable. */}
                  <div className="msf__field">
                    <label className="msf__label" htmlFor="msfCountry">Country</label>
                    <select className="msf__input msf__select" id="msfCountry" name="country" defaultValue="">
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="msf__field">
                    {/* The text is rewritten per country — see `regionLabel`. */}
                    <label className="msf__label" htmlFor="msfState" id="msfStateLabel">State</label>
                    <select className="msf__input msf__select" id="msfState" name="state" defaultValue="">
                      <option value="">Select state</option>
                      {COUNTRIES.map((c) => (
                        <optgroup label={c.value} key={c.value}>
                          {c.regions.map((r) => (
                            <option key={c.value + r} value={r} data-country={c.value}>{r}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="msf__field msf__field--full">
                    <label className="msf__label" htmlFor="msfCity">City</label>
                    <input
                      className="msf__input" id="msfCity" name="city" type="text"
                      autoComplete="address-level2" placeholder="Enter city"
                    />
                  </div>
                </div>
              </div>

              <div className="msf__block">
                <p className="msf__block-title" id="msfOpeningsLabel"><span className="msf__block-num">02</span>Estimated openings</p>
                <div className="msf__chips" role="radiogroup" aria-labelledby="msfOpeningsLabel">
                  {OPENINGS.map((o) => (
                    <label className="chip" key={o}>
                      <input type="radio" name="openings" value={o} />
                      <span className="chip__face">{o}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="msf__block">
                <p className="msf__block-title" id="msfTimelineLabel"><span className="msf__block-num">03</span>Timeline</p>
                <div className="msf__chips" role="radiogroup" aria-labelledby="msfTimelineLabel">
                  {TIMELINES.map((t) => (
                    <label className="chip" key={t}>
                      <input type="radio" name="timeline" value={t} />
                      <span className="chip__face">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="msf__block">
                <p className="msf__block-title" id="msfBudgetLabel"><span className="msf__block-num">04</span>Estimated budget</p>
                <div className="msf__chips" role="radiogroup" aria-labelledby="msfBudgetLabel">
                  {BUDGETS.map((b) => (
                    <label className="chip" key={b}>
                      <input type="radio" name="budget" value={b} />
                      <span className="chip__face">{b}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="msf__block">
                <label className="msf__block-title" htmlFor="msfMessage"><span className="msf__block-num">05</span>Tell us about your project</label>
                <textarea
                  className="msf__input msf__textarea" id="msfMessage" name="message" rows="4"
                  maxLength="500"
                  placeholder="Tell us about your project, your architect's vision, preferred finishes, or anything you'd like us to know."
                ></textarea>
                <span className="msf__charcount" id="msfCharCount" aria-hidden="true">0 / 500</span>
              </div>

              {/* ── Drawings ──────────────────────────────────────────
                  ⚠ THE <input type="file"> IS THE CONTROL, NOT A DECORATION
                  BEHIND ONE. The drop zone is its <label>, so a click, a tap,
                  Enter and Space all reach the real input for free and the
                  keyboard path is the browser's own. The drag handlers are an
                  ADDITION to that, not a replacement — a drop zone built out
                  of divs and JS is the usual way this control becomes
                  unreachable without a mouse. */}
              <div className="msf__block">
                <p className="msf__block-title"><span className="msf__block-num">06</span>Upload drawings <small>(optional)</small></p>
                <label className="msf__drop" id="msfDrop" htmlFor="msfFiles">
                  <input
                    className="msf__file" id="msfFiles" name="attachments" type="file"
                    multiple accept={ACCEPT}
                  />
                  <span className="msf__drop-art" aria-hidden="true"><IconUpload /></span>
                  <span className="msf__drop-lead">Drag &amp; drop files here or <b>browse files</b></span>
                  <span className="msf__drop-sub">
                    Floor plans, elevations or sketches — PDF or images.
                    Up to {MAX_FILES} files, {MAX_BYTES / 1024 / 1024} MB each.
                  </span>
                </label>
                <ul className="msf__files" id="msfFileList" role="list"></ul>
                <p className="msf__error msf__error--files" id="msfFilesError" role="alert"></p>
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
                  <span className="msf__input-wrap">
                    <span className="msf__input-art" aria-hidden="true"><IconUser /></span>
                    <input
                    className="msf__input msf__input--art" id="msfName" name="name" type="text"
                    autoComplete="name" required
                  />
                  </span>
                  <p className="msf__error" id="msfNameError" role="alert">Please add your name.</p>
                </div>
                <div className="msf__field">
                  <label className="msf__label" htmlFor="msfPhone">Phone</label>
                  <span className="msf__input-wrap">
                    <span className="msf__input-art" aria-hidden="true"><IconCall /></span>
                    <input
                    className="msf__input msf__input--art" id="msfPhone" name="phone" type="tel"
                    inputMode="tel" autoComplete="tel" required
                  />
                  </span>
                  <p className="msf__error" id="msfPhoneError" role="alert">Please add a phone number so we can call you back.</p>
                </div>
                <div className="msf__field msf__field--full">
                  <label className="msf__label" htmlFor="msfEmail">Email</label>
                  <span className="msf__input-wrap">
                    <span className="msf__input-art" aria-hidden="true"><IconEmail /></span>
                    <input
                    className="msf__input msf__input--art" id="msfEmail" name="email" type="email"
                    inputMode="email" autoComplete="email" required
                  />
                  </span>
                  <p className="msf__error" id="msfEmailError" role="alert">Please check the email address.</p>
                </div>
              </div>

              <div className="msf__block">
                <p className="msf__block-title" id="msfMethodLabel">Preferred contact method</p>
                <p className="msf__block-hint">How would you prefer we reach you?</p>
                <div className="msf__cards msf__cards--three" role="radiogroup" aria-labelledby="msfMethodLabel">
                  {CONTACT_METHODS.map((m) => {
                    const Art = m.icon
                    return (
                      <label className="ocard" key={m.value}>
                        <input type="radio" name="contact_method" value={m.value} />
                        <span className="ocard__face">
                          <span className="ocard__art"><Art /></span>
                          <span className="ocard__label">{m.value}</span>
                          <span className="ocard__tick" aria-hidden="true">
                            <svg viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 8.4 6.6 11.4 12.5 5" stroke="currentColor"
                                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="msf__block">
                <p className="msf__block-title" id="msfTimeLabel">Best time to contact</p>
                <p className="msf__block-hint">When is the best time to reach you?</p>
                <div className="msf__cards msf__cards--three" role="radiogroup" aria-labelledby="msfTimeLabel">
                  {CONTACT_TIMES.map((t) => {
                    const Art = t.icon
                    return (
                      <label className="ocard ocard--wide" key={t.value}>
                        <input type="radio" name="contact_time" value={t.value} />
                        <span className="ocard__face">
                          <span className="ocard__art"><Art /></span>
                          <span className="ocard__stack">
                            <span className="ocard__label">{t.value}</span>
                            {/* The window each answer actually means. Without
                                it "Evening" is a different hour to everyone. */}
                            <span className="ocard__hint">{t.hint}</span>
                          </span>
                          <span className="ocard__tick" aria-hidden="true">
                            <svg viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 8.4 6.6 11.4 12.5 5" stroke="currentColor"
                                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* TODO(copy): confirm the privacy line with the team */}
              <div className="msf__assure">
                <span className="msf__assure-art" aria-hidden="true"><IconShield /></span>
                <div>
                  <p className="msf__assure-title">Your information stays private.</p>
                  <p className="msf__assure-copy">
                    Never shared. Never sold. We&rsquo;ll usually respond within one working day.
                  </p>
                </div>
              </div>
            </fieldset>

            {/* ── Step 05 — Review ──────────────────────────────────
                ⚠ THE LAST STEP IS A READ, NOT A WRITE, and it is the only
                step that holds no inputs. Sending straight off step 04 meant
                the visitor's last sight of eleven answers was four screens
                back; a specifier then rings about a budget band they never
                knowingly confirmed. Every row is filled by the controller
                from the live form, so this cannot drift from what is
                actually posted — it reads the same FormData the submit does.

                Rows with no answer are removed rather than shown empty:
                this is a summary of what was said, not a list of what was
                not. */}
            <fieldset className="msf__step msf__step--review" data-step="5">
              <legend className="msf__legend">
                <span className="msf__legend-num">05</span>
                <span className="msf__legend-title">Review your enquiry</span>
              </legend>
              <p className="msf__help">
                One last look. Use Back to change anything.
              </p>
              <dl className="msf__review" id="msfReview"></dl>

              <div className="msf__assure">
                <span className="msf__assure-art" aria-hidden="true"><IconShield /></span>
                <div>
                  <p className="msf__assure-title">Your information stays private.</p>
                  <p className="msf__assure-copy">
                    Never shared. Never sold. We&rsquo;ll usually respond within one working day.
                  </p>
                </div>
              </div>
            </fieldset>

            {/* ── Back / Next / Send rail ── */}
            <div className="msf__nav">
              <button className="msf__back" id="msfBack" type="button">&larr; Back</button>

              {/* ⚠ ONE BUTTON. There were two — a "Next" pill and a circular
                  arrow beside it — wired to the same handler, so the rail
                  offered two controls that did one thing and neither was
                  obviously the primary. The arrow is now part of the label
                  it belongs to. */}
              <span className="msf__next-group">
                <button className="btn-pill sheen" id="msfNext" type="button" data-magnetic="">
                  Continue
                  <span className="btn-pill__arrow" aria-hidden="true">&rarr;</span>
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
