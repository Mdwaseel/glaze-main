/**
 * Lazy WebP frame loader for scroll-scrubbed sequences.
 *
 * Straight port of the loading half of ImageSequence() in hero.html
 * (lines 4941-4982): frame 0 immediately, then batches of 6 every
 * 120 ms after an 80 ms head start, plus the nearest-loaded-frame
 * fallback so a scrub never shows a blank canvas.
 *
 * The batching numbers are load-bearing — they are what keeps the
 * network from being slammed by 120 (or 145) requests at once. Do not
 * "optimise" them into a Promise.all or an <link rel=preload> sweep.
 */

/** '7' → '007' at pad 3. Original pad(). */
export function padFrame(n, pad) {
  let s = String(n)
  while (s.length < pad) s = '0' + s
  return s
}

/** frames/hero/hero_007.webp. Original src(). */
export function frameSrc(cfg, i) {
  return cfg.dir + '/' + cfg.prefix + '_' + padFrame(i, cfg.pad) + '.webp'
}

/**
 * @param {{dir: string, prefix: string, count: number, pad: number}} cfg
 * @param {(index: number, isFirstReady: boolean) => void} onFrameReady
 *        Called on every decode. The original drew when the FIRST frame
 *        landed, and afterwards only when the decoded frame happened to
 *        be the one currently on screen — the caller reproduces that
 *        with the isFirstReady flag.
 */
export function createFrameLoader(cfg, onFrameReady) {
  const images = new Array(cfg.count)
  const loaded = new Array(cfg.count)
  let firstReady = false
  let pumpTimer = 0
  let destroyed = false
  let q = 1

  function load(i) {
    if (destroyed || images[i]) return
    const im = new Image()
    im.decoding = 'async'
    im.onload = function () {
      if (destroyed) return
      loaded[i] = true
      if (!firstReady) {
        firstReady = true
        onFrameReady(i, true)
      } else {
        onFrameReady(i, false)
      }
    }
    im.src = frameSrc(cfg, i)
    images[i] = im
  }

  // If the exact frame isn't decoded yet, show the nearest one that is.
  function nearestLoaded(i) {
    if (loaded[i]) return i
    for (let d = 1; d < cfg.count; d++) {
      if (i - d >= 0 && loaded[i - d]) return i - d
      if (i + d < cfg.count && loaded[i + d]) return i + d
    }
    return -1
  }

  // Lazy preload — frame 0 first, then the rest in small batches so
  // the network is never slammed and the page stays responsive.
  //
  // Defaults are the hero / day-night numbers (6 frames every 120ms after
  // an 80ms head start). The engineering sequence overrides them: it runs
  // its first batch synchronously (startDelay 0) and paces at 110ms,
  // because it only begins once an IntersectionObserver says the section
  // is ~1.5 screens away — the hero keeps the network to itself on first
  // paint. All three numbers are load-bearing; do not "tidy" them.
  const batchSize = cfg.batchSize != null ? cfg.batchSize : 6
  const batchInterval = cfg.batchInterval != null ? cfg.batchInterval : 120
  const startDelay = cfg.startDelay != null ? cfg.startDelay : 80

  function pump() {
    if (destroyed) return
    let budget = batchSize
    while (q < cfg.count && budget-- > 0) {
      load(q++)
    }
    if (q < cfg.count) pumpTimer = setTimeout(pump, batchInterval)
  }

  function start() {
    load(0)
    if (startDelay > 0) pumpTimer = setTimeout(pump, startDelay)
    else pump()
  }

  function destroy() {
    destroyed = true
    clearTimeout(pumpTimer)
    for (let i = 0; i < images.length; i++) {
      if (images[i]) images[i].onload = null
    }
  }

  return { images, loaded, load, nearestLoaded, start, destroy }
}
