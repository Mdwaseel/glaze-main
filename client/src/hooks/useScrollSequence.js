import { useEffect, useRef } from 'react'
import { createFrameLoader } from '@/utils/imageSequence'
import { resizeCanvasToDisplaySize, drawCoverFrame } from '@/utils/canvas'
import { getSequenceProgress, subscribeTick } from '@/utils/scroll'
import { prefersReducedMotion } from '@/utils/motion'
import { registerBootTask } from '@/utils/boot'

/**
 * Scroll-scrubbed WebP image sequence on a <canvas>.
 *
 * This is ImageSequence() from hero.html (lines 4930-5036) moved into a
 * hook, one-to-one. Same lazy batching, same nearest-loaded fallback,
 * same cover-fit maths, same pin-height formula, same resize handling,
 * same reduced-motion behaviour. Nothing is debounced, throttled or
 * rewritten — the sequence is driven by the shared rAF ticker exactly
 * as the original single loop drove every sequence on the page.
 *
 * Used by: hero (120 frames), day/night (120), engineering (145).
 *
 * The consuming section owns the stylesheet import, NOT this hook:
 *
 *     import './heroSection.css'
 *     import '@/styles/sequence.css'   // must come after the section CSS
 *
 * In the original single stylesheet the .seq-* rules sit AFTER the hero
 * rules, so `.seq-pin { position: sticky }` beats `.hero { position:
 * relative }` on the element that carries both classes. Importing the
 * shared sheet from inside this hook pulled it into the bundle too
 * early, `relative` won, and the hero stopped pinning entirely.
 *
 * @param {object}  cfg
 * @param {React.RefObject<HTMLCanvasElement>} cfg.canvasRef
 * @param {React.RefObject<HTMLElement>}       cfg.scrollRef  tall .seq-scroll wrapper
 * @param {string}  cfg.dir      e.g. '/frames/hero'
 * @param {string}  cfg.prefix   e.g. 'hero'
 * @param {number}  cfg.count    total frames
 * @param {number}  cfg.pad      filename zero-padding
 * @param {number}  cfg.pinVh    scroll travel, as a multiple of the viewport
 * @param {number}  [cfg.zoom]   cinematic push-in factor
 * @param {number}  [cfg.anchorY] vertical crop anchor, 0-1
 * @param {(p: number) => void} [cfg.onProgress]
 * @param {number}  [cfg.reducedMotionFrame] frame painted when motion is reduced
 * @param {() => void} [cfg.onReducedMotion]  extra reduced-motion side effect
 * @param {number}  [cfg.batchSize]     frames requested per batch
 * @param {number}  [cfg.batchInterval] ms between batches
 * @param {number}  [cfg.startDelay]    ms before the first batch
 * @param {string}  [cfg.bootTask]      hold the preloader until this
 *        sequence has finished loading, reporting real progress to it.
 *        Hero only — see utils/boot.js.
 * @param {string}  [cfg.deferUntilNear] start loading only once the section
 *        is within this rootMargin of the viewport (e.g. '150% 0px'), so a
 *        below-the-fold sequence does not race the hero for bandwidth.
 */
