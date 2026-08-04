/**
 * "Wait for the preloader before making an entrance."
 *
 * The preloader used to run on About alone, so About's hero was the only
 * thing that ever had to wait for it — which it does by checking
 * `window.__glazeHeroReady` and then listening for `glaze:reveal-hero`
 * (see aboutHeroAnimation.js, lines 42-51). Now that the loader opens the
 * whole site from RootLayout, every page that plays an entrance ON LOAD
 * has the same problem: the loader owns the screen for up to three and a
 * half seconds, and a 2.3-second title curtain that runs underneath it is
 * a title curtain nobody sees.
 *
 * This is that same wait, factored out so the three page-level entrance
 * systems can share it rather than each growing its own copy.
 *
 * ⚠ IT IS NOT A DELAY. When the loader is gated off — a revisit in the
 * same session, reduced motion, storage blocked — the Loader announces
 * during its own layout effect, which React runs BEFORE any page effect
 * (the Loader is rendered above <Outlet/> in RootLayout, and siblings'
 * layout effects run in document order). So `__glazeHeroReady` is already
 * true by the time this is called and `run` fires synchronously, exactly
 * as if the wrapper were not there. That is the common case.
 *
 * @param {() => (void | (() => void))} run  the entrance to build. May
 *        return its own cleanup, which is called on unmount whether or
 *        not the entrance ever got to run.
 * @returns {() => void} cleanup, for returning straight out of an effect.
 */
export function whenRevealed(run) {
  let inner = null
  let done = false

  function fire() {
    done = true
    inner = run() || null
  }

  if (window.__glazeHeroReady) {
    fire()
    return () => { if (inner) inner() }
  }

  document.addEventListener('glaze:reveal-hero', fire, { once: true })
  return () => {
    if (!done) document.removeEventListener('glaze:reveal-hero', fire)
    if (inner) inner()
  }
}

export default whenRevealed
