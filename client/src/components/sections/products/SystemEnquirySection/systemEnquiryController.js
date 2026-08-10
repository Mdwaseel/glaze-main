import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'
import { spec, setSpec } from '@/utils/glz'
import { BASE_URL } from '@/services/api'
import { trackEnquiry } from '@/components/common/SEO/Tracking'

/** Same endpoint Contact's form posts to — see the note at the submit handler. */
const API_ENQUIRY_URL = `${BASE_URL}/enquiries/`

/**
 * Products §11 — the multi-step enquiry with five-layer attribution.
 *
 * Port of the eleventh script in products/sliding.html (lines 3949-4145).
 *
 * Three panes (Project · Configuration · Brief) behind one step rail,
 * with per-pane validation, a tweened wrapper height so the actions row
 * never jumps, and — the part that makes this section what it is — a live
 * mirror of the shared spec. Whatever the visitor chose in the series
 * accordion, the glass switcher or the finish switcher is already in the
 * form's selects and on the standing sheet to the left by the time they
 * reach it, and changing a select writes back the other way.
 *
 * ⚠ THE FORM SENDS NOW — see the long note at the submit handler. The
 * original logged its payload to the console because no endpoint existed;
 * one does, and it is the one Contact's form already posts to.
 *
 * ⚠ EVERY FIELD IS UNCONTROLLED, as on Contact: no `value`, no
 * `onChange`, no React state. `new FormData(form)` therefore sees exactly
 * what the original's does, and `paint()` writes `select.value` directly.
 *
 * ⚠ TEARDOWN. One AbortController covers the field listeners, the
 * document-level `glz:spec` subscription and the form handlers; the GSAP
 * context reverts the height and stagger tweens; the panes' inline
 * `display` is cleared. The `glz:spec` listener matters most — it is
 * bound to `document`, which outlives the route, so without the abort a
 * second visit would paint through a detached form.
 */
