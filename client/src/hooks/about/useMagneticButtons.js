import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About — magnetic buttons.
 *
 * Port of the [data-magnetic] block in <script id="about-base-script">
 * (about.html lines 4725-4745).
 *
 * A soft pull toward the cursor, capped at 6px; the button's own
 * transform transition supplies the easing. Fine pointers with motion
 * allowed only. The x and y factors differ on purpose (0.15 / 0.25).
 *
 * Queries `document` like the original — the only [data-magnetic] element
 * is the nav CTA, which lives in RootLayout outside the page's own
 * markup. The hook is mounted by the About page alone, so it is inert on
 * every other route.
 */
export function useMagneticButtons(scopeRef, options = {}) {
  const { selector = '[data-magnetic]', maxPull = 6 } = options

  useEffect(() => {
    // about.html's base script queries `document`; the optional ref is
    // only an extra guard for callers that want a tighter scope. The
    // hook is mounted by the About page alone, so document-wide is safe
    // and it is what reaches the nav CTA (which is outside the sections).
    const scope = scopeRef?.current || document
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return

    const MAX_PULL = maxPull
    const bound = []

    scope.querySelectorAll(selector).forEach(function (el) {
      function onMove(e) {
        const r = el.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        const fx = Math.max(-MAX_PULL, Math.min(MAX_PULL, dx * 0.15))
        const fy = Math.max(-MAX_PULL, Math.min(MAX_PULL, dy * 0.25))
        el.style.transform = 'translate(' + fx.toFixed(1) + 'px,' + fy.toFixed(1) + 'px)'
      }
      function onLeave() {
        el.style.transform = ''
      }
      el.addEventListener('mousemove', onMove, { passive: true })
      el.addEventListener('mouseleave', onLeave)
      bound.push([el, onMove, onLeave])
    })

    return () => {
      bound.forEach(function (entry) {
        entry[0].removeEventListener('mousemove', entry[1])
        entry[0].removeEventListener('mouseleave', entry[2])
        entry[0].style.transform = ''
      })
    }
  }, [scopeRef, selector, maxPull])
}

export default useMagneticButtons
