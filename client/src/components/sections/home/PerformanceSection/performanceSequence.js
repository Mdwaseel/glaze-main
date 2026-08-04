import { gsap, ScrollTrigger } from '@/utils/gsap'
import { createFrameLoader } from '@/utils/imageSequence'
import { resizeCanvasToDisplaySize, drawContainFrame } from '@/utils/canvas'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Engineering Excellence — scroll-scrubbed WebP frame sequence.
 *
 * Verbatim port of <script id="eng-script"> in hero.html (lines 4664-4862).
 *
 * ── Why this does NOT use useScrollSequence ──────────────────────────
 * It shares the *frame loading* and *canvas sizing* with the hero and
 * day/night sequences (both reused below from utils/imageSequence.js and
 * utils/canvas.js), but nothing else. useScrollSequence encodes the
 * hero/day-night contract:
 *
 *   cover-fit + clearRect      → this one is CONTAIN-fit over a solid ground
 *   zoom / anchorY             → this one has neither
 *   JS-injected .seq-scroll height + sticky .seq-pin
 *                              → this one uses a real ScrollTrigger `pin`
 *                                on desktop and no pin at all on mobile
 *   shared rAF ticker reading window.scrollY
 *                              → this one is a gsap tween of a frame
 *                                counter with scrub 0.9 and snap {i:1}
 *   preload starts immediately → this one waits for an IntersectionObserver
 *                                at rootMargin 150% (the frames are ~4.6MB)
 *
 * Forcing it through that hook would change the fit, the smoothing, the
 * pin mechanism and the download schedule. Parity wins.
 * ─────────────────────────────────────────────────────────────────────
 */

// ╔══════════════════════════════════════════════════════════╗
// ║ SEQUENCE + PACING — tune the feel here.                   ║
// ╠══════════════════════════════════════════════════════════╣
export const DIR = '/frames/layers' // frame folder
export const PREFIX = 'layer' // layer_000.webp … layer_144.webp
export const COUNT = 145 // total frames
export const PAD = 3 // digits in the frame number
export const PIN_VH = 4.0 // pinned travel (× 100vh). Bigger = slower.
export const SCRUB = 0.9 // scroll→frame catch-up easing (seconds)
export const GROUND = '#E3E2E4' // = --eng-ground; fills the letterbox
// ╚══════════════════════════════════════════════════════════╝

/**
 * @param {HTMLElement} section  #performance
 * @param {{canvas: HTMLCanvasElement, plate: HTMLElement, steps: HTMLElement[], fill: HTMLElement}} refs
 * @returns {() => void} cleanup
 */
