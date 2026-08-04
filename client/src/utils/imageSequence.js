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

/**
 * How long the second load pass will wait on a priority frame that never
 * settles before giving up on it and going ahead anyway. Comfortably
 * longer than the preloader's own ceiling, so it is a repair for the
 * sequence rather than a second gate on the curtain.
 */
const PRIORITY_STALL_MS = 20000

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

  /* ── Load order: a spread of the whole sequence, then the gaps ──────
     `priorityStride` splits the set into two passes. At stride 4 the
     first pass is frames 0, 4, 8 … 116 plus the last frame — 31 of 120,
     about 2.1 MB of the 8.1 — and the second pass fills in everything
     between them.

     WHY IT IS SPLIT AT ALL. The preloader waits for the FIRST pass only.
     Waiting for all 120 is right on a fast connection and indefensible
     on a slow one: it would mean holding the curtain for 8 MB, hitting
     the cap, and lifting on a half-loaded sequence anyway — the exact
     failure the wait was added to prevent. A spread pass is the smallest
     download that makes the scrub honest: `nearestLoaded()` is never
     more than two frames from the one asked for, which over a 120-frame
     pan is not a visible difference. The rest arrives underneath while
     the visitor is still reading the first screen.

     The second pass does not start until the first has SETTLED, on
     purpose. Issuing all 120 at once lets HTTP/2 interleave them evenly,
     which would make the 31 frames that are actually being waited on
     arrive no sooner than the 89 that are not. */
  const stride = Math.max(1, cfg.priorityStride || 1)
  const order = []
  const isPriority = new Uint8Array(cfg.count)
  for (let i = 0; i < cfg.count; i += stride) {
    order.push(i)
    isPriority[i] = 1
  }
  // The last frame is always in the first pass: it is where the scrub
  // ends, and a stride that does not divide the count would leave it to
  // the second one.
  if (cfg.count > 0 && !isPriority[cfg.count - 1]) {
    order.push(cfg.count - 1)
    isPriority[cfg.count - 1] = 1
  }
  const priorityTotal = order.length
  // Everything the first pass skipped, in natural order.
  for (let i = 0; i < cfg.count; i++) if (!isPriority[i]) order.push(i)

  let q = 1 // index into `order`; start() takes order[0] itself
  let prioritySettled = 0
  let priorityDone = false

  // ── Settled count: decoded frames PLUS frames that failed ───────────
  // A 404 or an aborted request must still settle, or anything gated on
  // "the sequence is ready" (the preloader) would wait for a frame that
  // is never coming and only ever release on its cap.
  let settled = 0

  function settle(i, ok) {
    if (destroyed) return
    settled++
    if (ok) loaded[i] = true

    if (!priorityDone && isPriority[i]) {
      prioritySettled++
      if (cfg.onProgress) cfg.onProgress(prioritySettled, priorityTotal)
    }

    if (ok) {
      if (!firstReady) {
        firstReady = true
        onFrameReady(i, true)
      } else {
        onFrameReady(i, false)
      }
    }

    if (!priorityDone && prioritySettled >= priorityTotal) {
      priorityDone = true
      if (cfg.onComplete) cfg.onComplete()
      /* The gate is open; the gaps can have the connection now. The
         pending timer is cleared rather than left to fire: at this point
         it is the stall watchdog pump() armed on reaching the wall, and
         waiting 20s for it would leave the second pass unsent for the
         whole of that time. */
      clearTimeout(pumpTimer)
      pumpTimer = 0
      if (q < order.length) pump()
    }
  }

  function load(i) {
    if (destroyed || images[i]) return
    const im = new Image()
    im.decoding = 'async'
    im.onload = function () {
      settle(i, true)
    }
    im.onerror = function () {
      settle(i, false)
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
  // Defaults are the original numbers (6 frames every 120ms after an 80ms
  // head start) and still apply to any sequence that starts while the page
  // is on screen. Two sequences override them, both deliberately:
  //
  //   engineering  first batch synchronously (startDelay 0), then 6 every
  //                110ms — it only begins once an IntersectionObserver
  //                says the section is ~1.5 screens away.
  //
  //   hero         10 every 60ms from a standing start. It is the ONLY
  //                sequence that runs behind the preloader, where there
  //                is no first paint left to protect and the network is
  //                otherwise idle — pacing it at the default rate meant
  //                the 120 requests were not even ISSUED for 2.4s, which
  //                is most of the preloader's own budget. See
  //                heroSequence.js.
  //
  // All of these are load-bearing; do not "tidy" them.
  const batchSize = cfg.batchSize != null ? cfg.batchSize : 6
  const batchInterval = cfg.batchInterval != null ? cfg.batchInterval : 120
  const startDelay = cfg.startDelay != null ? cfg.startDelay : 80

  function pump() {
    pumpTimer = 0
    if (destroyed) return

    // The wall between the two passes: hold at the end of the priority
    // set until it has settled, so the frames the preloader is waiting on
    // are not sharing the connection with the ones it is not. settle()
    // restarts the pump on the far side.
    const limit = priorityDone ? order.length : priorityTotal

    let budget = batchSize
    while (q < limit && budget-- > 0) {
      load(order[q++])
    }
    if (q < limit) {
      pumpTimer = setTimeout(pump, batchInterval)
    } else if (!priorityDone) {
      // Watchdog. A request that neither loads nor errors — a proxy that
      // hangs, a connection dropped mid-transfer — would otherwise leave
      // the wall closed and the second pass unsent for the life of the
      // page. The preloader has its own cap, so this is about the frames,
      // not the curtain.
      pumpTimer = setTimeout(function () {
        pumpTimer = 0
        if (destroyed || priorityDone) return
        priorityDone = true
        if (cfg.onComplete) cfg.onComplete()
        pump()
      }, PRIORITY_STALL_MS)
    }
  }

  function start() {
    if (!order.length) return
    load(order[0])
    if (startDelay > 0) pumpTimer = setTimeout(pump, startDelay)
    else pump()
  }

  function destroy() {
    destroyed = true
    clearTimeout(pumpTimer)
    for (let i = 0; i < images.length; i++) {
      if (images[i]) {
        images[i].onload = null
        images[i].onerror = null
      }
    }
  }

  return {
    images,
    loaded,
    load,
    nearestLoaded,
    start,
    destroy,
    /** Frames settled so far — decoded or failed. */
    settledCount() {
      return settled
    },
  }
}
