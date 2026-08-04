/**
 * Boot readiness registry — what the preloader is actually waiting for.
 *
 * ⚠ WHY THIS EXISTS. The preloader used to release on a 2200ms clock,
 * gated only by window "load" and capped at 3500ms. Nothing in that
 * gate knew about the hero's 120-frame WebP sequence (8.1 MB), which is
 * requested by `new Image()` in small paced batches AFTER mount — so the
 * curtain lifted on a hero that still had a handful of frames decoded.
 * Scrubbing then hit `nearestLoaded()` over and over and the sequence
 * appeared to stick on one frame while the page scrolled underneath it.
 *
 * A boot task is a piece of work the first screen genuinely needs before
 * it can be shown. Whoever owns the work registers it; the Loader polls
 * `bootPending()` / `bootProgress()` from the rAF loop it already runs.
 *
 *   const task = registerBootTask('hero-frames', 120)
 *   task.report(loadedCount)   // drives the preloader's real progress
 *   task.done()                // or task.release() on unmount
 *
 * Rules that keep this from ever trapping a visitor:
 *
 *   • the Loader owns a hard cap (see Loader.jsx) and ignores this
 *     registry once the cap expires — a task that never completes costs
 *     the cap, not the session;
 *   • a route with nothing registered (contact, blog, admin) reads as
 *     ready the moment window "load" fires, exactly as before;
 *   • tasks are registered from passive effects, which run after the
 *     Loader's own layout effect — so "no tasks registered yet" is not
 *     the same as "ready". The Loader's HOLD window (950ms) covers the
 *     gap; nothing here should be consulted before it.
 */

const tasks = new Map()
let seq = 0

/**
 * @param {string} name   diagnostic label, also the de-dupe key
 * @param {number} total  units of work (frames, files…). 1 = a flag.
 */
export function registerBootTask(name, total = 1) {
  const key = name + '#' + ++seq
  const entry = { name, total: Math.max(1, total), loaded: 0, done: false }
  tasks.set(key, entry)

  return {
    /**
     * Correct the unit count once the owner knows it.
     *
     * The frame loader is the case: the hero registers 120 frames, then
     * discovers the preloader is only waiting on the 31-frame first pass
     * (imageSequence.js). Without this the bar would stop at a quarter
     * full and jump.
     */
    setTotal(total) {
      if (total > 0) entry.total = total
      if (entry.loaded > entry.total) entry.loaded = entry.total
    },
    /** Progress in units. Completing the count does NOT complete the task. */
    report(loaded) {
      entry.loaded = Math.min(entry.total, Math.max(0, loaded))
    },
    /** The work this task represents is finished. */
    done() {
      entry.loaded = entry.total
      entry.done = true
    },
    /** Unmounted before finishing — stop blocking, forget the progress. */
    release() {
      tasks.delete(key)
    },
  }
}

/** How many registered tasks have not completed. */
export function bootPending() {
  let n = 0
  for (const t of tasks.values()) if (!t.done) n++
  return n
}

/**
 * Aggregate progress, 0 → 1, weighted by each task's unit count so the
 * 120-frame sequence dominates a one-flag task rather than being averaged
 * away by it. Returns 1 when nothing is registered, so a route with no
 * blocking work never drags the preloader's bar backwards.
 */
export function bootProgress() {
  let loaded = 0
  let total = 0
  for (const t of tasks.values()) {
    loaded += t.done ? t.total : t.loaded
    total += t.total
  }
  return total === 0 ? 1 : loaded / total
}

/** Diagnostics — `window.__glazeBoot()` in the console. */
export function bootSnapshot() {
  return Array.from(tasks.values()).map((t) => ({
    name: t.name,
    loaded: t.loaded,
    total: t.total,
    done: t.done,
  }))
}

if (typeof window !== 'undefined') {
  window.__glazeBoot = bootSnapshot
}
