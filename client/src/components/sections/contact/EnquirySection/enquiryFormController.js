import { prefersReducedMotion } from '@/utils/motion'
import { BASE_URL } from '@/services/api'
import { trackEnquiry } from '@/components/common/SEO/Tracking'

/**
 * Where a submitted enquiry is posted.
 *
 * Read from the shared API base so a deploy only ever configures one URL
 * (VITE_API_URL). See the long note at the submit handler for why this
 * replaced the direct formsubmit.co call and why that call is still there
 * as a fallback.
 */
const API_ENQUIRY_URL = `${BASE_URL}/enquiries/`

/**
 * Contact §02 — the consultation form controller.
 *
 * Port of <script id="contact-form-script"> in contact.html
 * (lines 2689-3144).
 *
 * It turns the authored STACKED form into the stepped one: adding
 * `msf--stepped` is what switches the CSS over — the progress rail, the
 * system note, the variant disclosure, the character counter, the Back
 * control and the Next group all stop being `display: none`, the four
 * steps stop sitting in normal flow, and Send hides until the last step.
 * Without this module the section still renders and still posts natively
 * to its `action` URL, which is exactly the no-JS state the markup and
 * enquirySection.css are written around.
 *
 * It owns, in the original's order: step navigation and the progress
 * rail, the right-column image crossfade, per-step validation, the
 * system note, the variant disclosure, the character counter, the
 * directional two-beat step transition, the `?type=/?system=/?variant=
 * /?step=` pre-fill, the §04 "Book a visit" pre-select, and the fetch
 * submit with its native-POST fallback.
 *
 * ── The four deviations from the original ─────────────────────────
 *
 * 1. ELEMENT LOOKUP. The original calls `document.getElementById` for
 *    every control; this takes the section element and queries inside it,
 *    the house convention for a section controller (see
 *    twoWorldsAnimation.js, processAnimation.js). Every id is still
 *    rendered — they are part of the authored markup, and the labels'
 *    `for=` / `aria-controls` / `aria-labelledby` all point at them.
 *
 * 2. `motion-ok` IS READ LAZILY. The original snapshots it once:
 *    `var motionOK = document.documentElement.classList.contains(...)`,
 *    which is safe there because the base script (which adds the class)
 *    runs at line 2406, well before this one at 2689. In React the class
 *    is added by useContactFadeReveal — a PASSIVE effect on the page —
 *    and this controller runs from a LAYOUT effect, which React flushes
 *    first. A snapshot taken here would always read `false` and every
 *    step change would jump instead of sliding. The class never changes
 *    after mount, so reading it per transition is the same value the
 *    original had, at the only time it is used.
 *
 * 3. TEARDOWN. The original never unbinds — contact.html simply ends.
 *    Here an AbortController carries the signal into every
 *    addEventListener so one `abort()` drops all of them, and the two
 *    step-transition timers are cleared. StrictMode mounts, unmounts and
 *    remounts every effect in development; without this the second mount
 *    would run a second set of handlers against the first mount's state.
 *    Nothing else needs reverting: every class, attribute and text
 *    change below lands on a node inside the section, and those leave
 *    with it. `html.motion-ok` belongs to useContactFadeReveal and is
 *    only ever read here.
 *
 * 4. `[data-preselect-type]` STAYS DOCUMENT-WIDE, as in the original —
 *    the only element carrying it is §04 Visit's "Book a visit →" link,
 *    outside this section. React commits the whole page in one pass, so
 *    that link is in the DOM before any effect runs.
 *
 * ⚠ Every field stays UNCONTROLLED and this module reads and writes the
 * DOM directly, exactly as the original script does. No React state is
 * involved, so `new FormData(form)` sees the same entries and the native
 * POST fallback behaves identically.
 */

/* ⚠ THE SYSTEM LIST IS NO LONGER IN THIS FILE.
 *
 * There were two hard-coded maps here: SYSTEM_NOTES, the one-line note under
 * the step-02 chips, keyed by display name; and SYSTEM_MAP, which turned
 * `?system=lift-and-slide` into the chip value. Both were a second copy of
 * the product list, and both silently stopped matching the moment a system
 * was renamed or added — SYSTEM_NOTES by showing no note, SYSTEM_MAP by
 * ignoring the link.
 *
 * The chips now carry `data-note` and `data-slug` (see EnquirySection), so
 * this module reads both off the DOM and holds no product list at all. The
 * catalogue is the only place that knows what the systems are.
 */

/* ═════════════════════════════════════════════════
 *  URL PARAM PRE-FILL
 *  /contact?type=…&system=…&variant=…&step=…
 *    type    villa | apartment | commercial | renovation |
 *            showroom (or showroom-visit)
 *    system  a system SLUG, its display NAME, or not-sure —
 *            matched against the chips that are actually
 *            rendered, so any system in the catalogue works
 *            without this file knowing about it
 *    variant a variant NAME; selected if this system has it
 *    step    1–4, forces the opening step
 *  With no explicit step: a system/variant link opens on
 *  step 02 pre-selected (with a settle animation); a type link
 *  opens on step 01. Values are matched case/punctuation-
 *  insensitively, so ?system=Lift-And-Slide works too.
 * ═════════════════════════════════════════════════ */
/* WARNING: KEYS ARE MATCHED AFTER normalise(), so they are lower-case and
   letters-only — "independent-house", "Independent House" and
   "independenthouse" all arrive here as the same key.

   The two showroom entries are gone with the option itself; a stale link
   would otherwise select nothing and open the form on a blank step 01
   rather than failing visibly. "builder" and "architect" are short
   aliases for the two long labels, because those are what a campaign URL
   will actually be written with. */
