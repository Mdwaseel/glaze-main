import { useLayoutEffect, useRef, useState } from 'react'
import { keepMuted } from '@/utils/media'
import './loader.css'

/**
 * Loader — the site preloader.
 *
 * The TIMING ENGINE is about.html's, unchanged: the inline pre-paint gate
 * (lines 655-668) and the driver script #about-loader-script (4858-4933),
 * still plain rAF plus CSS transitions and still deliberately GSAP-free —
 * adding GSAP here would change the timing.
 *
 *   • progress crawls to 92% on a 2200ms clock, eased toward the target by
 *     12% per frame so it never jumps; window "load" (after a 950ms HOLD)
 *     or a 3500ms CAP releases the final stretch to 100
 *   • finish, beat 1: the mark fades and lifts away, 0.5s --ease-snap
 *   • finish, beat 2 (+560ms): the whole plane wipes to translateY(-101%),
 *     0.85s --ease-snap, `is-loading` scroll lock released, hero announced
 *   • +1500ms: display:none
 *
 * ⚠ WHAT IT DRAWS IS NOW THE CLIENT'S CLIP, AND NOTHING ELSE. The
 * wordmark, the "Glass, clear" tagline, the 000-099 counter and the bone
 * curtain are all gone — the brief was the mark alone on a ground that
 * matches its own, with no text under it. Progress therefore has nowhere
 * to be printed, so it drives the mark's opacity (0.88 → 1.00) and scale
 * (0.985 → 1.00) instead, which is the same job the wordmark's
 * blur(8px) → blur(0) used to do.
 *
 * ⚠ THE CLIP IS NOT assets-source/videos/Loader.mp4. That file is 1440² at
 * 10 Mbps — 7.5 MB, on the one screen whose entire purpose is to be over
 * quickly. It is re-encoded to 720² as videos/loader/mark.{mp4,webm}
 * (~650 KB each) with mark.webp as the poster, so the first frame paints
 * from 23 KB and the loop streams in behind it. The original file is left
 * in place, untouched.
 *
 * The gate is evaluated during the first render (not in an effect) so the
 * `loader--on` class is present in the very first commit — same as the
 * inline script that ran before first paint on the static page. Shows only
 * for JS + motion-allowed + first visit this session.
 *
 * ⚠ MOUNTED IN RootLayout, not per page. about.html was the only original
 * that ran a preloader, because it was the only one authored with one;
 * with a brand animation rather than a page-specific wordmark, showing it
 * on whichever public page the visitor lands on first — and exactly once
 * per session, which is what `storageKey` has always enforced — is the
 * behaviour that was asked for.
 *
 * Always ends by announcing 'glaze:reveal-hero' and setting
 * window.__glazeHeroReady, which is what About's hero heading waits on.
 */
export default function Loader({ storageKey = 'glazeSeen' }) {
  const loaderRef = useRef(null)
  const markRef = useRef(null)
  const videoRef = useRef(null)

  // Inline gate — JS + motion allowed + not already seen this session.
  const [enabled] = useState(() => {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const seen = sessionStorage.getItem(storageKey) === '1'
      return !reduce && !seen
    } catch {
      // storage blocked → skip the loader entirely
      return false
    }
  })

  useLayoutEffect(() => {
    function announce() {
      window.__glazeHeroReady = true
      document.dispatchEvent(new CustomEvent('glaze:reveal-hero'))
    }

    // Loader gated off (reduced-motion or a revisit this session) — the
    // hero can assemble immediately.
    if (!enabled) {
      announce()
      return
    }

    const loader = loaderRef.current
    const mark = markRef.current
    const video = videoRef.current
    if (!loader || !mark) return

    // Scroll is locked while the loader owns the screen.
    document.documentElement.classList.add('is-loading')

    // Autoplay can still be refused (a data-saver profile, an unusual
    // policy). The poster is the mark's first frame, so a refusal costs
    // the rotation and nothing else — which is why the rejection is
    // swallowed rather than recovered from.
    if (video) {
      const play = video.play()
      if (play && play.catch) play.catch(function () {})
    }

    const start = performance.now()
    let progress = 0 // eased display progress 0→1
    let loaded = document.readyState === 'complete'
    const HOLD = 950 // ms before "load" can complete the count
    const CAP = 3500 // absolute ceiling — never trap the page

    let rafId = 0
    const timers = []

    const onLoad = () => {
      loaded = true
    }
    window.addEventListener('load', onLoad)

    function finish() {
      try {
        sessionStorage.setItem(storageKey, '1')
      } catch { /* storage blocked */ }

      // Beat 1 — the mark lets go before the plane moves, so the two
      // never travel together.
      mark.style.transition =
        'opacity 0.5s cubic-bezier(0.19, 1, 0.22, 1), transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)'
      mark.style.opacity = '0'
      mark.style.transform = 'scale(1.04)'

      // Beat 2 — … then the whole plane wipes up into the page.
      timers.push(
        setTimeout(function () {
          loader.style.transition = 'transform 0.85s cubic-bezier(0.19, 1, 0.22, 1)'
          loader.style.transform = 'translateY(-101%)'
          document.documentElement.classList.remove('is-loading')
          announce()
        }, 560)
      )

      timers.push(
        setTimeout(function () {
          loader.style.display = 'none'
          loader.classList.remove('loader--on')
          // Nothing is looking at it any more; decoding a clip behind a
          // display:none plane is pure battery.
          if (video) video.pause()
        }, 1500)
      )
    }

    function tick(now) {
      const elapsed = now - start
      // Crawl to 92% on a clock; the real window "load" (or the
      // ceiling) releases the last stretch.
      let target = Math.min(0.92, elapsed / 2200)
      if ((loaded && elapsed > HOLD) || elapsed > CAP) target = 1

      // ease toward the target so the mark never snaps
      progress += (target - progress) * 0.12
      if (target === 1 && progress > 0.995) progress = 1

      // The counter's job, given to the mark itself: it resolves as the
      // page does.
      mark.style.opacity = String(0.88 + 0.12 * progress)
      mark.style.transform = 'scale(' + (0.985 + 0.015 * progress).toFixed(4) + ')'

      if (progress >= 1) {
        finish()
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      timers.forEach(clearTimeout)
      window.removeEventListener('load', onLoad)
      document.documentElement.classList.remove('is-loading')
    }
  }, [enabled, storageKey])

  return (
    <div
      className={enabled ? 'loader loader--on' : 'loader'}
      id="loader"
      aria-hidden="true"
      ref={loaderRef}
    >
      <div className="loader__mark" ref={markRef}>
        <video
          ref={(el) => { videoRef.current = el; keepMuted(el) }}
          poster="/videos/loader/mark.webp"
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          tabIndex={-1}
        >
          {/* WebM first: it is the smaller of the two everywhere it is
              understood, and Safari falls straight through to the MP4. */}
          <source src="/videos/loader/mark.webm" type="video/webm" />
          <source src="/videos/loader/mark.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  )
}
