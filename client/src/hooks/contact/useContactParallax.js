import { useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Contact — the shared image parallax.
 *
 * Port of <script id="contact-parallax-script"> in contact.html
 * (lines 3152-3190).
 *
 * The tall form image (§02) and the two CTA images (§04) drift on slower
 * planes as the page scrolls: each `[data-parallax]` wrapper is scrubbed
 * from -range to +range over its own passage through the viewport, with
 * the images pre-scaled 1.12 so no edge is ever exposed. The attribute's
 * value is a SIGNED range — §04's second figure carries -14 so it drifts
 * against the first, which is what makes the pair feel offset.
 *
 * ⚠ THIS IS A PAGE-LEVEL HOOK, not a section module, because the original
 * is a page-level script: one `document.querySelectorAll('[data-parallax]')`
 * covering two sections that are not related to each other. Splitting it
 * per-section would create two scripts where contact.html has one.
 *
 * Gated exactly as on about.html: reduced motion, and nothing else. (The
 * original also checks `window.gsap && window.ScrollTrigger` because it
 * loads them from a CDN that can fail; here they are module imports, so
 * that branch cannot be false and is dropped — the same call the Home and
 * About ports make.) Without motion the images simply sit still.
 *
 * ⚠ THE LOAD REFRESH BELONGS HERE. This is the only `load → refresh` on
 * the Contact page, and in the original it lives inside this script's
 * motion guard — so a reduced-motion visitor never registers it. That is
 * why the page shell does NOT mount useScrollTriggerRefresh (which is
 * unconditional): it would add a refresh contact.html does not have. The
 * `readyState === 'complete'` branch is the same problem that hook
 * documents — React routinely commits after 'load' has already fired, so
 * the listener alone would never run.
 */
export function useContactParallax() {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return

    let timerId = 0

    // gsap.context owns every set, tween and ScrollTrigger, so one
    // revert() on unmount clears the triggers and restores the images.
    // The original never tears down — contact.html simply ends — but in
    // React the page remounts on every return to /contact, and surviving
    // triggers would scrub a detached tree.
    const ctx = gsap.context(() => {
      document.querySelectorAll('[data-parallax]').forEach(function (wrap) {
        // a crossfading stack moves as one plane; single images move
        // themselves
        const img = wrap.querySelector('[data-parallax-target]') ||
          wrap.querySelector('img')
        if (!img) return
        // signed range: negative values drift the opposite way, so
        // the two CTA images feel offset from each other
        const range = parseFloat(wrap.getAttribute('data-parallax')) || 24
        gsap.set(img, { scale: 1.12 })
        gsap.fromTo(img, { y: -range }, {
          y: range,
          ease: 'none',
          scrollTrigger: {
            trigger: wrap,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.4,
          },
        })
      })
    })

    // pin heights settle after images/fonts load
    function onLoad() {
      ScrollTrigger.refresh()
    }

    if (document.readyState === 'complete') {
      timerId = window.setTimeout(onLoad, 0)
    } else {
      window.addEventListener('load', onLoad)
    }

    return () => {
      if (timerId) window.clearTimeout(timerId)
      window.removeEventListener('load', onLoad)
      ctx.revert()
    }
  }, [])
}

export default useContactParallax
