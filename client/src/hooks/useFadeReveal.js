import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * FadeInUp reveal — opacity + 28px upward drift, added by toggling
 * `.is-revealed` on `.fade-up` elements.
 *
 * Port of the fadeObserver from the base script in hero.html
 * (lines 4267-4282), plus the grouped variant used for the horizontal
 * Architectural Freedom cards (lines 4284-4300): those slide in from
 * off-screen, so the whole set is revealed together the moment the
 * section enters view, rather than card by card.
 *
 * Reduced motion is handled by the CSS guard in styles/global.css
 * (.fade-up is forced visible), so, like the original, no observer is
 * created at all in that case.
 *
 * @param {React.RefObject<HTMLElement>} scopeRef container to search
 * @param {object} [options]
 * @param {string} [options.selector='.fade-up']
 * @param {string} [options.rootMargin='-10% 0px'] triggers a touch earlier
 * @param {boolean} [options.group=false] reveal every match at once
 */
export function useFadeReveal(scopeRef, options = {}) {
  const {
    selector = '.fade-up',
    rootMargin = '-10% 0px',
    group = false,
  } = options

  useEffect(() => {
    const scope = scopeRef?.current
    if (!scope) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    const targets = scope.querySelectorAll(selector)
    if (!targets.length) return

    if (group) {
      // Staggered group: the section itself is the trigger.
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              targets.forEach(function (c) {
                c.classList.add('is-revealed')
              })
              observer.disconnect()
            }
          })
        },
        { rootMargin, threshold: 0 }
      )
      observer.observe(scope)
      return () => observer.disconnect()
    }

    // Per-element, once only.
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold: 0 }
    )
    targets.forEach(function (el) {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [scopeRef, selector, rootMargin, group])
}

export default useFadeReveal