export function initSystemEnquiry(section, options) {
  if (!section) return
  const form = section.querySelector('#enqForm')
  if (!form) return

  /* Injected by SystemEnquirySection; navigates to /thank-you and returns
     true when it has. See the same option on the contact form's controller
     for why it is a hook rather than an import. */
  const onSuccess = options && options.onSuccess

  const panes = [].slice.call(form.querySelectorAll('.enq__pane'))
  const rail = [].slice.call(form.querySelectorAll('[data-rail]'))
  const links = [].slice.call(form.querySelectorAll('[data-link]'))
  const back = section.querySelector('#enqBack')
  const next = section.querySelector('#enqNext')
  const send = section.querySelector('#enqSend')
  const done = section.querySelector('#enqDone')
  const panesWrap = section.querySelector('#enqPanes')
  let step = 0

  const ac = new AbortController()
  const { signal } = ac
  const ctx = gsap.context(() => {})

  /* Which control mirrors which slice of the shared spec. */
  const fields = {
    system: section.querySelector('#fSystem'),
    /* ⚠ `variant` NOW HAS A CONTROL. It used to be written only by §04
       Variants' "Enquire with this variant" link, so the spec sheet could
       show a variant the form had no way to change. The select is rendered
       only when the system has variants, so this is null on the ones that
       do not — every use below is already guarded. */
    variant: section.querySelector('#fVariant'),
    series: section.querySelector('#fSeries'),
    glass: section.querySelector('#fGlass'),
    finishType: section.querySelector('#fFinishType'),
  }
  const mirrors = {
    system: section.querySelector('#specSystem'),
    variant: section.querySelector('#specVariant'),
    series: section.querySelector('#specSeries'),
    glass: section.querySelector('#specGlass'),
    finish: section.querySelector('#specFinish'),
  }

  function paint(key) {
    const value = spec[key]
    const sel = fields[key]
    if (sel) {
      const found = [].slice.call(sel.options).some(function (o) {
        if (o.value === value || o.textContent.trim() === value) { sel.value = o.value; return true }
        return false
      })
      if (!found && value) {
        const opt = document.createElement('option')
        opt.textContent = value
        sel.appendChild(opt)
        sel.value = opt.value
      }
    }
    const m = mirrors[key]
    if (m) {
      const empty = !value
      m.textContent = empty ? 'Not chosen yet' : value
      m.classList.toggle('is-empty', empty)
      if (!empty && !prefersReducedMotion()) {
        ctx.add(() => {
          gsap.fromTo(m, { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' })
        })
      }
    }
  }

  Object.keys(fields).forEach(function (key) {
    paint(key)
    if (fields[key]) {
      fields[key].addEventListener('change', function () {
        setSpec(key, fields[key].value)
      }, { signal })
    }
  })
  /* `finish` has a mirror but no control — the finish switcher up the page
     is what writes it — so it is painted outside the loop. */
  paint('finish')
  document.addEventListener('glz:spec', function (e) { paint(e.detail.key) }, { signal })

  /* ── Step machine ── */
  function render() {
    panes.forEach(function (p, i) { p.classList.toggle('is-live', i === step) })
    rail.forEach(function (r, i) {
      r.classList.toggle('is-current', i === step)
      r.classList.toggle('is-done', i < step)
      r.querySelector('.enq__step-dot').textContent = i < step ? '✓' : String(i + 1)
    })
    links.forEach(function (l, i) { l.classList.toggle('is-filled', i < step) })
    back.hidden = step === 0
    next.hidden = step === panes.length - 1
    send.hidden = step !== panes.length - 1
  }

  function fail(input, message) {
    const field = input.closest('.enq__field')
    field.classList.add('has-error')
    const slot = field.querySelector('[data-err]')
    if (slot) slot.textContent = message
    return false
  }

  function clear(input) {
    const field = input.closest('.enq__field')
    field.classList.remove('has-error')
    const slot = field.querySelector('[data-err]')
    if (slot) slot.textContent = ''
  }

  function validate() {
    const pane = panes[step]
    let ok = true
    let first = null

    ;[].slice.call(pane.querySelectorAll('input, select, textarea')).forEach(function (input) {
      clear(input)
      if (!input.required) return
      const value = input.value.trim()
      if (!value) {
        ok = fail(input, 'Required')
        first = first || input
      } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        ok = fail(input, 'Check this address')
        first = first || input
      } else if (input.type === 'tel' && value.replace(/\D/g, '').length < 8) {
        ok = fail(input, 'Check this number')
        first = first || input
      }
    })

    if (first) {
      first.focus()
      if (!prefersReducedMotion()) {
        ctx.add(() => {
          gsap.fromTo(first.closest('.enq__field'),
            { x: -7 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' })
        })
      }
    }
    return ok
  }

  /* Panes are different heights; tweening the wrapper keeps the
     actions row from jumping as the step changes. */
  function go(dir) {
    if (dir > 0 && !validate()) return
    const from = panesWrap.offsetHeight
    step = Math.max(0, Math.min(panes.length - 1, step + dir))
    render()

    if (prefersReducedMotion()) return
    const to = panesWrap.offsetHeight
    ctx.add(() => {
      gsap.fromTo(panesWrap, { height: from }, {
        height: to, duration: 0.5, ease: 'power3.inOut',
        onComplete: function () { panesWrap.style.height = '' },
      })
      gsap.fromTo(panes[step].querySelectorAll('.enq__legend, .enq__pane-note, .enq__field'),
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.08 })
    })
  }

  next.addEventListener('click', function () { go(1) }, { signal })
  back.addEventListener('click', function () { go(-1) }, { signal })

  /* Enter advances rather than submitting a half-filled form. */
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return
    if (step === panes.length - 1) return
    e.preventDefault()
    go(1)
  }, { signal })

  /**
   * Show the confirmation pane and the recap of what was configured.
   * Split out of the submit handler so the send can await the request.
   */
  function succeed() {
    // Reported once the API has accepted it — see the note in Contact's
    // controller for why not on the click. No-op with no pixel configured.
    trackEnquiry({
      category: 'product',
      system: spec.system || '',
      variant: spec.variant || '',
      series: spec.series || '',
    })

    const rows = [
      ['System', spec.system], ['Variant', spec.variant], ['Series', spec.series],
      ['Glass', spec.glass], ['Finish', spec.finish],
    ].filter(function (r) { return r[1] })

    /* ⚠ THE CONFIRMATION MOVED TO A ROUTE — and the recap moved with it.
       This is a configurator: what it collected is the most useful thing the
       confirmation can say back, so sending everyone to a generic thank-you
       page would have been a downgrade. The rows are carried in the
       navigation state and /thank-you prints them. The in-place pane below
       still runs when this controller is driven outside a router. */
    if (typeof onSuccess === 'function' && onSuccess({
      system: spec.system || '',
      recap: rows.map(function (r) { return { label: r[0], value: r[1] } }),
    })) return

    const recap = section.querySelector('#enqDoneRecap')
    recap.innerHTML = ''
    rows.forEach(function (r) {
      const el = document.createElement('span')
      el.innerHTML = r[0] + ' · <b>' + r[1] + '</b>'
      recap.appendChild(el)
    })

    form.querySelector('.enq__rail').style.display = 'none'
    panesWrap.style.display = 'none'
    section.querySelector('#enqActions').style.display = 'none'
    section.querySelector('#enqLegal').style.display = 'none'
    done.classList.add('is-live')

    if (!prefersReducedMotion()) {
      ctx.add(() => {
        gsap.from(done.children, {
          autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.08, ease: 'power3.out',
        })
      })
    }
    done.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  /**
   * ⚠ THIS FORM NOW SENDS. It did not.
   *
   * The original assembles the payload, attaches `GLZ.spec` as
   * `attribution`, and `console.info`s it — its own comment: "No endpoint is
   * wired up yet — the payload is assembled and logged so the eventual
   * handler has an exact shape to accept." That was faithful to transcribe
   * while there was no backend. There is one now, it is the endpoint
   * Contact's form already posts to, and the eventual handler the comment
   * was waiting for is `/api/v1/enquiries/` — so a specifier's enquiry from
   * the page they configured lands in the same inbox as every other one
   * instead of in a console nobody has open.
   *
   * The five-layer attribution is what makes this worth having: system,
   * variant, series, glass and finish, exactly as the visitor left them
   * further up the page, folded into the message so the first call starts
   * where they did.
   */
  form.addEventListener('submit', function (e) {
    e.preventDefault()
    if (!validate()) return

    const data = new FormData(form)
    const attribution = Object.assign({}, spec)
    const legal = section.querySelector('#enqLegal')

    send.disabled = true
    send.querySelector('span').textContent = 'Sending…'

    const configured = [
      ['System', attribution.system], ['Variant', attribution.variant],
      ['Profile series', attribution.series], ['Glass', attribution.glass],
      ['Frame finish', attribution.finish],
    ].filter(function (row) { return row[1] })
      .map(function (row) { return row[0] + ': ' + row[1] })

    fetch(API_ENQUIRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({
        name: data.get('name') || '',
        email: data.get('email') || '',
        phone: data.get('phone') || '',
        enquiry_type: 'System page',
        system: attribution.system || data.get('system') || '',
        variant: attribution.variant || data.get('variant') || '',
        /* The fields with no column of their own are folded into the message
           rather than dropped — losing the configuration to a schema
           mismatch would be worse than an untidy string, and it is the whole
           value of an enquiry raised from a system page. */
        message: [
          data.get('message') || '',
          data.get('city') ? 'City: ' + data.get('city') : '',
          data.get('stage') ? 'Stage: ' + data.get('stage') : '',
          data.get('openings') ? 'Openings: ' + data.get('openings') : '',
          configured.length ? 'Configured — ' + configured.join(' · ') : '',
        ].filter(Boolean).join('\n\n'),
        source_path: window.location.pathname,
      }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error('api rejected')
        return res.json()
      })
      .then(succeed)
      .catch(function () {
        send.disabled = false
        send.querySelector('span').textContent = 'Send enquiry'
        // Nothing is lost: every field is still filled in, so the visitor
        // can retry — or reach a human — without re-entering anything.
        if (legal) {
          legal.innerHTML =
            'That did not go through. Please try again, or write to ' +
            '<a href="mailto:info@glazewindowsystems.com">info@glazewindowsystems.com</a>.'
        }
      })
  }, { signal })

  render()

  return function cleanup() {
    ac.abort()
    ctx.revert()
    panesWrap.style.height = ''
  }
}

export default initSystemEnquiry
