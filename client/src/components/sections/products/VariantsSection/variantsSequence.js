import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * Variants — the cinematic one-viewport-per-variant reel.
 *
 * NOT a port; there is no variant gallery in the originals. The MECHANISM
 * is one though: it is the same sticky-stage-over-a-JS-sized-track that
 * Home's Systems carousel uses (systemsSequence.js), for the same reason.
 * Page scroll drives it through a single ScrollTrigger — Lenis keeps
 * driving the document and nothing is hijacked, so reaching the section
 * moves through the variants and leaving the last one carries straight on
 * into the Series grid. Scrolling back up walks them in reverse. There is
 * no wheel listener, no `preventDefault`, and no snap.
 *
 * Everything else is deliberately unlike the carousel: no spring
 * integrator and no per-frame rAF loop. The state here is a single
 * integer, so it changes on a ScrollTrigger update and nothing runs
 * between updates.
 *
 * ── The crossfade ──
 * Only one clip is decoding at a time, but the incoming one is started
 * BEFORE the fade rather than after it, so it is already running
 * underneath by the time it becomes visible. 700ms opacity, plus a
 * 1.6s settle out of scale(1.045) that the stylesheet owns — the frame
 * arrives already in motion instead of cutting in at rest. Both are
 * composited properties, which is what lets a full-bleed 1600px video
 * cross-dissolve without dropping frames.
 *
 * ⚠ THERE IS NO BRIGHTNESS DIP ANY MORE. An earlier version put
 * `filter: brightness(0.8)` on the media wrapper for the length of the
 * swap. A filter on a full-bleed video re-renders the whole frame every
 * tick, which was the one thing in this section that could not hold
 * 60fps; the longer dissolve reads the same and costs nothing.
 *
 * ── Loading ──
 * The <video>s ship with NO src. Only the active clip and its two
 * neighbours are armed (src assigned, then `load()`), so a page with
 * eleven variants fetches three of them, and walking the rail pulls the
 * rest in one at a time. Nothing is fetched at all until the section is
 * within 800px of the viewport.
 */

function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi) }

/** Lines the panel animates, in order. Data attribute, not a class, so
    the CSS never has to know the choreography exists. */
const LINES = '[data-vrt-line]'

/**
 * Shared state machine for both modes. `animate` is false under reduced
 * motion, where the swap is instant and GSAP is never touched.
 */
