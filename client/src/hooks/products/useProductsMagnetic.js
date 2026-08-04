import { useEffect } from 'react'
import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Products — magnetic pointer pull.
 *
 * Port of the second half of the hero script in products/sliding.html
 * (lines 3598-3623). The first half of that script is the video autoplay
 * guard, which belongs to the hero itself and lands in SystemHeroSection.
 *
 * Anything marked `[data-magnetic]` (the scroll cue, and the nav CTA that
 * RootLayout marks on inner pages) leans toward the pointer within 190px;
 * the form's `.enq__btn` actions do the same within 110px at a weaker
 * pull. One `mousemove` listener drives all of them, exactly as authored.
 *
 * ⚠ This is NOT the same effect as `useMagneticButtons` /
 * `useContactMagneticButtons`, which port About's and Contact's own
 * scripts: those cap the pull at 6px and hand the easing to a CSS
 * transition. This one uses `gsap.quickTo` and scales the pull with
 * distance. Both exist in the originals; neither is a generalisation of
 * the other, so this is a separate hook rather than a shared one.
 *
 * The elements are collected ONCE on mount, as in the original. Every
 * `[data-magnetic]` and `.enq__btn` on a system page is rendered in the
 * same commit as the page, so they are all present — and the enquiry
 * form's Back/Send buttons are only `hidden`, never unmounted, so the
 * list never goes stale.
 */
export function useProductsMagnetic() {
  useEffect(() => {
    if (prefersReducedMotion()) return

    /* Anything marked magnetic leans a little toward the pointer and
       springs back when it leaves — the scroll cue and the primary
       form actions share one handler. */
    const magnets = [].slice.call(document.querySelectorAll('[data-magnetic], .enq__btn'))
      .map(function (el) {
        return {
          el: el,
          radius: el.hasAttribute('data-magnetic') ? 190 : 110,
          pull: el.hasAttribute('data-magnetic') ? 0.28 : 0.22,
          x: gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' }),
          y: gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' }),
        }
      })

    function onMove(e) {
      magnets.forEach(function (m) {
        const r = m.el.getBoundingClientRect()
        if (!r.width) return
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        if (Math.hypot(dx, dy) < m.radius) { m.x(dx * m.pull); m.y(dy * m.pull) }
        else { m.x(0); m.y(0) }
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      // quickTo leaves an inline transform behind; the nav CTA outlives
      // this route, so its pull is cleared rather than frozen mid-lean.
      magnets.forEach(function (m) { gsap.set(m.el, { clearProps: 'x,y' }) })
    }
  }, [])
}

export default useProductsMagnetic