const TYPE_MAP = {
  villa: 'Villa',
  apartment: 'Apartment',
  independenthouse: 'Independent House',
  commercial: 'Commercial',
  renovation: 'Renovation',
  hospitality: 'Hospitality',
  builder: 'Builder / Developer',
  builderdeveloper: 'Builder / Developer',
  developer: 'Builder / Developer',
  architect: 'Architect / Interior Designer',
  architectinteriordesigner: 'Architect / Interior Designer',
  interiordesigner: 'Architect / Interior Designer',
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function normalise(v) {
  return (v || '').toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * @param {HTMLElement} section  #enquiry
 * @returns {(() => void) | undefined} cleanup
 */
export function initEnquiryForm(section) {
  if (!section) return
  const form = section.querySelector('#enquiryForm')
  if (!form) return

  const reduceMotion = prefersReducedMotion()

  const steps = [].slice.call(form.querySelectorAll('.msf__step'))
  const fill = section.querySelector('#msfFill')
  const segs = [].slice.call(section.querySelectorAll('.msf__seg'))
  const count = section.querySelector('#msfCount')
  const backBtn = section.querySelector('#msfBack')
  const nextBtn = section.querySelector('#msfNext')
  const submitBtn = section.querySelector('#msfSubmit')
  const statusEl = section.querySelector('#msfStatus')
  const doneEl = section.querySelector('#msfDone')

  // JS is live → switch the stacked form into stepped mode.
  form.classList.add('msf--stepped')
  let current = 0

  const liveEl = section.querySelector('#msfLive')
  const card = form.closest('.enq__card')
  const mediaImgs = section.querySelectorAll('.enq__media-stack img')
  let transitioning = false

  // One signal for every listener below — see deviation 3.
  const ac = new AbortController()
  const { signal } = ac
  let exitTimer = 0
  let settleTimer = 0

  // crossfade the right-column image to the current step's
  function syncMedia(i) {
    const idx = Math.min(i, mediaImgs.length - 1)
    mediaImgs.forEach(function (img, k) {
      img.classList.toggle('is-current', k === idx)
    })
  }

  function showStep(i, moveFocus) {
    current = Math.max(0, Math.min(steps.length - 1, i))
    steps.forEach(function (s, idx) {
      s.classList.toggle('is-active', idx === current)
    })
    form.classList.toggle('msf--last', current === steps.length - 1)
    /* Two rails, one source of truth. `--msf-progress` still drives the
       continuous `.msf__fill` (kept as the fallback if the segments are
       ever removed); `.is-done` lights the segments the markup actually
       renders. Both read `current`, so they cannot disagree. */
    if (fill) fill.style.setProperty('--msf-progress', (current + 1) / steps.length)
    segs.forEach(function (seg, idx) {
      seg.classList.toggle('is-done', idx <= current)
    })
    count.textContent = pad(current + 1) + ' / ' + pad(steps.length)
    syncMedia(current)
    /* Rebuilt on arrival, not once at init: everything it summarises can
       still change right up until Back is used from here. */
    if (current === steps.length - 1) buildReview()
    backBtn.style.visibility = current === 0 ? 'hidden' : 'visible'

    // announce the step change to screen readers
    if (liveEl) {
      const title = steps[current].querySelector('.msf__legend-title')
      liveEl.textContent = 'Step ' + (current + 1) + ' of ' +
        steps.length + (title ? ' — ' + title.textContent : '')
    }

    if (moveFocus) {
      const legend = steps[current].querySelector('.msf__legend')
      if (legend) {
        legend.setAttribute('tabindex', '-1')
        legend.focus({ preventScroll: true })
      }
      // on small screens the Next button sits below the fold, so
      // the fresh step's heading can land above the viewport —
      // bring the card back under the nav
      const top = card.getBoundingClientRect().top
      if (top < 60) {
        if (window.__glazeLenis) {
          window.__glazeLenis.scrollTo(card, { offset: -90 })
        } else {
          window.scrollTo({
            top: window.scrollY + top - 90,
            behavior: reduceMotion ? 'auto' : 'smooth',
          })
        }
      }
    }
  }

  // ── Per-step validation ────────────────────────────
  function chipChosen(name) {
    return !!form.querySelector('input[name="' + name + '"]:checked')
  }

  const contactFields = {
    name: {
      input: section.querySelector('#msfName'),
      check: function (v) { return v.trim().length > 0 },
    },
    phone: {
      input: section.querySelector('#msfPhone'),
      // 8+ digits, tolerant of +, spaces, dashes and brackets
      check: function (v) {
        return (v.match(/\d/g) || []).length >= 8 &&
          /^[+\d(][\d\s()-]*$/.test(v.trim())
      },
    },
    email: {
      input: section.querySelector('#msfEmail'),
      check: function (v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())
      },
    },
  }

  function setFieldError(field, on) {
    const wrap = field.input.closest('.msf__field')
    wrap.classList.toggle('has-error', on)
    field.input.setAttribute('aria-invalid', on ? 'true' : 'false')
    const error = wrap.querySelector('.msf__error')
    if (error) {
      if (on) {
        field.input.setAttribute('aria-describedby', error.id)
      } else {
        field.input.removeAttribute('aria-describedby')
      }
    }
  }

  function validateField(field) {
    const ok = field.check(field.input.value)
    setFieldError(field, !ok)
    return ok
  }

  // Validate on blur; a field showing an error re-checks as the
  // visitor types, so the message clears the moment it is fixed.
  Object.keys(contactFields).forEach(function (key) {
    const field = contactFields[key]
    field.input.addEventListener('blur', function () {
      if (field.input.value.trim() !== '') validateField(field)
    }, { signal })
    field.input.addEventListener('input', function () {
      if (field.input.closest('.msf__field').classList.contains('has-error')) {
        validateField(field)
      }
    }, { signal })
  })

  const descEl = section.querySelector('#msfSysdesc')

  /** The note travels on the chosen chip, not in a map here. */
  function updateSysdesc(radio) {
    if (!descEl) return
    const note = (radio && radio.dataset.note) || ''
    descEl.classList.remove('is-on')
    if (!note) { descEl.textContent = ''; return }
    // restart the little rise-and-fade for the new line
    void descEl.offsetWidth
    descEl.textContent = note
    descEl.classList.add('is-on')
  }

  // Choosing a chip clears its step's group error, pops the chip
  // and (for systems) swaps the note and the variant list.
  form.addEventListener('change', function (e) {
    /* ⚠ CHECKBOXES TOO, NOT JUST RADIOS. Step 02 became multi-select, and
       this handler is what clears the step's error state and plays the
       selection settle — gated on `type === 'radio'` it did neither for a
       system chip, so ticking one left the error showing. */
    if (e.target.type !== 'radio' && e.target.type !== 'checkbox') return
    const step = e.target.closest('.msf__step')
    if (step) step.classList.remove('has-error')
    if (!reduceMotion) {
      const face = e.target.parentNode.querySelector('.chip__face')
      if (face) {
        face.classList.remove('chip--settle')
        void face.offsetWidth
        face.classList.add('chip--settle')
      }
    }
    if (e.target.name === 'systems') syncSystems()
  }, { signal })

  /* ── Step 02's derived state ───────────────────────────────────
     The note and the variant disclosure both describe ONE system, so both
     are a function of how many are ticked rather than of the last click.

     ⚠ THE VARIANT IS CLEARED WHEN IT STOPS APPLYING. Selecting Sliding,
     picking a variant, then also ticking Casement leaves a variant that
     belongs to neither answer; folding the disclosure away without
     resetting the select would post it anyway. */
  function checkedSystems() {
    return [].slice.call(form.querySelectorAll('input[name="systems"]:checked'))
  }

  function syncSystems() {
    const on = checkedSystems()
    if (on.length === 1) {
      updateSysdesc(on[0])
      syncVariants(on[0].value)
    } else {
      if (descEl) descEl.textContent = ''
      if (vSelect) vSelect.value = ''
      setVariant(false, false)
      if (vToggle) vToggle.hidden = true
    }
  }

  // ── Variant disclosure (step 02) ───────────────────
  const vToggle = section.querySelector('#msfVariantToggle')
  const vWrap = section.querySelector('#msfVariantWrap')
  const vSelect = section.querySelector('#msfVariant')

  function setVariant(open, focus) {
    if (!vToggle || !vWrap) return
    vWrap.classList.toggle('is-open', open)
    vToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    vToggle.textContent = open
      ? '− Hide variant'
      : '+ Add a variant (optional)'
    if (open && focus && vSelect) vSelect.focus()
  }

  /**
   * Show only the chosen system's variants — and only offer the disclosure
   * at all when there is something behind it.
   *
   * The select is rendered with EVERY system's variants (see the note in
   * EnquirySection). Hiding the rest here rather than re-rendering in React
   * is what keeps every field in this form uncontrolled, which is what the
   * no-JS fallback and `new FormData(form)` depend on.
   *
   * `hidden` on an <option> is honoured by every current browser and, unlike
   * removing the nodes, is reversible when the visitor changes their mind —
   * and unlike `disabled` it takes the row out of the list rather than
   * greying out eleven formats belonging to a system they did not pick.
   * Optgroups are hidden with their children so an empty "Casement" heading
   * cannot be left behind.
   */
  function syncVariants(systemName) {
    if (!vSelect) return

    let available = 0
    ;[].slice.call(vSelect.querySelectorAll('option')).forEach(function (option) {
      if (!option.value) return // the "Not sure yet" placeholder always stays
      const mine = option.dataset.system === systemName
      option.hidden = !mine
      if (mine) available += 1
    })
    ;[].slice.call(vSelect.querySelectorAll('optgroup')).forEach(function (group) {
      group.hidden = group.label !== systemName
    })

    // A selection that belongs to the system they just moved away from would
    // otherwise be posted with the new one.
    const selected = vSelect.selectedOptions[0]
    if (selected && selected.value && selected.dataset.system !== systemName) {
      vSelect.value = ''
    }

    // Nothing to choose from → fold the whole disclosure away rather than
    // offering a control with one placeholder in it.
    //
    // The inline style, not just `hidden`: `.msf--stepped .msf__vtoggle` sets
    // `display: block`, and a class selector beats the UA's `[hidden]` rule.
    // The attribute stays for the accessibility tree.
    if (vToggle) {
      vToggle.hidden = available === 0
      vToggle.style.display = available === 0 ? 'none' : ''
    }
    if (available === 0) setVariant(false, false)
  }

  if (vToggle) {
    vToggle.addEventListener('click', function () {
      setVariant(!vWrap.classList.contains('is-open'), true)
    }, { signal })
  }

  /* ═══════════════════════════════════════════════════════════
   *  COUNTRY → REGION  (step 03)
   *
   *  Every country's regions are rendered at once, each option tagged with
   *  the country it belongs to; this hides the ones that do not apply. Same
   *  mechanism as the variant select, and for the same reason — it keeps
   *  both fields uncontrolled, so `new FormData(form)` and the native POST
   *  fallback see exactly what the visitor chose.
   *
   *  ⚠ THE FIELD'S LABEL CHANGES WITH THE COUNTRY. "State" is right in
   *  India and Australia, wrong in the Emirates. The label text lives on
   *  the option group's country in the markup, so this reads it off the DOM
   *  rather than holding a second copy of the country list.
   * ═══════════════════════════════════════════════════════════ */
  const countrySel = section.querySelector('#msfCountry')
  const stateSel = section.querySelector('#msfState')
  const stateLabel = section.querySelector('#msfStateLabel')

  /* One place the label wording lives on the JS side. Anything not listed
     falls back to "State", which is right for most of the world and is
     what the markup ships with. */
  const REGION_LABELS = {
    Australia: 'State / Territory',
    Dubai: 'Emirate',
  }

  function syncRegions() {
    if (!countrySel || !stateSel) return
    const country = countrySel.value

    ;[].slice.call(stateSel.querySelectorAll('option')).forEach(function (option) {
      if (!option.value) return // the placeholder always stays
      option.hidden = !country || option.dataset.country !== country
    })
    ;[].slice.call(stateSel.querySelectorAll('optgroup')).forEach(function (group) {
      group.hidden = !country || group.label !== country
    })

    /* ⚠ A REGION FROM THE PREVIOUS COUNTRY MUST BE CLEARED, NOT JUST
       HIDDEN. `hidden` removes an option from the dropdown but not from the
       form: leave it selected and the enquiry posts "Australia / Telangana"
       — an answer the visitor never gave and nobody would spot. */
    const chosen = stateSel.selectedOptions[0]
    if (chosen && chosen.value && chosen.dataset.country !== country) {
      stateSel.value = ''
    }

    /* Nothing to choose from until a country is picked. Disabled rather
       than hidden so the field keeps its place and the form does not
       reflow the moment the first select is touched. */
    stateSel.disabled = !country
    const placeholder = stateSel.querySelector('option[value=""]')
    if (placeholder) {
      placeholder.textContent = country
        ? 'Select ' + (REGION_LABELS[country] || 'state').toLowerCase()
        : 'Select country first'
    }
    if (stateLabel) stateLabel.textContent = REGION_LABELS[country] || 'State'
  }

  if (countrySel) {
    countrySel.addEventListener('change', syncRegions, { signal })
    syncRegions()
  }

  // ── Live character counter (step 03) ───────────────
  const msgInput = section.querySelector('#msfMessage')
  const charCount = section.querySelector('#msfCharCount')
  if (msgInput && charCount) {
    const refreshCount = function () {
      charCount.textContent = msgInput.value.length + ' / 500'
    }
    msgInput.addEventListener('input', refreshCount, { signal })
    refreshCount()
  }

  function validateStep(i) {
    const el = steps[i]
    if (i === 0) {
      const okType = chipChosen('project_type')
      el.classList.toggle('has-error', !okType)
      return okType
    }
    if (i === 1) {
      const okSys = checkedSystems().length > 0
      el.classList.toggle('has-error', !okSys)
      return okSys
    }
    if (i === 2) return true // everything optional
    if (i === 4) return true // the review holds no inputs
    // step 04 — contact details. Step 05 is the review and returns above.
    let allOk = true
    let firstBad = null
    Object.keys(contactFields).forEach(function (key) {
      const ok = validateField(contactFields[key])
      if (!ok && !firstBad) firstBad = contactFields[key].input
      allOk = allOk && ok
    })
    if (firstBad) firstBad.focus()
    return allOk
  }

  // Directional two-beat transition: the old step slides out
  // (180ms), then the new one slides in from the travel side
  // (420ms) — ~600ms end to end. Reduced-motion and no-JS-motion
  // environments swap instantly via showStep.
  function goTo(i, moveFocus) {
    const target = Math.max(0, Math.min(steps.length - 1, i))
    if (transitioning || target === current) return
    // read, not snapshot — see deviation 2 in the file header
    const motionOK = document.documentElement.classList.contains('motion-ok')
    if (!motionOK) {
      showStep(target, moveFocus)
      return
    }
    transitioning = true
    form.style.setProperty('--msf-dir', target > current ? '1' : '-1')
    const leaving = steps[current]
    leaving.classList.add('is-exiting')
    exitTimer = window.setTimeout(function () {
      leaving.classList.remove('is-exiting')
      showStep(target, moveFocus)
      settleTimer = window.setTimeout(function () { transitioning = false }, 430)
    }, 170)
  }

  function goNext() {
    if (validateStep(current)) {
      goTo(current + 1, true)
    } else if (current === 0 || current === 1) {
      // chip steps: hand focus to the group so keyboard users
      // land on the choices the error is talking about
      const first = steps[current].querySelector('.chip input')
      if (first) first.focus()
    }
  }

  nextBtn.addEventListener('click', goNext, { signal })
  backBtn.addEventListener('click', function () {
    goTo(current - 1, true)
  }, { signal })

  // Enter in a text field advances one step, exactly like Next —
  // without this it falls through to the global submit, which
  // validates everything and teleports the visitor to the first
  // incomplete step. Textareas keep Enter for line breaks; the
  // last step submits normally.
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return
    if (e.target.tagName !== 'INPUT') return
    if (current < steps.length - 1) {
      e.preventDefault()
      goNext()
    }
  }, { signal })

  // "Not sure yet? Skip this step →" — checks the data-only radio
  // so validation passes and the answer still reaches the email.
  const skipBtn = section.querySelector('#msfSkipSystem')
  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      /* ⚠ IT UNTICKS RATHER THAN TICKING A HIDDEN "NOT SURE" OPTION.
         That option was a screen-reader-only radio in the old
         single-choice group; with checkboxes there is nothing for it to be
         mutually exclusive with, so "not sure" is now simply the empty
         answer — which is also what it means. Anything already ticked is
         cleared, so the skip cannot leave a half-answer behind. */
      checkedSystems().forEach(function (input) { input.checked = false })
      syncSystems()
      skipBtn.closest('.msf__step').classList.remove('has-error')
      goTo(current + 1, true)
    }, { signal })
  }

  // Checks a radio and leaves the settle class on its face — the
  // keyframe runs when the chip is first rendered (i.e. the moment
  // its step becomes visible).
  function checkRadio(input) {
    if (!input) return false
    input.checked = true
    if (!reduceMotion) {
      const face = input.parentNode.querySelector('.chip__face')
      if (face) {
        face.classList.add('chip--settle')
        face.addEventListener('animationend', function () {
          face.classList.remove('chip--settle')
        }, { once: true, signal })
      }
    }
    return true
  }

  function checkChip(name, value) {
    let input = null
    form.querySelectorAll('input[name="' + name + '"]').forEach(function (r) {
      if (r.value === value) input = r
    })
    return checkRadio(input)
  }

  /**
   * `?system=` against the chips that are actually on the page.
   *
   * Matched on either the slug or the display name, both normalised, so
   * `?system=lift-and-slide`, `?system=lift-slide` and `?system=Lift%20%26%20Slide`
   * all land on the same chip — and a system added in the panel is linkable
   * the moment it is published, with nothing here to update.
   */
  function findSystemRadio(raw) {
    const wanted = normalise(raw)
    if (!wanted) return null
    let match = null
    /* WARNING: `systems`, PLURAL. Step 02 became multi-select and the inputs
       were renamed with it; this selector still said `system` and so matched
       nothing, which meant every /contact?system=… link — the CTA on all
       seven product pages — silently opened on a blank step 01 instead of a
       pre-selected step 02. Nothing threw, so nothing showed it. */
    form.querySelectorAll('input[name="systems"]').forEach(function (r) {
      if (match) return
      if (normalise(r.dataset.slug) === wanted || normalise(r.value) === wanted) match = r
    })
    return match
  }

  const params = new URLSearchParams(window.location.search)
  let startStep = 0
  const typeVal = TYPE_MAP[normalise(params.get('type'))]
  const sysRadio = findSystemRadio(params.get('system'))
  const variantVal = params.get('variant')

  if (typeVal) checkChip('project_type', typeVal)
  if (sysRadio && checkRadio(sysRadio)) {
    startStep = 1
  }

  // Always run, chosen system or not: it derives the note AND the variant
  // disclosure from how many boxes are ticked, so one call covers the
  // pre-filled link and the empty case.
  syncSystems()

  if (variantVal && vSelect) {
    // Matched on the name rather than assigned, so `?variant=` can no longer
    // post a format that does not exist — the old free-text box took
    // anything, including a typo, and passed it to the specifier as fact.
    const wanted = normalise(variantVal)
    let found = null
    vSelect.querySelectorAll('option').forEach(function (option) {
      if (!found && option.value && normalise(option.value) === wanted) found = option
    })
    if (found) {
      // A variant names its system, so a link that gives one without the
      // other still arrives complete.
      if (!sysRadio && found.dataset.system) {
        const owner = findSystemRadio(found.dataset.system)
        if (owner && checkRadio(owner)) {
          updateSysdesc(owner)
          syncVariants(owner.value)
        }
      }
      vSelect.value = found.value
      setVariant(true, false)
      startStep = Math.max(startStep, 1)
    }
  }
  const stepParam = parseInt(params.get('step'), 10)
  if (stepParam >= 1 && stepParam <= steps.length) {
    startStep = stepParam - 1
  }
  showStep(startStep, false)

  // "Book a visit →" (§04 Visit): pre-select Showroom visit on
  // step 01 and return to the form. Lenis's delegated anchor
  // handler (or the native hash jump) does the scrolling.
  document.querySelectorAll('[data-preselect-type]').forEach(function (a) {
    a.addEventListener('click', function () {
      checkChip('project_type', a.getAttribute('data-preselect-type'))
      showStep(0, false)
    }, { signal })
  })

  /* ===========================================================
   *  DRAWINGS  (step 03)
   *
   *  WARNING: THE <input type="file"> HOLDS THE TRUTH; this code only ever
   *  describes it. Files are never copied into a JS array and posted from
   *  there - the input's own FileList is what `new FormData(form)` reads,
   *  so what the visitor sees listed and what is uploaded cannot diverge.
   *  Removing one therefore has to rebuild the input's list, which is what
   *  DataTransfer is for below.
   *
   *  The three limits mirror EnquiryAttachment on the server. They are here
   *  so a 40 MB drop fails in the same second rather than after uploading;
   *  the server re-checks all three against the real bytes, because a limit
   *  enforced only in a browser is not enforced.
   * =========================================================== */
  const MAX_FILES = 6
  const MAX_BYTES = 10 * 1024 * 1024
  const OK_SUFFIX = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif']

  const fileInput = section.querySelector('#msfFiles')
  const dropZone = section.querySelector('#msfDrop')
  const fileList = section.querySelector('#msfFileList')
  const fileError = section.querySelector('#msfFilesError')

  function prettySize(bytes) {
    return bytes < 1024 * 1024
      ? Math.max(1, Math.round(bytes / 1024)) + ' KB'
      : (bytes / 1048576).toFixed(1) + ' MB'
  }

  function suffixOf(name) {
    const dot = (name || '').lastIndexOf('.')
    return dot < 0 ? '' : name.slice(dot).toLowerCase()
  }

  /* WARNING: `committed` EXISTS BECAUSE THE INPUT CANNOT BE THE SOLE
     RECORD, WHICH IS THE OPPOSITE OF WHAT THIS CODE FIRST ASSUMED.

     Choosing files a second time does not append to <input type="file"> —
     the browser REPLACES its FileList with the new pick. So by the time the
     change handler runs, the previously attached drawings are already gone
     from the only place they were being kept, and there is nothing left to
     merge the new ones with. Worse, if the new pick is then rejected
     (wrong type, too big), nothing gets written back at all: the input ends
     up empty while the rendered list still shows the old rows, and the
     summary and the upload disagree.

     Playwright caught exactly that — two files listed, zero actually
     attached. `committed` is the record; the input is kept in step with it,
     and every path through acceptFiles() writes it back. */
  let committed = []

  /** Writes `files` to both the record and the input, which must agree. */
  function commitFiles(files) {
    committed = files
    const dt = new DataTransfer()
    files.forEach(function (f) { dt.items.add(f) })
    fileInput.files = dt.files
    renderFiles()
  }

  function renderFiles() {
    if (!fileList) return
    const files = committed
    fileList.textContent = ''
    files.forEach(function (f, i) {
      const li = document.createElement('li')
      li.className = 'msf__file-row'

      const name = document.createElement('span')
      name.className = 'msf__file-name'
      /* textContent, not innerHTML: the filename is visitor-supplied and
         this is the one place it is put back on the page. */
      name.textContent = f.name

      const size = document.createElement('span')
      size.className = 'msf__file-size'
      size.textContent = prettySize(f.size)

      const remove = document.createElement('button')
      remove.type = 'button'
      remove.className = 'msf__file-remove'
      remove.setAttribute('aria-label', 'Remove ' + f.name)
      remove.textContent = '×'
      remove.addEventListener('click', function () {
        const next = committed.slice()
        next.splice(i, 1)
        commitFiles(next)
        if (fileError) fileError.textContent = ''
        dropZone.focus()
      }, { signal })

      li.appendChild(name)
      li.appendChild(size)
      li.appendChild(remove)
      fileList.appendChild(li)
    })
    if (dropZone) dropZone.classList.toggle('has-files', files.length > 0)
  }

  /** Accept what is valid, report the first thing that is not. */
  function acceptFiles(incoming) {
    if (!fileInput) return
    const existing = committed.slice()
    const added = []
    let problem = ''

    ;[].slice.call(incoming).forEach(function (f) {
      if (problem) return
      if (existing.length + added.length >= MAX_FILES) {
        problem = 'Up to ' + MAX_FILES + ' files. Remove one to add another.'
        return
      }
      if (OK_SUFFIX.indexOf(suffixOf(f.name)) < 0) {
        problem = '“' + f.name + '” is not a PDF or an image.'
        return
      }
      if (f.size > MAX_BYTES) {
        problem = '“' + f.name + '” is over ' + (MAX_BYTES / 1048576) + ' MB.'
        return
      }
      // Same name and size twice is a double-drop, not a second drawing.
      const dupe = existing.concat(added).some(function (e) {
        return e.name === f.name && e.size === f.size
      })
      if (!dupe) added.push(f)
    })

    if (fileError) fileError.textContent = problem
    /* WARNING: COMMITTED UNCONDITIONALLY, even when nothing was added. The
       browser has already replaced the input's FileList with this pick, so
       a rejected drop leaves the input holding the rejected file — or
       nothing — while `committed` still holds the real ones. Writing back
       every time is what puts the input back in step. */
    commitFiles(existing.concat(added))
  }

  if (fileInput && dropZone) {
    fileInput.addEventListener('change', function () {
      /* The pick is read off the input and then merged against
         `committed`; acceptFiles writes the result back, so whatever the
         browser did to the FileList is undone in the same tick. */
      acceptFiles([].slice.call(fileInput.files || []))
    }, { signal })

    ;['dragenter', 'dragover'].forEach(function (type) {
      dropZone.addEventListener(type, function (e) {
        e.preventDefault()
        dropZone.classList.add('is-over')
      }, { signal })
    })
    ;['dragleave', 'dragend', 'drop'].forEach(function (type) {
      dropZone.addEventListener(type, function () {
        dropZone.classList.remove('is-over')
      }, { signal })
    })
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault()
      if (e.dataTransfer && e.dataTransfer.files) acceptFiles(e.dataTransfer.files)
    }, { signal })
  }

  /* ===========================================================
   *  REVIEW  (step 05)
   *
   *  WARNING: BUILT FROM `new FormData(form)`, WHICH IS WHAT THE SUBMIT
   *  POSTS. Reading the same object the request is built from is the only
   *  way the summary cannot drift from the enquiry - a review assembled
   *  from remembered state is a second source of truth, and that failure is
   *  silent and looks like lying to the customer.
   * =========================================================== */
  const reviewEl = section.querySelector('#msfReview')

  /* ⚠ THE GLYPHS ARE PATH DATA, NOT COMPONENTS. Everything this module
     builds is created with document.createElement and inserted by hand —
     it is a DOM controller, not React — so the review cannot import the
     JSX icons the steps use. Rather than shipping a second icon system,
     each row carries the one path it needs; they are the same drawings,
     at the same 24-grid and stroke, as their counterparts in
     formIcons.jsx. A row with no path simply renders without a badge. */
  const REVIEW_ROWS = [
    ['Project type', 'project_type', 'M4 10.5 12 4l8 6.5M6 9.8V20h12V9.8M10 20v-6h4v6'],
    ['Systems', 'systems', 'M3.5 3.5h17v17h-17zM12 3.5v17M3.5 12h17'],
    ['Variant', 'variant', 'M3.5 3.5h17v17h-17zM12 3.5v17'],
    ['Location', ['city', 'state', 'country'], 'M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
    ['Openings', 'openings', 'M3.5 3.5h17v17h-17zM12 3.5v17M3.5 12h17'],
    ['Timeline', 'timeline', 'M3.5 5h17v15h-17zM3.5 9.5h17M8 3.5v3M16 3.5v3'],
    ['Budget', 'budget', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 7.5h6M9 10.5h6M13.5 7.5c1.6 0 2.4 1.2 2.4 2.6 0 1.6-1.2 2.7-3.2 2.7H9l5 4'],
    ['About', 'message', 'M6 2.5h7L19 8v13.5H6zM13 2.5V8h6M9 13h7M9 16.5h5'],
    ['Name', 'name', 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0'],
    ['Phone', 'phone', 'M5 3.5h3.2l1.6 4-2 1.2a12 12 0 0 0 5.5 5.5l1.2-2 4 1.6V17a2.5 2.5 0 0 1-2.7 2.5A15.5 15.5 0 0 1 2.5 6.2 2.5 2.5 0 0 1 5 3.5z'],
    ['Email', 'email', 'M2.5 5h19v14h-19zM3 6.5 12 13l9-6.5'],
    ['Contact preference', ['contact_method', 'contact_time'], 'M3.5 5.5h17v11h-9l-5 4v-4h-3z'],
  ]

  const SVG_NS = 'http://www.w3.org/2000/svg'

  /** A 34px badge holding one line glyph, or null when the row has none. */
  function reviewBadge(d) {
    if (!d) return null
    const wrap = document.createElement('span')
    wrap.className = 'msf__review-art'
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '1.25')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
    svg.setAttribute('aria-hidden', 'true')
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    svg.appendChild(path)
    wrap.appendChild(svg)
    return wrap
  }

  /**
   * One summary row: badge + label above the value.
   *
   * ⚠ THE PAIR IS WRAPPED IN A <div>, AND THAT IS WHAT MAKES THE GRID WORK.
   * <dt> and <dd> alternate, so a two-column grid laid over them directly
   * auto-places every dt in column one and every dd in column two — a
   * label column beside a value column, not the two columns of PAIRS the
   * design asks for. The HTML spec allows a <div> to group a dt/dd pair
   * inside a <dl> for exactly this reason, and it keeps the description-list
   * semantics that make label-and-value a real relationship rather than
   * two adjacent boxes.
   */
  function reviewRow(label, value, glyph) {
    const row = document.createElement('div')
    row.className = 'msf__review-row'

    const dt = document.createElement('dt')
    const badge = reviewBadge(glyph)
    if (badge) dt.appendChild(badge)
    const text = document.createElement('span')
    text.textContent = label
    dt.appendChild(text)

    const dd = document.createElement('dd')
    dd.textContent = value

    row.appendChild(dt)
    row.appendChild(dd)
    return row
  }

  function buildReview() {
    if (!reviewEl) return
    const data = new FormData(form)
    reviewEl.textContent = ''

    REVIEW_ROWS.forEach(function (row) {
      const label = row[0]
      const keys = row[1]
      const glyph = row[2]
      let value

      if (Array.isArray(keys)) {
        value = keys.map(function (k) { return (data.get(k) || '').trim() })
          .filter(Boolean).join(' · ')
      } else {
        // getAll: `systems` is multi-valued and every other key has one.
        value = data.getAll(keys).map(function (v) { return String(v).trim() })
          .filter(Boolean).join(', ')
      }

      // WARNING: EMPTY ROWS ARE DROPPED, NOT SHOWN BLANK. This is a summary
      // of what was said, not an audit of what was skipped - and every field
      // outside step 04 is optional, so a full list would be mostly dashes.
      if (!value) return

      reviewEl.appendChild(reviewRow(label, value, glyph))
    })

    const files = committed
    if (files.length) {
      reviewEl.appendChild(reviewRow(
        'Drawings',
        files.map(function (f) { return f.name }).join(', '),
        'M6 2.5h7L19 8v13.5H6zM13 2.5V8h6M12 18v-6M9.5 14.5 12 12l2.5 2.5'
      ))
    }
  }

  /* ===========================================================
   *  THE PAYLOAD
   *
   *  Two shapes, one endpoint. With no drawings attached this posts JSON
   *  exactly as it always has; with drawings it must post multipart, because
   *  a file cannot travel in a JSON body. Django reads either.
   *
   *  WARNING: `system` AND `systems` ARE BOTH SENT, AND THEY ARE NOT THE
   *  SAME FIELD. Step 02 is multi-select now, so `systems` carries the whole
   *  answer — but the admin filter, the inbox column and the notification
   *  routing all key off a single `system`, so the FIRST choice is sent there
   *  too. Dropping `system` would have meant migrating three consumers to
   *  parse a list; the column exists server-side for exactly this reason.
   *
   *  City, state, openings, timeline and budget are now real columns and are
   *  posted as themselves. They used to be appended to `message` as
   *  "City: …\n\nOpenings: …" because there was nowhere else to put them,
   *  which made them unsearchable and unfilterable. `message` is once again
   *  only what the visitor actually typed.
   * =========================================================== */
  function selectedFiles() {
    return committed
  }

  function payloadFields(data) {
    const systems = data.getAll('systems').map(String).filter(Boolean)
    return {
      name: data.get('name') || '',
      email: data.get('email') || '',
      phone: data.get('phone') || '',
      enquiry_type: data.get('project_type') || '',
      system: systems[0] || '',
      systems: systems.join(', '),
      variant: data.get('variant') || '',
      message: data.get('message') || '',
      country: data.get('country') || '',
      city: data.get('city') || '',
      state: data.get('state') || '',
      openings: data.get('openings') || '',
      timeline: data.get('timeline') || '',
      budget: data.get('budget') || '',
      contact_method: data.get('contact_method') || '',
      contact_time: data.get('contact_time') || '',
      source_path: window.location.pathname,
      // `_honey` is the original's own honeypot field; the API expects it
      // under the name `website`.
      website: data.get('_honey') || '',
    }
  }

  function buildPayload(data) {
    const fields = payloadFields(data)
    const files = selectedFiles()
    if (!files.length) return JSON.stringify(fields)

    const body = new FormData()
    Object.keys(fields).forEach(function (k) { body.append(k, fields[k]) })
    files.forEach(function (f) { body.append('attachments', f, f.name) })
    return body
  }

  function buildHeaders() {
    return selectedFiles().length
      ? { Accept: 'application/json' }
      : { 'Content-Type': 'application/json', Accept: 'application/json' }
  }

  // ── Submit — fetch in place, native POST as fallback ──
  form.addEventListener('submit', function (e) {
    // walk every step; jump back to the first one that fails
    for (let i = 0; i < steps.length; i++) {
      if (!validateStep(i)) {
        e.preventDefault()
        showStep(i, true)
        return
      }
    }

    // fetch not available → let the browser post the form natively
    if (!window.fetch) return

    e.preventDefault()
    submitBtn.disabled = true
    submitBtn.textContent = 'Sending…'
    statusEl.textContent = ''

    const data = new FormData(form)

    function succeed() {
      form.style.display = 'none'
      doneEl.classList.add('is-visible')
      // hand focus to the confirmation so it's read out
      doneEl.focus({ preventScroll: true })

      // ⚠ HERE, NOT ON THE CLICK. The conversion is reported only once the
      // enquiry has actually been accepted — a Lead counted on submit counts
      // the failures too, and an ad platform optimising toward a number that
      // includes failed submissions will buy more of them. No-op unless a
      // pixel or GA4 id is configured in the panel.
      trackEnquiry({
        category: 'contact',
        system: data.get('system') || '',
        variant: data.get('variant') || '',
        project_type: data.get('project_type') || '',
      })
    }

    function fail() {
      submitBtn.disabled = false
      submitBtn.textContent = 'Send Enquiry'
      statusEl.innerHTML =
        'That didn’t go through. Please try again, or write to ' +
        '<a href="mailto:info@glazewindowsystems.com">info@glazewindowsystems.com</a>.'
    }

    // ⚠ CHANGED FROM THE ORIGINAL, and deliberately.
    //
    // contact.html posted straight to formsubmit.co. That still works, but it
    // means the recipient address is frozen into this file: the admin panel's
    // "Contact Settings > Recipient Emails" screen would be decorative,
    // enquiries would leave no record anyone could search, and the dashboard
    // would have nothing to count.
    //
    // So the API goes first — it stores the row, then emails whoever Contact
    // Settings currently names and sends the customer the auto-reply from the
    // template stored there.
    //
    // formsubmit.co is kept as the FALLBACK rather than deleted. This site can
    // be deployed as static files with no Django behind it, and in that
    // configuration the contact form has to keep working. A lost enquiry is a
    // lost customer; falling back to the old path costs nothing and covers
    // the backend being down, not yet deployed, or unreachable.
    fetch(API_ENQUIRY_URL, {
      method: 'POST',
      /* WARNING: NO Content-Type WHEN THERE ARE FILES. `fetch` sets
         multipart/form-data AND its boundary parameter itself; a hand-written
         header omits the boundary and the server cannot parse a single
         field. buildPayload decides which shape this is, so the header has
         to follow it. */
      headers: buildHeaders(),
      credentials: 'omit',
      body: buildPayload(data),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('api rejected')
        return res.json()
      })
      .then(succeed)
      .catch(function () {
        // Second chance via the original endpoint before telling the visitor
        // anything failed.
        return fetch('https://formsubmit.co/ajax/info@glazewindowsystems.com', {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data,
        })
          .then(function (res) {
            if (!res.ok) throw new Error('send failed')
            return res.json()
          })
          .then(succeed)
          .catch(fail)
      })
  }, { signal })

  return function cleanup() {
    ac.abort()
    window.clearTimeout(exitTimer)
    window.clearTimeout(settleTimer)
    // The form itself outlives nothing else — every other mutation
    // above is on a node inside the section. Dropping `msf--stepped`
    // still matters: it is the class the whole stepped/stacked switch
    // hangs on, and leaving it would strand a re-initialised form with
    // three hidden steps if a future mount ever failed part-way.
    form.classList.remove('msf--stepped', 'msf--last')
  }
}

export default initEnquiryForm
