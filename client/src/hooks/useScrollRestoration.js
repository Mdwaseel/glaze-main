import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Where a navigation lands you.
 *
 * ⚠ WHY THIS EXISTS. A browser resets the scroll on every document load;
 * a client-side router does not, and nothing here replaced it. Following
 * a link therefore KEPT the outgoing page's scroll offset — so opening
 * Pivot from the nav while three quarters of the way down Sliding put
 * you three quarters of the way down Pivot, in the middle of its
 * variants section, with the page you asked for scrolled past.
 *
 * Measured on the built site at 1440×900, before this hook existed:
 *
 *   /products/sliding y=8933  → click "Pivot"  → /products/pivot y=3036,
 *                                                landed in #sys-variants
 *   /products/sliding bottom  → footer "Fixed" → /products/fixed y=9060,
 *                                                landed in the swatches
 *
 * It reads as a broken link rather than a scroll bug, which is why it was
 * reported as one: the destination is correct and invisible.
 *
 * The rules, in the order they are tested:
 *
 *   a hash   scroll to that element — '/#systems' from About, or
 *            '/contact#enquiry' from anywhere, both of which the static
 *            site served as real document loads with a fragment. (Bare
 *            same-page anchors never reach this: Lenis intercepts them in
 *            useLenis, and utils/links.js keeps them as raw hashes.)
 *   POP      back and forward restore where that entry was left, which on
 *            this site matters more than usual — coming back from a
 *            system page to the middle of the home carousel is the whole
 *            point of the back button there.
 *   else     top of the page, which is what a link has always meant.
 *
 * ⚠ THE FIRST RENDER IS DELIBERATELY LEFT ALONE. On a fresh load the
 * browser is already doing this correctly — including its own restoration
 * after a reload — and forcing the issue there would fight the preloader
 * for control of the scroll position on the one screen where it holds a
 * lock.
 */
