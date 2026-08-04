import { useLayoutEffect, useRef, useState } from 'react'
import { keepMuted } from '@/utils/media'
import { bootPending, bootProgress } from '@/utils/boot'
import { ScrollTrigger } from '@/utils/gsap'
import './loader.css'

/**
 * Loader — the site preloader.
 *
 * The MOTION is about.html's, unchanged: plain rAF plus CSS transitions,
 * no GSAP timeline — adding one would change the feel.
 *
 *   • progress eases toward its target by 12% per frame so it never jumps
 *   • finish, beat 1: the mark fades and lifts away, 0.5s --ease-snap
 *   • finish, beat 2 (+560ms): the whole plane wipes to translateY(-101%),
 *     0.85s --ease-snap, `is-loading` scroll lock released, hero announced
 *   • +1500ms: display:none
 *
 * ⚠ WHAT THE GATE WAITS FOR CHANGED, and this is the part that matters.
 *
 * It used to be a 2200ms clock capped at 3500ms, gated only on window
 * "load". Nothing in that gate knew about the hero's 120-frame WebP
 * sequence — those frames are requested by `new Image()` AFTER React
 * mounts, so they are not part of "load" at all. The curtain lifted on a
 * hero with a handful of frames decoded, the scrub fell back to
 * `nearestLoaded()`, and the sequence sat on one image while the page
 * scrolled underneath it. That is the "frames get stuck" report.
 *
 * The gate is now: window "load" AND every registered boot task finished
 * AND fonts resolved — with the HOLD and the CAP unchanged in spirit but
 * sized for real work rather than a guess:
 *
 *   HOLD  950ms   floor, so a warm cache still shows the mark
 *   CAP   12000ms ceiling — 4500ms on save-data / 2G, where waiting for
 *                 8 MB of frames would be a punishment rather than a wait
 *
 * The progress the mark resolves against is REAL: bootProgress() is the
 * weighted fraction of frames actually decoded (utils/boot.js). The old
 * 2200ms crawl is kept as a floor so a cached visit still animates
 * instead of snapping open.
 *
 * A route with no sequence on it (contact, blog, a system page) registers
 * no boot tasks, so bootPending() is 0 from the start and the behaviour is
 * exactly what it was before.
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
    const HOLD = 950 // ms floor — never flash the mark and go

    /* Ceiling. A visitor is never trapped behind work that is not
       arriving; they only ever pay this much for it. The slow-link branch
       is deliberate — holding a phone on a metered 2G connection for the
       full frame set would be a punishment, and the hero degrades to
       `nearestLoaded()` rather than breaking. */
    const conn = navigator.connection
    const frugal = !!conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))
    const CAP = frugal ? 4500 : 12000

    let rafId = 0
    const timers = []

    const onLoad = () => {
      loaded = true
    }
    window.addEventListener('load', onLoad)

    /* Webfonts are part of "fully loaded" as anyone reading the page
       means it: releasing before they resolve swaps the hero headline
       from the fallback serif to Playfair a beat after the curtain
       lifts. Never blocks on its own — the CAP still owns the ceiling,
       and a browser without document.fonts just reads as ready. */
    let fontsReady = true
    if (document.fonts && document.fonts.status !== 'loaded') {
      fontsReady = false
      document.fonts.ready.then(function () {
        fontsReady = true
      }, function () {
        fontsReady = true
      })
    }

    /**
     * ⚠ THE 15px OF EMPTY PAGE ON THE RIGHT, and why it only ever showed
     * on a first visit.
     *
     * `is-loading` locks the scroll with `overflow: hidden`, which on a
     * classic-scrollbar platform TAKES THE SCROLLBAR AWAY — the document
     * lays out ~15px wider for as long as the curtain is up. Everything
     * that measured the viewport in that window measured the wrong one,
     * and the worst offender was GSAP: ScrollTrigger builds a pin-spacer
     * with an INLINE PIXEL WIDTH, so #performance's spacer was frozen at
     * the full 1440 while the real content box became 1425. That 15px of
     * overhang is the gap, and it is horizontally scrollable.
     *
     * Nothing recovered on its own because `window.innerWidth` COUNTS the
     * scrollbar: it reads the same before and after, so the browser fires
     * no resize event and neither ScrollTrigger nor any resize listener
     * ever learned the layout had changed. Measured headlessly at 1440×900:
     * fresh visit scrollWidth 1440 vs clientWidth 1425; the same page on a
     * revisit, where the loader is skipped, 1425 and 1425.
     *
     * `scrollbar-gutter: stable` in global.css is the structural half of
     * the fix — the gutter is now reserved whether or not the scrollbar is
     * drawn, so locking the scroll no longer changes the width at all.
     * This is the belt to that pair of braces: it forces the recompute
     * that the missing resize event never triggered, so anything measured
     * behind the curtain is corrected the moment it lifts, on this
     * platform and on any future one where the two widths disagree.
     */
    function remeasure() {
      window.dispatchEvent(new Event('resize'))
      if (ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh()
    }

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
          remeasure()
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

      /* The bar is the larger of two readings, and both earn their place:
         the 2200ms clock is the floor that keeps a fully cached visit
         moving, bootProgress() is the truth about the frames. Capped at
         92% so the last stretch always belongs to the release below —
         a bar that reaches 100% and then waits is worse than a slow one. */
      let target = Math.min(0.92, Math.max(elapsed / 2200, bootProgress() * 0.92))

      const ready = loaded && fontsReady && bootPending() === 0
      if ((ready && elapsed > HOLD) || elapsed > CAP) target = 1

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