export function useScrollSequence({
  canvasRef,
  scrollRef,
  dir,
  prefix,
  count,
  pad,
  pinVh,
  zoom,
  anchorY,
  onProgress,
  reducedMotionFrame = 0,
  onReducedMotion,
  batchSize,
  batchInterval,
  startDelay,
  priorityStride,
  bootTask,
  deferUntilNear,
}) {
  // Keep the callbacks out of the effect deps so a re-render never tears
  // the sequence down and restarts the frame loading.
  const onProgressRef = useRef(onProgress)
  const onReducedMotionRef = useRef(onReducedMotion)
  onProgressRef.current = onProgress
  onReducedMotionRef.current = onReducedMotion

  useEffect(() => {
    const canvas = canvasRef.current
    const scrollEl = scrollRef.current
    if (!canvas || !scrollEl) return

    const reduceMotion = prefersReducedMotion()
    const ctx = canvas.getContext('2d')

    let curIndex = -1
    let lastP = -1
    let progress = 0

    /* The preloader's hold on this sequence — see utils/boot.js. Opened
       in startLoading(), synchronously before the first request goes out,
       so the Loader can never sample an empty registry and conclude the
       page is ready. `release()` in the cleanup covers an unmount, and
       the portrait/landscape swap, which re-runs this effect against the
       other frame folder. */
    let boot = null

    const loader = createFrameLoader(
      {
        dir,
        prefix,
        count,
        pad,
        batchSize,
        batchInterval,
        startDelay,
        priorityStride,
        // Both report the FIRST pass — the spread sample the preloader
        // actually waits for, not the whole set. See imageSequence.js.
        onProgress: (done, total) => {
          if (!boot) return
          boot.setTotal(total)
          boot.report(done)
        },
        onComplete: () => {
          if (boot) boot.done()
        },
      },
      (i, isFirstReady) => {
        // Original: first decode always draws; later decodes only draw when
        // they are the frame currently on screen.
        if (isFirstReady) draw()
        else if (i === curIndex) draw()
      },
    )

    function draw() {
      const idx = loader.nearestLoaded(curIndex < 0 ? 0 : curIndex)
      if (idx < 0) return
      const im = loader.images[idx]
      if (!im || !im.naturalWidth) return
      resizeCanvasToDisplaySize(canvas)
      drawCoverFrame(ctx, canvas, im, { zoom, progress, anchorY })
    }

    function setHeight() {
      // Reduced motion → no scrub track; the section is a single screen.
      scrollEl.style.height = reduceMotion ? '' : (1 + pinVh) * 100 + 'vh'
    }

    function update() {
      const p = getSequenceProgress(scrollEl)
      if (p === lastP) return // idle → skip redundant redraws
      lastP = p
      progress = p
      curIndex = Math.round(p * (count - 1))
      draw()
      if (onProgressRef.current) onProgressRef.current(p)
    }

    function setStatic(i) {
      curIndex = i
      progress = i / (count - 1)
      loader.load(i)
      draw()
    }

    /* ── When the frames start downloading ────────────────────────────
       Without `deferUntilNear` every sequence on the page opened its
       requests the moment it mounted. On the homepage that meant the
       day/night set (8.6 MB) competed with the hero's (8.1 MB) for the
       same connection from the first frame, and the hero — the only
       sequence anyone can see yet — lost roughly half the bandwidth.
       Deferred sections wait until they are within `deferUntilNear` of
       the viewport, which is how the engineering sequence has always
       behaved (performanceSequence.js). */
    let started = false
    function startLoading() {
      if (started) return
      started = true
      /* Registered here rather than at mount: a deferred sequence that
         announced itself before it had started downloading would hold the
         preloader open for frames it has not asked for yet. */
      if (bootTask && !reduceMotion) boot = registerBootTask(bootTask, count)
      loader.start()
    }

    let io = null
    if (deferUntilNear && !reduceMotion && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              startLoading()
              io.disconnect()
              io = null
              return
            }
          }
        },
        { rootMargin: deferUntilNear },
      )
      io.observe(scrollEl)
    } else {
      startLoading()
    }

    setHeight()
    resizeCanvasToDisplaySize(canvas)

    function onResize() {
      setHeight()
      resizeCanvasToDisplaySize(canvas)
      lastP = -1
      draw()
    }
    window.addEventListener('resize', onResize, { passive: true })

    /* ⚠ THE CANVAS CAN CHANGE SIZE WITHOUT A WINDOW RESIZE, and the
       preloader is exactly when it happens: `is-loading` takes the
       document scrollbar away, so the canvas lays out ~15px wider than it
       will be once the curtain lifts and the scrollbar returns.
       `window.innerWidth` is identical either way — it counts the
       scrollbar — so no resize event ever fires and the backing store
       stayed sized for a viewport that no longer exists, leaving the
       painted frame stretched. A box observer sees what the window
       listener cannot. */
    let ro = null
    if ('ResizeObserver' in window) {
      let first = true
      ro = new ResizeObserver(() => {
        if (first) {
          first = false // the initial observation is not a change
          return
        }
        resizeCanvasToDisplaySize(canvas)
        lastP = -1
        draw()
      })
      ro.observe(canvas)
    }

    let unsubscribe
    if (reduceMotion) {
      // Static, representative frame + copy stays fully visible.
      setStatic(reducedMotionFrame)
      if (onReducedMotionRef.current) onReducedMotionRef.current()
    } else {
      unsubscribe = subscribeTick(update)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      if (io) io.disconnect()
      if (ro) ro.disconnect()
      if (unsubscribe) unsubscribe()
      // Stop holding the preloader for frames nobody is waiting on now.
      if (boot) boot.release()
      loader.destroy()
      scrollEl.style.height = ''
    }
  }, [
    canvasRef,
    scrollRef,
    dir,
    prefix,
    count,
    pad,
    pinVh,
    zoom,
    anchorY,
    reducedMotionFrame,
    batchSize,
    batchInterval,
    startDelay,
    priorityStride,
    bootTask,
    deferUntilNear,
  ])
}

export default useScrollSequence