function createSwitcher(refs, animate) {
  const { layers, videos, panels, railItems } = refs
  let current = -1
  let pauseTimer = 0

  /* The single panel that is still fading out, if any, and its tween.
     See the ⚠ note in the panel block of setActive for why this is
     tracked explicitly rather than left to an onComplete. */
  let fadingEl = null
  let fadingTween = null

  /* Nothing is fetched until the caller opens the gate — the scroll
     mode does it from an IntersectionObserver 800px out, the static
     mode does it on mount. Without this, painting the opening state
     would pull two clips down on page load for a section that may be
     eight screens away. */
  let armingOpen = false

  /** Give a clip its source. Idempotent — `src` is only ever set once. */
  function arm(i) {
    const v = videos[i]
    if (!v || v.getAttribute('src')) return
    const src = v.dataset.src
    if (!src) return
    v.setAttribute('src', src)
    v.preload = 'auto'
    try { v.load() } catch { /* ignore */ }
  }

  /** The active clip plus one either side — enough that the next
      variant is decoded before it is asked for. */
  function armWindow(i) {
    if (!armingOpen) return
    arm(i)
    if (i + 1 < videos.length) arm(i + 1)
    if (i - 1 >= 0) arm(i - 1)
  }

  /** Open the gate and catch up on whatever is already active. */
  function openArming() {
    if (armingOpen) return
    armingOpen = true
    armWindow(current < 0 ? 0 : current)
  }

  function play(i) {
    const v = videos[i]
    if (!v || !animate) return
    const p = v.play()
    if (p && p.catch) p.catch(function () { /* autoplay refused — poster stays */ })
  }

  function pauseAll(except) {
    videos.forEach(function (v, i) {
      if (v && i !== except && !v.paused) v.pause()
    })
  }

  function setActive(idx, immediate) {
    if (idx === current) return
    const prev = current
    current = idx

    /* ── Clips ── */
    armWindow(idx)
    play(idx)
    layers.forEach(function (l, i) { l.classList.toggle('is-live', i === idx) })

    if (animate && !immediate && prev >= 0) {
      /* The outgoing clip keeps running until it is fully invisible —
         pausing it mid-dissolve would freeze a half-lit frame. */
      clearTimeout(pauseTimer)
      pauseTimer = setTimeout(function () { pauseAll(current) }, 760)
    } else {
      pauseAll(idx)
    }

    /* ── Rail ── */
    railItems.forEach(function (b, i) {
      const on = i === idx
      b.classList.toggle('is-current', on)
      if (on) b.setAttribute('aria-current', 'true')
      else b.removeAttribute('aria-current')
    })

    /* ── Panel ──────────────────────────────────────────────────
       ⚠ `is-active` IS NOT LEFT TO A TWEEN CALLBACK. It used to be
       removed from the outgoing panel in the out tween's onComplete.
       Under a fast flick — or a Lenis settle that nudges the scroll
       backwards for a frame — the same panel can be handed the
       INCOMING role again before that tween has finished; the incoming
       fromTo overwrites it, the onComplete never runs, and the panel
       keeps the class forever. Two variants then sit stacked in one
       piece of glass, permanently, and only a reload clears it.

       So the state is derived instead of accumulated: at most one panel
       is incoming and at most one is still fading, that one is tracked
       by hand, and anything else is stripped unconditionally at the end
       of every change. Stacking is structurally impossible now, not
       merely unlikely. */
    const next = panels[idx]
    const out = prev >= 0 ? panels[prev] : null

    /* Settle whatever was still on its way out before touching
       anything else. If it is the panel now coming back in, it simply
       keeps the class it already has. */
    if (fadingTween) { fadingTween.kill(); fadingTween = null }
    if (fadingEl && fadingEl !== next) fadingEl.classList.remove('is-active')
    fadingEl = null

    if (!animate || immediate) {
      panels.forEach(function (p) { if (p !== next) p.classList.remove('is-active') })
      next.classList.add('is-active')
      gsap.set(next.querySelectorAll(LINES), { clearProps: 'all' })
      return
    }

    /* ⚠ FIXED PIXELS, NOT yPercent. The lines are a 10px eyebrow, a
       34px heading, a three-line paragraph and four spec rows — a
       percentage of each element's own height made the paragraph travel
       three times as far as the eyebrow, which is what read as "bouncy".
       12–16px for everything is a drift, and it is the same order as
       the site's own .fade-up (28px over a much longer duration). */
    if (out && out !== next) {
      /* Out is quicker than in — an exit that matches its entrance
         reads as hesitation. */
      fadingEl = out
      fadingTween = gsap.to(out.querySelectorAll(LINES), {
        y: -12,
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.in',
        stagger: 0.02,
        overwrite: true,
        onComplete: function () {
          out.classList.remove('is-active')
          if (fadingEl === out) { fadingEl = null; fadingTween = null }
        },
      })
    }

    next.classList.add('is-active')
    gsap.fromTo(
      next.querySelectorAll(LINES),
      { y: 16, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.05,
        delay: out ? 0.12 : 0,
        overwrite: true,
      }
    )

    /* The guarantee: only the incoming panel and the one genuinely
       mid-exit may carry the class, whatever the tweens are doing.
       `contains` first because classList.remove writes the class
       attribute whether or not the token was there, and a bare sweep
       invalidated style on every panel on every scroll step. */
    panels.forEach(function (p) {
      if (p !== next && p !== fadingEl && p.classList.contains('is-active')) {
        p.classList.remove('is-active')
      }
    })
  }

  return {
    setActive,
    openArming,
    play,
    pauseAll,
    get current() { return current },
    destroy: function () {
      clearTimeout(pauseTimer)
      if (fadingTween) fadingTween.kill()
      fadingTween = null
      fadingEl = null
      pauseAll(-1)
    },
  }
}

