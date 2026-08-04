import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About — stat count-ups.
 *
 * Port of the count-up block in <script id="about-base-script">
 * (about.html lines 4556-4599).
 *
 * ⚠ NOT the Home hook. Differences that make reuse behaviour-changing:
 *   • formatting is `Math.round` + optional [data-format="comma"] →
 *     toLocaleString('en-IN'); Home uses [data-decimals] + toFixed
 *   • the target is parsed with commas stripped
 *   • counters are ZEROED up front (Home leaves the markup value until
 *     the element scrolls in)
 *   • no `exclude` selector — About has no GSAP-driven counters
 * Duration 1600ms and easeOutQuart are the same house curve.
 *
 * Markup carries the final value (single source of truth and the
 * no-JS / reduced-motion state), so with motion reduced this hook does
 * nothing at all — matching the original, which only zeroes and animates
 * inside the `!reduceMotion && IO` guard.
 */
export function useAboutCountUp(scopeRef, options = {}) {
  const {
    selector = '[data-count-to]',
    rootMargin = '-10% 0px',
    duration = 1600,
  } = options

  useEffect(() => {
    // about.html's base script queries `document`; the optional ref is
    // only an extra guard for callers that want a tighter scope. The
    // hook is mounted by the About page alone, so document-wide is safe
    // and it is what reaches the nav CTA (which is outside the sections).
    const scope = scopeRef?.current || document
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    function formatCount(el, value) {
      const v = Math.round(value)
      el.textContent =
        el.getAttribute('data-format') === 'comma' ? v.toLocaleString('en-IN') : String(v)
    }

    function animateCount(el) {
      const target = parseFloat(el.getAttribute('data-count-to').replace(/,/g, ''))
      let startTime = null
      // easeOutQuart — snappy, settles smoothly (the house motion)
      function ease(t) {
        return 1 - Math.pow(1 - t, 4)
      }
      function step(now) {
        if (startTime === null) startTime = now
        const p = Math.min(1, (now - startTime) / duration)
        formatCount(el, target * ease(p))
        if (p < 1) rafId = requestAnimationFrame(step)
        else formatCount(el, target)
      }
      rafId = requestAnimationFrame(step)
    }

    let rafId = 0
    const counters = Array.prototype.slice.call(scope.querySelectorAll(selector))
    if (!counters.length) return

    // Remember the authored values so cleanup can restore them.
    const originals = counters.map(function (el) {
      return el.textContent
    })

    counters.forEach(function (el) {
      formatCount(el, 0)
    })

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target)
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold: 0 }
    )
    counters.forEach(function (el) {
      observer.observe(el)
    })

    return () => {
      observer.disconnect()
      if (rafId) cancelAnimationFrame(rafId)
      // Put the authored values back, so a remount starts from the markup
      // rather than from a zeroed (or half-counted) DOM.
      counters.forEach(function (el, i) {
        el.textContent = originals[i]
      })
    }
  }, [scopeRef, selector, rootMargin, duration])
}

export default useAboutCountUp
