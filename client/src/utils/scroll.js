/**
 * Scroll primitives shared by every scrubbed section.
 *
 * All of this is lifted from the sequence controller in hero.html
 * (lines 4917-5111). Nothing here is "improved" — the clamp, the
 * progress formula, the single shared rAF loop and its visibility
 * pausing all behave exactly as the original.
 */

/** Original helper: clamp(v, a, b). */
export function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v))
}

/**
 * Scroll progress of a tall .seq-scroll wrapper, 0 → 1.
 *
 * Verbatim from ImageSequence.update():
 *   range = scrollEl.offsetHeight - window.innerHeight
 *   p     = clamp((window.scrollY - scrollEl.offsetTop) / range, 0, 1)
 *
 * Note it reads window.scrollY, NOT Lenis — Lenis drives the real
 * document scroll, so this stays in sync without a scroller proxy.
 */
export function getSequenceProgress(scrollEl) {
  const range = scrollEl.offsetHeight - window.innerHeight
  return range > 0
    ? clamp((window.scrollY - scrollEl.offsetTop) / range, 0, 1)
    : 0
}

/* ───────────────────────────────────────────
   Shared rAF ticker

   The original ran ONE loop for every sequence on the page:

     var running = true;
     function loop() {
       for (var i = 0; i < seqs.length; i++) seqs[i].update();
       if (running) requestAnimationFrame(loop);
     }
     requestAnimationFrame(loop);
     document.addEventListener('visibilitychange', ...);

   React mounts sections independently, so instead of one loop per
   section this registry keeps a single loop that every subscriber
   shares — same number of rAF callbacks per frame as the original,
   same pause-while-hidden behaviour.
─────────────────────────────────────────── */

const subscribers = new Set()
let rafId = 0
let running = false
let visibilityBound = false

function loop() {
  // Iterate a copy: a subscriber may unsubscribe mid-frame on unmount.
  for (const fn of Array.from(subscribers)) fn()
  if (running) rafId = requestAnimationFrame(loop)
}

function start() {
  // No document.hidden guard here, deliberately. The original starts its
  // loop unconditionally —
  //     var running = true; requestAnimationFrame(loop);
  // — and only ever pauses in response to a visibilitychange EVENT. Adding
  // a hidden check meant a page loaded in a background tab never started
  // its sequences at all, because no visibilitychange had fired yet.
  if (running || subscribers.size === 0) return
  running = true
  rafId = requestAnimationFrame(loop)
}

function stop() {
  running = false
  cancelAnimationFrame(rafId)
}

function onVisibilityChange() {
  if (document.hidden) stop()
  else if (!running) start()
}

/**
 * Register a per-frame callback on the shared loop.
 * @returns {() => void} unsubscribe
 */
export function subscribeTick(fn) {
  subscribers.add(fn)
  if (!visibilityBound) {
    document.addEventListener('visibilitychange', onVisibilityChange)
    visibilityBound = true
  }
  start()

  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      visibilityBound = false
    }
  }
}
