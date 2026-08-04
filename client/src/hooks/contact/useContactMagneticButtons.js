import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Contact — magnetic buttons.
 *
 * Port of the [data-magnetic] block in <script id="contact-base-script">
 * (contact.html lines 2569-2585).
 *
 * A soft pull toward the cursor, capped at 6px; the button's own
 * transform transition supplies the easing. Fine pointers with motion
 * allowed only. The x and y factors differ on purpose (0.15 / 0.25).
 *
 * Queries `document` like the original — on the shell the only
 * [data-magnetic] element is the nav CTA, which lives in RootLayout
 * outside the page's own markup. Section 02's submit button also carries
 * it once that section lands. The hook is mounted by the Contact page
 * alone, so it is inert on every other route.
 *
 * ⚠ Behaviour-identical to useMagneticButtons in hooks/about; duplicated
 * rather than shared because those files are audited (Phase 26).
 */
export function useContactMagneticButtons(scopeRef, options = {}) {
  const { selector = '[data-magnetic]', maxPull = 6 } = options

  useEffect(() => {
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

export default useContactMagneticButtons
