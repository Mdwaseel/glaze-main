import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Contact — FadeInUp + image wipe, and the `motion-ok` gate.
 *
 * Port of the fade half of the reveal block in
 * <script id="contact-base-script"> (contact.html lines 2455, 2547-2562).
 *
 * One observer is shared between `.fade-up` AND `.wipe-in`, where
 * `is-revealed` opens a horizontal clip mask instead of lifting opacity.
 * It also owns `html.motion-ok`.
 *
 * The gate matters: `.motion-ok .wipe-in` is what applies
 * `clip-path: inset(0 100% 0 0)`. It is added ONLY inside the
 * `!reduceMotion && IntersectionObserver` guard, so a no-JS or
 * reduced-motion visitor can never be left with a permanently clipped
 * frame. Removing it on cleanup is therefore mandatory — leaving it on
 * <html> after the Contact page unmounts would clip any `.wipe-in` a
 * later route rendered.
 *
 * ⚠ Behaviour-identical to useAboutFadeReveal; duplicated rather than
 * shared because about-global/hooks are audited (Phase 26). See the note
 * in useContactWordReveal.
 */
export function useContactFadeReveal(scopeRef, options = {}) {
  const { selector = '.fade-up, .wipe-in', rootMargin = '-10% 0px' } = options

  useEffect(() => {
    // contact.html's base script queries `document`; the optional ref is
    // only an extra guard. The hook is mounted by the Contact page alone.
    const scope = scopeRef?.current || document
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    document.documentElement.classList.add('motion-ok')

    const targets = scope.querySelectorAll(selector)

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

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('motion-ok')
      targets.forEach(function (el) {
        el.classList.remove('is-revealed')
      })
    }
  }, [scopeRef, selector, rootMargin])
}

export default useContactFadeReveal
