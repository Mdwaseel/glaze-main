import { useEffect } from 'react'
import { ScrollTrigger } from '@/utils/gsap'

/**
 * Recompute trigger positions once everything (incl. sections that inject
 * their own height at runtime) has settled.
 *
 * hero.html registers this exact listener three times — in the Philosophy
 * script (line 4653), the Engineering script (4860) and the Systems
 * script (5452):
 *
 *     window.addEventListener('load', function () { ScrollTrigger.refresh(); });
 *
 * Each section that did so gets its own call to this hook, so the number
 * of refreshes on load stays the same as on the static site.
 *
 * @param {object} [options]
 * @param {boolean} [options.immediate=false] also refresh on the next
 *        frame after mount — the Systems script does this as well
 *        (line 5451), nothing else does.
 */
export function useScrollTriggerRefresh(options = {}) {
  const { immediate = false } = options

  useEffect(() => {
    let rafId = 0
    let timerId = 0

    if (immediate) {
      rafId = requestAnimationFrame(function () {
        ScrollTrigger.refresh()
      })
    }

    function onLoad() {
      ScrollTrigger.refresh()
    }

    // The static pages register this during parse, so 'load' is always
    // still ahead of them. React mounts asynchronously and routinely
    // commits AFTER 'load' has already fired (measured: load at 63ms,
    // first effect later) — the listener alone would never run, leaving
    // every trigger on stale start/end positions.
    if (document.readyState === 'complete') {
      // Deferred to a macrotask, NOT called inline. React flushes every
      // mount effect of a commit in one task, and sections inject their
      // own height from those effects (hero and day/night each add a
      // 320vh scrub track). Refreshing inline runs partway through that
      // list, so sections mounted later are measured against a document
      // that is still growing — Arch came out 1760px stale, exactly the
      // height Day & Night added after Philosophy had already refreshed.
      // A timer (not rAF — that never fires in a background tab) runs
      // after the whole commit, which is the guarantee 'load' gave the
      // static pages.
      timerId = setTimeout(function () {
        ScrollTrigger.refresh()
      }, 0)
    } else {
      window.addEventListener('load', onLoad)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      if (timerId) clearTimeout(timerId)
      window.removeEventListener('load', onLoad)
    }
  }, [immediate])
}

export default useScrollTriggerRefresh
