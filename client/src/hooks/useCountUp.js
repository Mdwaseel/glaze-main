import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'
import { formatCount, readCountTarget, setFinalCount } from '@/utils/counters'

/**
 * Stat count-up — numbers ease from 0 to their [data-count-to] value the
 * first time they scroll into view.
 *
 * Port of the count-up block in the base script of hero.html
 * (lines 4147-4196). Duration 1600 ms, easeOutQuart (1 - (1-t)^4) —
 * "snappy, settles smoothly (matches the motion language)". Decimal
 * places come from [data-decimals].
 *
 * If motion is reduced or IntersectionObserver is missing, the final
 * numbers are written immediately, exactly as the original did.
 *
 * @param {React.RefObject<HTMLElement>} scopeRef container to search
 * @param {object} [options]
 * @param {string} [options.selector='[data-count-to]']
 * @param {string} [options.exclude] skip matches inside this selector —
 *        hero.html passes '.philosophy', whose stats GSAP drives instead,
 *        so they are never animated twice
 * @param {string} [options.rootMargin='-10% 0px']
 * @param {number} [options.duration=1600]
 */
export function useCountUp(scopeRef, options = {}) {
  const {
    selector = '[data-count-to]',
    exclude = null,
    rootMargin = '-10% 0px',
    duration = 1600,
  } = options

  useEffect(() => {
    const scope = scopeRef?.current
    if (!scope) return

    function animateCount(el) {
      const target = readCountTarget(el)
      let startTime = null
      // easeOutQuart — snappy, settles smoothly
      function ease(t) {
        return 1 - Math.pow(1 - t, 4)
      }
      function step(now) {
        if (startTime === null) startTime = now
        const p = Math.min(1, (now - startTime) / duration)
        formatCount(el, target * ease(p))
        if (p < 1) requestAnimationFrame(step)
        else formatCount(el, target)
      }
      requestAnimationFrame(step)
    }

    const counters = Array.prototype.slice
      .call(scope.querySelectorAll(selector))
      .filter(function (el) {
        return exclude ? !el.closest(exclude) : true
      })

    if (!counters.length) return

    // If motion is reduced or IO is unsupported, just show final numbers.
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      counters.forEach(setFinalCount)
      return
    }

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

    return () => observer.disconnect()
  }, [scopeRef, selector, exclude, rootMargin, duration])
}

export default useCountUp
