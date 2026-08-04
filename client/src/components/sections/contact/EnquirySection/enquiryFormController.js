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
const TYPE_MAP = {
  villa: 'Villa',
  apartment: 'Apartment',
  commercial: 'Commercial',
  renovation: 'Renovation',
  showroom: 'Showroom visit',
  showroomvisit: 'Showroom visit',
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
  const count = section.querySelector('#msfCount')
  const backBtn = section.querySelector('#msfBack')
  const nextBtn = section.querySelector('#msfNext')
  const nextArrow = section.querySelector('#msfNextArrow')
  const submitBtn = section.querySelector('#msfSubmit')
  const statusEl = section.querySelector('#msfStatus')
  const doneEl = section.querySelector('#msfDone')

  // JS is live → switch the stacked form into stepped mode.
  form.classList.add('msf--stepped')
  let current = 0

  const liveEl = section.querySelector('#msfLive')
  const card = form.closest('.enq__card')
  const pctEl = section.querySelector('#msfPct')
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
    fill.style.width = ((current + 1) / steps.length * 100) + '%'
    count.textContent = pad(current + 1) + ' / ' + pad(steps.length)
    if (pctEl) {
      pctEl.textContent =
        Math.round((current + 1) / steps.length * 100) + '%'
    }
    syncMedia(current)
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
    if (e.target.type !== 'radio') return
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
    if (e.target.name === 'system') {
      updateSysdesc(e.target)
      syncVariants(e.target.value)
    }
  }, { signal })

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
      const okSys = chipChosen('system')
      el.classList.toggle('has-error', !okSys)
      return okSys
    }
    if (i === 2) return true // everything optional
    // step 4 — contact details
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
  nextArrow.addEventListener('click', goNext, { signal })
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
      const notSure = form.querySelector(
        'input[name="system"][value="Not sure yet"]'
      )
      if (notSure) notSure.checked = true
      skipBtn.closest('.msf__step').classList.remove('has-error')
      goNext()
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
    form.querySelectorAll('input[name="system"]').forEach(function (r) {
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
    updateSysdesc(sysRadio)
  }

  // Always run, chosen system or not: with none it hides the disclosure, and
  // it is what puts the select in step with the chip on a pre-filled link.
  syncVariants(sysRadio ? sysRadio.value : '')

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
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        name: data.get('name') || '',
        email: data.get('email') || '',
        phone: data.get('phone') || '',
        enquiry_type: data.get('project_type') || '',
        system: data.get('system') || '',
        variant: data.get('variant') || '',
        // The three fields with no column of their own are folded into the
        // message rather than dropped — they are the useful part of an
        // enquiry and losing them to a schema mismatch would be worse than
        // an untidy string.
        message: [
          data.get('message') || '',
          data.get('city') ? `City: ${data.get('city')}` : '',
          data.get('openings') ? `Openings: ${data.get('openings')}` : '',
          data.get('timeline') ? `Timeline: ${data.get('timeline')}` : '',
        ].filter(Boolean).join('\n\n'),
        source_path: window.location.pathname,
        // `_honey` is the original's own honeypot field; the API expects it
        // under the name `website`.
        website: data.get('_honey') || '',
      }),
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
