/**
 * Products §09 — the Performance Lab strip.
 *
 * Port of the ninth script in products/sliding.html (lines 3880-3920).
 *
 * Five test films in one row. They are authored `preload="none"` because
 * five clips is a lot to hold open; an IntersectionObserver upgrades them
 * to `auto` and starts them only once the strip is near the viewport, and
 * pauses and re-mutes them when it leaves. Hovering one unmutes it at 70%
 * volume for as long as the pointer stays.
 *
 * ⚠ TEARDOWN. The observer is disconnected and every listener dropped;
 * without it a route change would leave five clips playing audio into a
 * page that no longer exists. The videos are also paused and re-muted, so
 * nothing survives the unmount — the original never had to consider it
 * because leaving the page destroyed the document.
 */
export function initLabStrip(strip) {
  if (!strip) return

  const films = [].slice.call(strip.querySelectorAll('.plab__film'))
  const ac = new AbortController()
  const { signal } = ac
  let observer = null

  /* Five clips is a lot to hold open — they only run while the
     strip is actually on screen. */
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      const live = entries[0].isIntersecting
      films.forEach(function (f) {
        const v = f.querySelector('video')
        if (!v) return
        if (live) {
          if (v.preload === 'none') { v.preload = 'auto'; v.load() }
          const p = v.play()
          if (p && p.catch) p.catch(function () {})
        } else {
          v.pause()
          v.muted = true
        }
      })
    }, { rootMargin: '200px 0px' })
    observer.observe(strip)
  }

  films.forEach(function (f) {
    const v = f.querySelector('video')
    if (!v) return
    f.addEventListener('mouseenter', function () {
      v.muted = false
      v.volume = 0.7
      const p = v.play()
      if (p && p.catch) p.catch(function () {})
    }, { signal })
    f.addEventListener('mouseleave', function () { v.muted = true }, { signal })
  })

  return function cleanup() {
    ac.abort()
    if (observer) observer.disconnect()
    films.forEach(function (f) {
      const v = f.querySelector('video')
      if (!v) return
      v.pause()
      v.muted = true
    })
  }
}

export default initLabStrip
