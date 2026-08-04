import { useEffect } from 'react'
import Lenis from 'lenis'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Lenis smooth scroll — a 1:1 port of the base script in hero.html
 * (lines 4305-4335), about.html and contact.html:
 *
 *   if (!reduceMotion && window.Lenis) {
 *     var lenis = new Lenis({ duration: 1.1, easing: t => ... });
 *     window.__glazeLenis = lenis;
 *     requestAnimationFrame(raf);
 *     // smooth in-page anchor links
 *   }
 *
 * Identical config, identical raf loop, identical global handle. Section
 * scripts (e.g. the Systems rail) reach it through window.__glazeLenis.
 *
 * The one implementation difference: the original attached a click handler
 * to every a[href^="#"] found at load time. React mounts and unmounts
 * anchors as routes change, so this uses a single delegated document
 * listener instead. Same behaviour, correct for a re-rendering tree.
 *
 * NOTE: no ScrollTrigger.scrollerProxy and no lenis.on('scroll',
 * ScrollTrigger.update) — the original did not wire them either. Adding
 * them would change scrub timing across the whole site.
 *
 * `enabled` was added when the admin panel landed. Momentum scrolling is
 * right for an editorial page you read top to bottom and wrong for a
 * dense table you scan and stop on — it overshoots the row you were
 * aiming at. The admin routes therefore mount without it. Defaults to
 * true, so every existing call site behaves exactly as before.
 */
export function useLenis(enabled = true) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t))
      },
    })

    // Shared handle so other section scripts can drive smooth
    // programmatic scrolls through Lenis.
    window.__glazeLenis = lenis

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    })

    // Smooth in-page anchor links via Lenis
    const onDocumentClick = (e) => {
      const anchor = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null
      if (!anchor) return
      const id = anchor.getAttribute('href')
      if (id.length <= 1) return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      lenis.scrollTo(target)
    }
    document.addEventListener('click', onDocumentClick)

    return () => {
      document.removeEventListener('click', onDocumentClick)
      cancelAnimationFrame(rafId)
      lenis.destroy()
      if (window.__glazeLenis === lenis) delete window.__glazeLenis
    }
  }, [enabled])
}

export default useLenis
