import { setSpec } from '@/utils/glz'

/**
 * Products §08 — the frame-finish switcher.
 *
 * Port of the eighth script in products/sliding.html (lines 3821-3877).
 *
 * The same profile corner photographed in eight finishes, stacked as
 * layers; the swatches swap which is live and restamp the caption.
 * Hover and focus preview, click locks — the same grammar as the glass
 * switcher, and the same arrow-key handling for the radiogroup.
 *
 * ⚠ CLICKING WRITES TWO SPEC KEYS. `finish` is the colour the visitor
 * saw; `finishType` is the family the form records, "because the exact
 * RAL is settled with a specifier" — the original's note on the spec
 * object. The standing spec sheet mirrors the first, the form's select
 * mirrors the second.
 *
 * ⚠ TEARDOWN via AbortController; the original never unbinds.
 */
export function initFinishSwitcher(section) {
  if (!section) return
  const wrap = section.querySelector('#finSwatches')
  const stage = section.querySelector('#finStage')
  const stamp = section.querySelector('#finStamp')
  if (!wrap || !stage) return

  const sws = [].slice.call(wrap.querySelectorAll('.fin__sw'))
  const layers = {}
  ;[].slice.call(stage.querySelectorAll('[data-finish-layer]')).forEach(function (l) {
    layers[l.dataset.finishLayer] = l
  })
  let locked = sws[0]

  const ac = new AbortController()
  const { signal } = ac

  function show(btn) {
    const key = btn.dataset.finish
    Object.keys(layers).forEach(function (k) {
      layers[k].classList.toggle('is-live', k === key)
    })
    stamp.textContent = 'Finish · ' + btn.dataset.name
    sws.forEach(function (s) {
      const on = s === btn
      s.classList.toggle('is-active', on)
      s.setAttribute('aria-checked', String(on))
    })
  }

  sws.forEach(function (btn) {
    btn.addEventListener('mouseenter', function () { show(btn) }, { signal })
    btn.addEventListener('focus', function () { show(btn) }, { signal })
    btn.addEventListener('click', function () {
      locked = btn
      show(btn)
      setSpec('finish', btn.dataset.name)
      setSpec('finishType', btn.dataset.family)
    }, { signal })
  })

  wrap.addEventListener('mouseleave', function () { show(locked) }, { signal })
  wrap.addEventListener('focusout', function (e) {
    if (!wrap.contains(e.relatedTarget)) show(locked)
  }, { signal })

  wrap.addEventListener('keydown', function (e) {
    const i = sws.indexOf(document.activeElement)
    if (i < 0) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = sws[(i + 1) % sws.length]
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = sws[(i - 1 + sws.length) % sws.length]
    if (!next) return
    e.preventDefault()
    next.focus()
    next.click()
  }, { signal })

  return function cleanup() {
    ac.abort()
  }
}

export default initFinishSwitcher