export function buildPerformanceSequence(section, refs) {
  const { canvas, plate, steps, fill } = refs
  if (!canvas || !plate) return () => {}

  const ctx = canvas.getContext('2d')
  let curIndex = -1
  let painted = false
  let activeStep = -1

  const loader = createFrameLoader(
    {
      dir: DIR,
      prefix: PREFIX,
      count: COUNT,
      pad: PAD,
      // eng pacing: first batch synchronously, then 6 every 110ms
      batchSize: 6,
      batchInterval: 110,
      startDelay: 0,
      /* Two-pass load, as the hero and day/night use: a stride-4 spread
         of the 145 frames first, the gaps behind it. The section is
         pinned for 400vh and the scrub can reach the far end long before
         4.3 MB has, and a contain-fitted assembly stuck on a stale frame
         is more obvious than a landscape pan is. See imageSequence.js. */
      priorityStride: 4,
    },
    // Original: `if (!painted || i === curIndex) draw();`
    // Note it tests `painted` (set on the first successful PAINT), not a
    // first-decode flag — so a decode that arrives while the canvas still
    // has no box keeps retrying on the next one.
    function (i) {
      if (!painted || i === curIndex) draw()
    }
  )

  // CONTAIN fit — the whole assembly stays in frame at every step;
  // the surplus is filled with the section ground and feathered away
  // by .eng__plate::after.
  function draw() {
    const idx = loader.nearestLoaded(curIndex < 0 ? 0 : curIndex)
    if (idx < 0) return
    const im = loader.images[idx]
    if (!im || !im.naturalWidth) return
    resizeCanvasToDisplaySize(canvas, 2, { skipEmpty: true })
    const cw = canvas.width
    const ch = canvas.height
    if (!cw || !ch) return
    drawContainFrame(ctx, canvas, im, { background: GROUND })
    if (!painted) {
      painted = true
      canvas.classList.add('is-ready')
      plate.classList.add('is-live') // cross-fades the <img> out
    }
  }

  // Layer index + hairline meter track the scrub.
  function setProgress(p) {
    if (fill) fill.style.width = (p * 100).toFixed(1) + '%'
    if (!steps.length) return
    const i = Math.min(steps.length - 1, Math.floor(p * steps.length))
    if (i === activeStep) return
    activeStep = i
    for (let k = 0; k < steps.length; k++) {
      steps[k].classList.toggle('is-active', k === i)
    }
  }

  function onResize() {
    draw()
  }
  window.addEventListener('resize', onResize, { passive: true })

  const reduce = prefersReducedMotion()

  // ── REDUCED MOTION: one still — the finished exploded view — and
  // every layer already legible (CSS opens all five rows). ──
  if (reduce) {
    curIndex = COUNT - 1
    loader.load(curIndex)
    return function cleanup() {
      window.removeEventListener('resize', onResize)
      loader.destroy()
    }
  }

  // (The original also bailed when GSAP failed to load from the CDN,
  // leaving the <img> showing the assembled render. GSAP is bundled here.)

  // Frames are ~4.6 MB in total, so they only start downloading once
  // the section is within ~1.5 screens — the hero sequence keeps the
  // network to itself on first paint.
  let started = false
  function startPreload() {
    if (started) return
    started = true
    loader.start()
  }
  let io = null
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      function (entries) {
        for (let i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            startPreload()
            io.disconnect()
            return
          }
        }
      },
      { rootMargin: '150% 0px' }
    )
    io.observe(section)
  } else {
    startPreload()
  }

  // ── The scrub. One tween of a frame counter; ScrollTrigger's own
  // `scrub` supplies the smoothing, `snap` keeps the counter on whole
  // frames so we never redraw the same image twice. matchMedia kills
  // and rebuilds it (clearing the pin) across the breakpoint. ──
  const frame = { i: 0 }
  const mm = gsap.matchMedia()

  mm.add(
    {
      isDesktop: '(min-width: 981px)',
      isMobile: '(max-width: 980px)',
    },
    function (ctx2) {
      const st = ctx2.conditions.isDesktop
        ? // Desktop: pinned for the full run of frames, then released.
          {
            trigger: section,
            start: 'top top',
            end: function () {
              return '+=' + PIN_VH * window.innerHeight
            },
            pin: true,
            scrub: SCRUB,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: function (self) {
              setProgress(self.progress)
            },
          }
        : // Mobile: no pin. Tied to the render itself, not the section, so
          // the whole sequence plays while the render is actually on screen.
          {
            trigger: plate,
            start: 'top 85%',
            end: 'bottom 25%',
            scrub: SCRUB,
            invalidateOnRefresh: true,
          }

      frame.i = 0
      curIndex = -1

      gsap.to(frame, {
        i: COUNT - 1,
        ease: 'none',
        snap: { i: 1 },
        scrollTrigger: st,
        onUpdate: function () {
          const idx = Math.round(frame.i)
          if (idx === curIndex) return
          curIndex = idx
          draw()
        },
      })
    }
  )

  return function cleanup() {
    window.removeEventListener('resize', onResize)
    if (io) io.disconnect()
    // gsap.matchMedia owns the tween, its ScrollTrigger and the pin
    // spacer; revert() is what releases the pin cleanly.
    mm.revert()
    loader.destroy()
    ScrollTrigger.refresh()
  }
}
