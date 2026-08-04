import { useEffect, useRef } from 'react'
import { createFrameLoader } from '@/utils/imageSequence'
import { resizeCanvasToDisplaySize, drawCoverFrame } from '@/utils/canvas'
import { getSequenceProgress, subscribeTick } from '@/utils/scroll'
import { prefersReducedMotion } from '@/utils/motion'

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

    const loader = createFrameLoader({ dir, prefix, count, pad }, (i, isFirstReady) => {
      // Original: first decode always draws; later decodes only draw when
      // they are the frame currently on screen.
      if (isFirstReady) draw()
      else if (i === curIndex) draw()
    })

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

    loader.start()
    setHeight()
    resizeCanvasToDisplaySize(canvas)

    function onResize() {
      setHeight()
      resizeCanvasToDisplaySize(canvas)
      lastP = -1
      draw()
    }
    window.addEventListener('resize', onResize, { passive: true })

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
      if (unsubscribe) unsubscribe()
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
  ])
}

export default useScrollSequence
