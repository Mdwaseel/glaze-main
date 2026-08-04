import { countTo, setSpec } from '@/utils/glz'

/**
 * Products §07 — the glass switcher.
 *
 * Port of the seventh script in products/sliding.html (lines 3747-3818).
 *
 * Eight full renders of the SAME room are stacked in `.gls__stage`; the
 * switcher only changes which one is `is-live`, so what the visitor
 * compares is the glazing and nothing else. Hovering or focusing a sample
 * previews it; clicking LOCKS it, writes it into the shared spec, and
 * becomes what the panel snaps back to when the pointer leaves.
 *
 * The spec rows roll to their new figures through `countTo`, so the
 * numbers read as measurements changing rather than text being replaced.
 *
 * Arrow keys move through the group, because it is marked
 * `role="radiogroup"` and a radiogroup should behave like one.
 *
 * ⚠ TEARDOWN. One AbortController for all thirty-odd listeners; the
 * original never unbinds.
 */
export function initGlassSwitcher(section) {
  if (!section) return
  const wrap = section.querySelector('#glsSamples')
  const stage = section.querySelector('#glsStage')
  if (!wrap || !stage) return

  const samples = [].slice.call(wrap.querySelectorAll('.gls__sample'))
  const layers = {}
  ;[].slice.call(stage.querySelectorAll('[data-glass-layer]')).forEach(function (l) {
    layers[l.dataset.glassLayer] = l
  })

  const descEl = section.querySelector('#glsDesc')
  const privEl = section.querySelector('#gPriv')
  let locked = samples[0]

  const ac = new AbortController()
  const { signal } = ac

  function show(btn) {
    const key = btn.dataset.glass
    Object.keys(layers).forEach(function (k) {
      layers[k].classList.toggle('is-live', k === key)
    })
    descEl.textContent = btn.dataset.desc
    privEl.textContent = btn.dataset.priv
    countTo(section.querySelector('#gU'), btn.dataset.u, 1)
    countTo(section.querySelector('#gShgc'), btn.dataset.shgc, 2)
    countTo(section.querySelector('#gVlt'), btn.dataset.vlt, 0)
    countTo(section.querySelector('#gRw'), btn.dataset.rw, 0)
    countTo(section.querySelector('#gUv'), btn.dataset.uv, 0)
  }

  function mark(btn) {
    samples.forEach(function (s) {
      const on = s === btn
      s.classList.toggle('is-active', on)
      s.setAttribute('aria-checked', String(on))
    })
  }

  samples.forEach(function (btn) {
    /* Hover previews without committing; leaving the panel snaps
       back to whatever was last clicked. */
    btn.addEventListener('mouseenter', function () { show(btn); mark(btn) }, { signal })
    btn.addEventListener('focus', function () { show(btn); mark(btn) }, { signal })
    btn.addEventListener('click', function () {
      locked = btn
      show(btn)
      mark(btn)
      setSpec('glass', btn.dataset.name)
    }, { signal })
  })

  wrap.addEventListener('mouseleave', function () { show(locked); mark(locked) }, { signal })
  wrap.addEventListener('focusout', function (e) {
    if (wrap.contains(e.relatedTarget)) return
    show(locked); mark(locked)
  }, { signal })

  /* Keyboard: a radiogroup should move with the arrow keys. */
  wrap.addEventListener('keydown', function (e) {
    const i = samples.indexOf(document.activeElement)
    if (i < 0) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = samples[(i + 1) % samples.length]
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = samples[(i - 1 + samples.length) % samples.length]
    if (!next) return
    e.preventDefault()
    next.focus()
    next.click()
  }, { signal })

  return function cleanup() {
    ac.abort()
  }
}

export default initGlassSwitcher
