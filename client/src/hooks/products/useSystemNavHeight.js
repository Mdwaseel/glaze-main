import { useLayoutEffect } from 'react'

/**
 * Products — measure the real nav and publish it as `--sys-nav-h`.
 *
 * Port of the measuring half of the navigation script in
 * products/sliding.html (lines 3425-3433). The other half of that script
 * — the `nav--scrolled` toggle and the drawer — is already the shared
 * Navbar component, so only this lands here.
 *
 *     function measure() {
 *       var h = nav.getBoundingClientRect().height;
 *       document.documentElement.style.setProperty('--sys-nav-h', …);
 *     }
 *
 * The token drives two things that would otherwise be guesswork: the
 * `scroll-margin-top` on every `[id]` (products-global.css) and the
 * offset the Lenis anchor handler scrolls to. The 94px in
 * products-global.css is the fallback the original ships for the moment
 * before this runs.
 *
 * ⚠ LAYOUT effect. The measurement has to be in place before the first
 * anchor jump can happen, and the original runs at parse time.
 *
 * ⚠ The inline property is REMOVED on unmount. It lives on
 * <html>, which outlives the route; left behind it would keep giving
 * Home, About and Contact a scroll-margin they do not have — the
 * `[id]` rule that reads it is scoped to `.page-products`, but the
 * variable itself is not, and leaving stale inline state on the document
 * element is the kind of leak the other page hooks all clean up.
 */
export function useSystemNavHeight() {
  useLayoutEffect(() => {
    const nav = document.getElementById('nav')
    if (!nav) return

    /* The sticky switcher parks under the real nav, whatever height
       the nav happens to be at this breakpoint. */
    function measure() {
      const h = nav.getBoundingClientRect().height
      document.documentElement.style.setProperty('--sys-nav-h', Math.round(h) + 'px')
    }
    measure()
    window.addEventListener('resize', measure)
    // Fonts change the nav's height, so it is measured again once they land.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure)

    return () => {
      window.removeEventListener('resize', measure)
      document.documentElement.style.removeProperty('--sys-nav-h')
    }
  }, [])
}

export default useSystemNavHeight