/**
 * The cursor bloom on the glass card — a soft champagne highlight that
 * tracks the pointer, the way a light source moving across a real pane
 * would. Two custom properties, read by `.vrt__panels::before`; the CSS
 * defaults them to the card's centre, so the effect is inert until
 * something actually moves.
 *
 * Fine pointers only. On touch there is no hover state to leave, so a
 * bloom would latch on at the last tap and simply stay there.
 *
 * The read (getBoundingClientRect) happens in the event and the write
 * happens in the next frame, so a fast pointer cannot interleave them
 * into a layout thrash.
 */
function bindCardPointer(card) {
  const noop = function () {}
  if (!card || !window.matchMedia) return noop
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return noop

  let frame = 0
  let x = 50
  let y = 50

  function paint() {
    frame = 0
    card.style.setProperty('--vrt-mx', x.toFixed(1) + '%')
    card.style.setProperty('--vrt-my', y.toFixed(1) + '%')
  }

  function clear() {
    if (frame) { cancelAnimationFrame(frame); frame = 0 }
    card.style.removeProperty('--vrt-mx')
    card.style.removeProperty('--vrt-my')
  }

  const ac = new AbortController()

  card.addEventListener('pointermove', function (e) {
    const r = card.getBoundingClientRect()
    if (!r.width || !r.height) return
    x = ((e.clientX - r.left) / r.width) * 100
    y = ((e.clientY - r.top) / r.height) * 100
    if (!frame) frame = requestAnimationFrame(paint)
  }, { signal: ac.signal, passive: true })

  card.addEventListener('pointerleave', clear, { signal: ac.signal })

  return function () {
    ac.abort()
    clear()
  }
}

/**
 * Static mode — reduced motion, or a single variant with nothing to
 * scroll through. The stage stops pinning, the rail becomes the only
 * control, and the clips never start on their own: under reduced motion
 * each gets `controls` so the visitor decides, exactly as Home's Systems
 * fallback does.
 */
export function initVariantsStatic(section, refs, reduceMotion) {
  section.classList.add('vrt--static')
  const sw = createSwitcher(refs, !reduceMotion)
  sw.openArming()

  if (reduceMotion) {
    refs.videos.forEach(function (v) {
      if (!v) return
      /* Armed but never played — the poster is the picture, and the
         clip is there for anyone who asks for it. */
      if (!v.getAttribute('src') && v.dataset.src) v.setAttribute('src', v.dataset.src)
      v.controls = true
    })
  }

  sw.setActive(0, true)

  const ac = new AbortController()
  refs.railItems.forEach(function (b, i) {
    b.addEventListener('click', function () { sw.setActive(i, reduceMotion) }, { signal: ac.signal })
  })

  bindRailKeys(refs.railItems, function (i) { sw.setActive(i, reduceMotion) }, ac.signal)

  /* No bloom under reduced motion: it is decoration that moves. */
  const unbindPointer = reduceMotion ? function () {} : bindCardPointer(refs.card)

  /* Not pinned, so there is no ScrollTrigger to say when the section
     leaves — a lone variant would otherwise decode all the way down the
     page. Reduced motion never plays at all, so it needs no observer. */
  let io = null
  if (!reduceMotion && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) sw.play(sw.current)
        else sw.pauseAll(-1)
      },
      { threshold: 0.15 }
    )
    io.observe(section)
  }

  return function cleanup() {
    ac.abort()
    unbindPointer()
    if (io) io.disconnect()
    sw.destroy()
    section.classList.remove('vrt--static')
  }
}

/**
 * Keyboard control for the timeline. The numbered items are a listbox in
 * everything but name, so both axes of arrow key move between them —
 * they are laid out horizontally on desktop and scroll horizontally on
 * mobile, but a keyboard user reaching for Down is asking for the same
 * thing as one reaching for Right. Home and End jump to the ends.
 *
 * Bound once on the parent rather than per item, so it keeps working
 * however many variants a system has.
 */
function bindRailKeys(railItems, go, signal) {
  const rail = railItems[0] ? railItems[0].parentElement : null
  if (!rail) return
  const last = railItems.length - 1

  rail.addEventListener('keydown', function (e) {
    const from = railItems.indexOf(document.activeElement)
    if (from < 0) return

    let to = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = clamp(from + 1, 0, last)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = clamp(from - 1, 0, last)
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = last
    else return

    e.preventDefault()
    railItems[to].focus()
    go(to)
  }, { signal: signal })
}

