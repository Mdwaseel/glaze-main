import { useEffect } from 'react'
import { ScrollTrigger } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Products — the two things this page's Lenis block does that the shared
 * one does not.
 *
 * products/sliding.html ships its own smooth-scroll script (lines
 * 3380-3409). It is NOT byte-identical to hero/about/contact's, which is
 * what App.jsx's `useLenis` ports:
 *
 *                       shared (hero/about/contact)   products
 *   duration            1.1                           1.05
 *   easing              custom exponential            Lenis default
 *   ScrollTrigger sync  none (deliberately)           lenis.on('scroll', …)
 *   anchor scroll       scrollTo(target)              scrollTo(target,
 *                                                       { offset: -(navH + 24) })
 *
 * A SECOND Lenis instance is not an option — two would drive the same
 * scroll and fight. So the shared instance stays, and this hook adds the
 * two behaviours that actually change what the visitor sees, for exactly
 * as long as a Products page is mounted:
 *
 *   1. ScrollTrigger.update on every Lenis frame. Without it every scrub
 *      on this page (the hero parallax) lags the smoothed scroll. The
 *      shared hook deliberately omits this because wiring it globally
 *      would change scrub timing on Home and About, which their originals
 *      do not do — subscribing here keeps it to this route.
 *
 *   2. The anchor offset. Every in-page link on this page ("Scroll",
 *      "Enquire with this series", the nav CTA) must land clear of the
 *      fixed nav, or it arrives underneath it. Registered in the CAPTURE
 *      phase with stopPropagation, so it runs before the shared bubble
 *      handler regardless of which mounted first and the offsetless
 *      scroll never happens.
 *
 * ⚠ The 1.05-vs-1.1 duration and the easing curve are NOT reproduced.
 * Both belong to the Lenis constructor, and the instance is the app's.
 * The difference is a ~50ms variation in the settle of a smoothed scroll;
 * it is the one knowingly-accepted deviation on these pages.
 *
 * Everything here is skipped under reduced motion, where `useLenis`
 * never constructs an instance and native scrolling (with the CSS
 * `scroll-margin-top` from products-global.css) already clears the nav.
 */
export function useProductsScrollBridge() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    const lenis = window.__glazeLenis
    if (!lenis) return

    lenis.on('scroll', ScrollTrigger.update)

    /* Hand in-page anchors to Lenis so the eased scroll and the
       sticky-bar offset agree with each other. */
    function onClick(e) {
      if (!e.target || !e.target.closest) return
      const a = e.target.closest('a[href^="#"]')
      if (!a) return
      const id = a.getAttribute('href')
      if (id === '#' || id.length < 2) return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      // keeps the shared, offsetless handler in App.jsx from also firing
      e.stopPropagation()
      const offset = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--sys-nav-h'), 10) || 94
      lenis.scrollTo(target, { offset: -(offset + 24) })
    }
    document.addEventListener('click', onClick, true)

    return () => {
      document.removeEventListener('click', onClick, true)
      lenis.off('scroll', ScrollTrigger.update)
    }
  }, [])
}

export default useProductsScrollBridge