export function useScrollRestoration() {
  const { key, hash } = useLocation()
  const navigationType = useNavigationType()

  const positions = useRef(new Map())
  const firstRender = useRef(true)

  /* ⚠ THE LAST SCROLL POSITION IS TRACKED LIVE, and reading it at unmount
     instead is a trap worth spelling out. The obvious version of this
     hook saves `window.scrollY` from the effect cleanup — but a cleanup
     runs during the commit, AFTER React has torn the old page's DOM out.
     Its scrubbed sections take their JS-set heights with them, the
     document collapses, and the browser clamps the scroll before the
     cleanup gets to look at it. Leaving a system page at y=8842 stored
     y=3352, and the back button faithfully restored the wrong number.

     A scroll listener has no such problem: the clamp fires its scroll
     event asynchronously, after the commit, so what is in here at
     cleanup time is the last position the visitor actually chose. */
  const latest = useRef(0)
  useLayoutEffect(() => {
    const onScroll = () => {
      latest.current = window.scrollY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Remember where this entry was left, keyed by history entry.
  useLayoutEffect(() => {
    // The Map itself never changes identity — read it here rather than in
    // the cleanup so the ref rule has nothing to warn about.
    const store = positions.current
    const leaving = key
    return () => {
      store.set(leaving, latest.current)
    }
  }, [key])

  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const saved = positions.current.get(key)
    const target = hash ? null : navigationType === 'POP' && saved != null ? saved : 0

    /* Seed the live tracker with where this navigation is going, so a page
       the visitor never scrolls is remembered as the position it landed
       at rather than the previous page's. */
    if (target != null) latest.current = target

    /* ⚠ THE PAGE IS NOT ITS FINAL HEIGHT YET, and on this site the gap is
       enormous: the scrubbed sections size their own tracks from JS
       (`(1 + pinVh) * 100vh`, `vh * (2.1 + N * 0.85)`), and GSAP adds pin
       spacers on its first refresh. A system page is ~2000px tall at this
       moment and ~17000px a few frames later. Scrolling once would be
       clamped to whatever the document happens to measure right now — the
       exact reason `y=8933 → y=3036` above landed where it did rather
       than at the top. So the position is re-applied while the page grows
       underneath it, and abandoned the moment the visitor takes over. */
    const startedAt = performance.now()
    let rafId = 0
    let cancelled = false
    let lastHeight = -1
    let settled = 0

    function releaseControl() {
      cancelled = true
    }

    function apply() {
      if (cancelled) return
      const elapsed = performance.now() - startedAt

      let y = target
      if (y == null) {
        // Hash: the element only exists once the route's tree has mounted,
        // and it moves as the sections above it settle.
        const el = document.getElementById(decodeURIComponent(hash.slice(1)))
        if (!el) {
          if (elapsed < SETTLE_MAX_MS) rafId = requestAnimationFrame(apply)
          return
        }
        y = el.getBoundingClientRect().top + window.scrollY
      }

      scrollTo(y)

      /* ⚠ "The scroll is where I put it" IS NOT ENOUGH TO STOP.
         Two weaker tests were measured against a back-navigation to
         y=8842 on a system page and both lost the position:

           a fixed 10-frame window   → y=3370. Ten frames in, the page was
                                       still a fifth of its final height,
                                       so every scroll was being clamped.
           stop once honoured        → y=3352. It reads as honoured on the
                                       frame the outgoing page's height is
                                       still standing, and the clamp lands
                                       AFTER we have stopped watching.

         So the exit condition is the document holding still: the same
         scrollHeight, with the position honoured, for several consecutive
         frames. The sections claim their scroll travel in bursts as their
         effects run, and each burst resets the count. */
      const height = document.documentElement.scrollHeight
      const room = height - window.innerHeight
      const honoured = y <= room + 1 && Math.abs(window.scrollY - y) < 2

      if (honoured && height === lastHeight) settled++
      else settled = 0
      lastHeight = height

      if (settled >= SETTLE_FRAMES && elapsed >= SETTLE_MIN_MS) return
      if (elapsed < SETTLE_MAX_MS) rafId = requestAnimationFrame(apply)
    }

    apply()

    // Any deliberate scroll wins immediately; nothing yanks the page back.
    const opts = { passive: true }
    window.addEventListener('wheel', releaseControl, opts)
    window.addEventListener('touchstart', releaseControl, opts)
    window.addEventListener('keydown', releaseControl, opts)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('wheel', releaseControl, opts)
      window.removeEventListener('touchstart', releaseControl, opts)
      window.removeEventListener('keydown', releaseControl, opts)
    }
  }, [key, hash, navigationType])
}

/**
 * How long the landing position is held.
 *
 * MIN — a few frames past "looks right", because the tracks are still
 *       being sized and the first correct-looking frame is not always the
 *       settled one.
 * MAX — the ceiling. A system page goes from ~2000px to ~17000px as its
 *       scrubbed sections claim their scroll travel and GSAP lays out its
 *       pin spacers, and a restore aimed at the bottom of one is clamped
 *       until that finishes. Any deliberate scroll ends it earlier.
 */
const SETTLE_MIN_MS = 120
const SETTLE_MAX_MS = 1500

/** Consecutive frames of an unchanged document height that end it. */
const SETTLE_FRAMES = 6

/**
 * Lenis owns the scroll position when it is running: it holds its own
 * animated and target offsets and writes them to the document every
 * frame, so a bare `window.scrollTo` is overwritten on the next tick and
 * the page slides back to where it was. Going through Lenis sets both.
 *
 * `immediate` because this is a navigation, not a movement — a link
 * should not appear to scroll you anywhere. `force` because Lenis
 * refuses programmatic scrolls while stopped, and the preloader stops it.
 */
function scrollTo(y) {
  const lenis = window.__glazeLenis
  if (lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(y, { immediate: true, force: true })
  }
  window.scrollTo(0, y)
}

export default useScrollRestoration