/**
 * Scroll-driven mode.
 *
 * Call inside a useGSAP/gsap.context scope: the two ScrollTriggers are
 * reverted for you, and the returned cleanup handles the listeners, the
 * refreshInit hook and the injected track height — none of which
 * gsap.context can track.
 */
export function buildVariants(section, scrollEl, refs) {
  const { videos, railItems, fill } = refs
  const N = videos.length
  if (!N) return function () {}

  const sw = createSwitcher(refs, true)

  /* First panel is painted before any scroll, so the section reads
     correctly the moment it appears rather than after a swap. The
     arming gate is still shut here, so this costs no bytes. */
  sw.setActive(0, true)

  /* ── Nothing is fetched until the section is nearly on screen ── */
  let armIO = null
  if ('IntersectionObserver' in window) {
    armIO = new IntersectionObserver(
      function (entries) {
        if (!entries[0].isIntersecting) return
        sw.openArming()
        armIO.disconnect()
        armIO = null
      },
      { rootMargin: '800px' }
    )
    armIO.observe(section)
  } else {
    sw.openArming()
  }

  /* ── Scroll driver ──────────────────────────────────────────────
     One equal slice of the track per variant. `floor` rather than
     `round` so the boundary is where the slice ends, which is what a
     visitor feels: the panel changes when the previous variant has
     been fully passed, not halfway through it. */
  function drive(self) {
    const p = self.progress
    sw.setActive(clamp(Math.floor(p * N), 0, N - 1))
    if (fill) fill.style.transform = 'scaleX(' + p + ')'
  }

  ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: drive,
    /* Also on refresh, so a deep link (or a resize) that lands mid-track
       shows the variant that belongs to that scroll position rather than
       whatever was last painted. */
    onRefresh: drive,
  })

  /* ── Only decode while the section is actually on screen.
     An IntersectionObserver rather than a third ScrollTrigger, because
     an IO reports its current state on the FIRST callback — a trigger
     only fires on a transition, so arriving already inside the section
     (a deep link, a back-navigation restoring scroll) would leave the
     clip paused on its poster. ── */
  let playIO = null
  if ('IntersectionObserver' in window) {
    playIO = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) sw.play(sw.current)
        else sw.pauseAll(-1)
      },
      { threshold: 0 }
    )
    playIO.observe(section)
  }

  /* ── Rail clicks scroll to the variant rather than jumping to it,
     so the change arrives the same way it would have by hand. ── */
  function scrollToVariant(i) {
    const travel = scrollEl.offsetHeight - window.innerHeight
    if (travel <= 0) return
    /* Middle of the slice — far enough from either boundary that a
       few pixels of overshoot cannot land on a neighbour. */
    const pTarget = (i + 0.5) / N
    const top = scrollEl.getBoundingClientRect().top + window.pageYOffset + pTarget * travel
    if (window.__glazeLenis) window.__glazeLenis.scrollTo(top)
    else window.scrollTo({ top: top, behavior: 'smooth' })
  }

  const ac = new AbortController()
  railItems.forEach(function (b, i) {
    b.addEventListener('click', function () { scrollToVariant(i) }, { signal: ac.signal })
  })

  bindRailKeys(railItems, scrollToVariant, ac.signal)

  const unbindPointer = bindCardPointer(refs.card)

  /* ── Track height: one viewport of travel per variant, plus a little
     lead-in so the first panel is readable before it starts changing.
     Recomputed on every ScrollTrigger refresh (resize). ── */
  function setHeight() {
    const vh = window.innerHeight
    scrollEl.style.height = Math.round(vh * (1 + N * 0.85)) + 'px'
  }
  setHeight()
  ScrollTrigger.addEventListener('refreshInit', setHeight)

  return function cleanup() {
    ac.abort()
    unbindPointer()
    if (armIO) armIO.disconnect()
    if (playIO) playIO.disconnect()
    sw.destroy()
    ScrollTrigger.removeEventListener('refreshInit', setHeight)
    scrollEl.style.height = ''
  }
}
