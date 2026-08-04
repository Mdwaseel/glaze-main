import { gsap, ScrollTrigger } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'
import { countTo, setSpec } from '@/utils/glz'

/**
 * Products §05 — the profile-series accordion.
 *
 * Port of the sixth script in products/sliding.html (lines 3628-3744).
 *
 * Twelve cards share ONE detail panel below the grid. Every card carries
 * its numbers as `data-*`; the panel declares which metrics it shows and
 * reads them off whichever card is open, so a system with a different
 * metric set reuses the panel untouched — the original's own note.
 * Opening a card also writes the series into the shared spec, which is
 * what puts it on the enquiry form and the standing spec sheet.
 *
 * The panel's height is TWEENED, not toggled: it is measured at `auto`,
 * snapped back, then animated, and settled to `auto` again on complete so
 * later reflows do not clip it. `ScrollTrigger.refresh()` follows because
 * the page just got taller.
 *
 * ⚠ ONE CARD OPENS ITSELF. When the grid first scrolls into view the
 * first card is clicked, "so the numbers are never a blank". That is the
 * authored behaviour and it is why the panel is not empty on arrival.
 *
 * ⚠ TEARDOWN. The original never unbinds. Here an AbortController drops
 * every listener, the IntersectionObserver is disconnected, and the GSAP
 * context reverts the height tween — otherwise StrictMode's second mount
 * would bind a second set of handlers to the same twelve cards and the
 * auto-open would fire twice.
 */
export function initSeriesAccordion(section) {
  if (!section) return
  const grid = section.querySelector('#serGrid')
  const panel = section.querySelector('#serPanel')
  if (!grid || !panel) return

  const inner = panel.querySelector('.ser__panel-in')
  const nameEl = section.querySelector('#serPanelName')
  const kindEl = section.querySelector('#serPanelKind')
  const noteEl = section.querySelector('#serPanelNote')
  const cards = [].slice.call(grid.querySelectorAll('.ser__card'))
  const metrics = [].slice.call(panel.querySelectorAll('[data-metric]'))
  let open = null

  const ac = new AbortController()
  const { signal } = ac
  const ctx = gsap.context(() => {})

  cards.forEach(function (c) { c.setAttribute('aria-expanded', 'false') })
  panel.setAttribute('aria-hidden', 'true')

  function fill(card) {
    const name = card.dataset.name
    /* Code first, designation in italic — "GWS-N1-201 SD + SN"
       becomes GWS-N1-201 *SD + SN*. Names without a designation
       (GWS-N1-60H) stay upright. */
    const split = /^(\S+)\s+(.+)$/.exec(name)
    nameEl.innerHTML = split
      ? split[1] + ' <em>' + split[2] + '</em>'
      : name
    card.setAttribute('aria-expanded', 'true')
    kindEl.innerHTML = card.dataset.kind

    if (noteEl) {
      noteEl.textContent = card.dataset.note || ''
      noteEl.hidden = !card.dataset.note
    }

    /* The panel declares which metrics it shows; each card carries a
       matching data-* value. Systems with a different metric set
       (bi-fold counts panels, not sash weight) reuse this untouched. */
    metrics.forEach(function (el) {
      const value = card.dataset[el.dataset.metric]
      if (value === undefined) { el.textContent = '—'; return }
      if (el.hasAttribute('data-text')) { el.textContent = value; return }
      let dec = parseInt(card.dataset[el.dataset.metric + 'dec'], 10)
      if (isNaN(dec)) dec = parseInt(el.dataset.dec, 10) || 0
      countTo(el, value, dec)
    })
  }

  function setHeight(px) {
    if (prefersReducedMotion()) { panel.style.height = px === 0 ? '0px' : 'auto'; return }
    ctx.add(() => {
      gsap.to(panel, {
        height: px,
        duration: 0.62,
        ease: 'power3.inOut',
        onComplete: function () {
          if (px > 0) panel.style.height = 'auto'
          ScrollTrigger.refresh()
        },
      })
    })
  }

  function close() {
    if (!open) return
    panel.style.height = panel.scrollHeight + 'px'
    open.classList.remove('is-open')
    open.setAttribute('aria-expanded', 'false')
    open = null
    panel.setAttribute('aria-hidden', 'true')
    requestAnimationFrame(function () { setHeight(0) })
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      if (open === card) { close(); return }
      if (open) { open.classList.remove('is-open'); open.setAttribute('aria-expanded', 'false') }

      open = card
      card.classList.add('is-open')
      card.setAttribute('aria-expanded', 'true')
      panel.setAttribute('aria-hidden', 'false')
      fill(card)

      /* Measure the target height with the panel briefly at auto,
         then put the previous height back so the tween has a real
         distance to travel. */
      const prev = panel.getBoundingClientRect().height
      panel.style.height = 'auto'
      const target = inner.offsetHeight
      panel.style.height = prev + 'px'
      requestAnimationFrame(function () { setHeight(target) })

      setSpec('series', card.dataset.name)
    }, { signal })
  })

  /* The CTA inside the panel carries the open series into the form. */
  const cta = panel.querySelector('[data-pick-series]')
  if (cta) {
    cta.addEventListener('click', function () {
      if (open) setSpec('series', open.dataset.name)
    }, { signal })
  }

  /* No-JS parity is handled by CSS; with JS on, open the first card
     once the section is reached so the numbers are never a blank. */
  let io = null
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return
      io.disconnect()
      if (!open) cards[0].click()
    }, { threshold: 0.25 })
    io.observe(grid)
  } else {
    cards[0].click()
  }

  return function cleanup() {
    ac.abort()
    if (io) io.disconnect()
    ctx.revert()
    panel.style.height = ''
  }
}

export default initSeriesAccordion
