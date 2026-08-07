import { useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/utils/gsap'
import { useMediaQuery, useReducedMotion } from '@/hooks'
import { keepMuted } from '@/utils/media'
import { setSpec } from '@/utils/glz'
import { countWord } from '@/utils/format'
import './variantsMobile.css'

/**
 * VariantsMobile — §04 on a phone. A SEPARATE LAYOUT, NOT A NARROWER ONE.
 *
 * The desktop section is a cinematic reel: a sticky full-viewport stage
 * over a JS-sized scroll track, a glass HUD panel floating over the clip
 * and a segmented selector wheel in the corner. The MECHANISM of that is
 * kept here — the section pins, scrolling walks the variants one at a
 * time, and the page only carries on into §05 once the last one has been
 * passed. The COMPOSITION is not: at 390px the glass panel covers the
 * picture it is describing and the wheel has nowhere to sit that is not
 * on top of the panel.
 *
 * So below 768px the pinned stage holds this instead: a vertical,
 * editorial product page. Picture at the top, its controls on it, then
 * the name, one sentence, the four figures and a full-width enquiry
 * button at the foot. Nothing floats over the type, and the type sits on
 * the section's own ground rather than on glass — glass over a moving
 * picture is the thing that stops being readable on a small screen held
 * at arm's length.
 *
 * ⚠ THIS IS AN EITHER/OR, NOT AN OVERLAY. VariantsSection renders the
 * desktop reel OR this, on a `(max-width: 768px)` media query — so there
 * is only ever one stage, one track and one ScrollTrigger set on the
 * page. The desktop path is byte-for-byte what it was.
 *
 * ── WHAT THE PIN COSTS, AND WHY THE PICTURE IS SHAPED THE WAY IT IS ──
 * A pinned stage is exactly one viewport, and one viewport cannot hold a
 * 4:5 picture AND 38px of heading AND a sentence AND four figures AND a
 * 58px button on a 745px-tall phone. Two things give:
 *
 *   • the picture's height is FLEXIBLE rather than a fixed 4:5 — it takes
 *     whatever the type leaves, which is near 4:5 on a tall phone and
 *     around 4:3 on a short one. That is not the compromise it sounds
 *     like: the clips are natively 16:9, so a shorter frame shows MORE of
 *     each one, not less.
 *   • the arrows and the dots sit ON the picture rather than under it,
 *     which buys the frame back the ~58px a control row costs.
 *
 * Everything else — the type scale, the spec figures, the full-width
 * champagne button — is unchanged from the unpinned design, and the
 * unpinned design is still what renders under reduced motion or for a
 * system with a single variant (`.vrtm--flow` below).
 *
 * ⚠ EVERY CONTROL SCROLLS, IT DOES NOT SET STATE. While the section is
 * pinned the index is a function of the scroll position, so an arrow, a
 * dot or a swipe that wrote `active` directly would be overwritten by the
 * next ScrollTrigger update — the slide would snap back under the
 * finger. They all move the page to the middle of that variant's slice
 * instead and let the driver do the rest, which is what the desktop rail
 * does for the same reason.
 *
 * ⚠ THE <video>s SHIP WITHOUT `src`, exactly as they do on desktop:
 * `data-src` is promoted to `src` for the active clip and its two
 * neighbours only, and not before the section is within 600px of the
 * viewport. A system with eleven variants fetches three files.
 */

/** How far a finger has to travel across the frame to count as a swipe. */
const SWIPE_MIN = 44
/** Before this, a drag has not declared itself horizontal or vertical. */
const SWIPE_DECIDE = 8
/** The frame follows the finger this far, and no further. */
const DRAG_MAX = 40
const DRAG_DAMP = 0.28

/**
 * Viewports of scroll per variant, plus one for the lead-in.
 *
 * ⚠ 0.8, NOT THE DESKTOP'S 0.85. A phone viewport is shorter, so the same
 * fraction is less travel in pixels — but a phone also flicks further per
 * gesture than a wheel does per notch. Slightly under the desktop number
 * keeps eleven variants from being a nine-screen scroll while leaving
 * each one long enough to read before it changes.
 */
const TRACK_PER_VARIANT = 0.8

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi)
}

export default function VariantsMobile({ system, variants }) {
  const n = variants.length

  const [active, setActive] = useState(0)
  /* Nothing is fetched until the section is nearly on screen — the same
     gate the desktop reel opens from its own IntersectionObserver. */
  const [armed, setArmed] = useState(false)

  const rootRef = useRef(null)
  const scrollRef = useRef(null)
  const stageRef = useRef(null)
  const frameRef = useRef(null)
  const copyRef = useRef(null)
  const dockRef = useRef(null)
  const videosRef = useRef([])

  const reduceMotion = useReducedMotion()

  /* ⚠ A LANDSCAPE PHONE IS NOT PINNED, AND THIS HAS TO BE DECIDED HERE
     RATHER THAN IN CSS. A 400px-tall stage cannot hold a picture, a
     heading, a sentence, four figures and a 52px button at any scale.
     Un-pinning it in the stylesheet alone would leave the injected track
     height and the ScrollTrigger in place — several screens of empty
     scroll under a section that had already finished. The flag has to be
     the same one the driver reads, so it lives in JS and the layout
     follows it. Subscribed, not read once: this is the query a rotation
     crosses.

     560px, not 460px: it has to clear every landscape phone AND the
     320×480 portrait antiques, while staying well under the 640px that
     is the shortest portrait screen anything current ships. */
  const shortViewport = useMediaQuery('(max-height: 560px)')

  /* Reduced motion, or a single variant: nothing to scrub through, so
     nothing is pinned. Same layout, same content — only the storytelling
     scroll is withdrawn, exactly as initVariantsStatic does on desktop. */
  const pinned = !reduceMotion && n > 1 && !shortViewport

  /* Both are read by listeners that are bound once and must see the
     CURRENT value when they fire, not the one captured at bind time. */
  const activeRef = useRef(0)
  activeRef.current = active
  const pinnedRef = useRef(pinned)
  pinnedRef.current = pinned

  /* ── Where a variant lives on the track ──
     The middle of its slice — far enough from either boundary that a few
     pixels of overshoot cannot land on a neighbour. */
  const scrollToVariant = useCallback(
    (i) => {
      const scrollEl = scrollRef.current
      const stage = stageRef.current
      if (!scrollEl || !stage) return
      const travel = scrollEl.offsetHeight - stage.offsetHeight
      if (travel <= 0) return
      const top =
        scrollEl.getBoundingClientRect().top + window.pageYOffset + ((i + 0.5) / n) * travel
      if (window.__glazeLenis) window.__glazeLenis.scrollTo(top)
      else window.scrollTo({ top, behavior: 'smooth' })
    },
    [n]
  )

  /* The one entry point for every control. See the ⚠ in the header for
     why a pinned section may not simply setActive(). */
  const goTo = useCallback(
    (i) => {
      const target = clamp(i, 0, n - 1)
      if (pinnedRef.current) scrollToVariant(target)
      else setActive(target)
    },
    [n, scrollToVariant]
  )

  const go = useCallback((dir) => goTo(activeRef.current + dir), [goTo])

  /* ── The scroll driver ─────────────────────────────────────────
     One equal slice of the track per variant. `floor` rather than
     `round` so the boundary is where the slice ends, which is what a
     visitor feels: the picture changes when the previous variant has
     been fully passed, not halfway through it. Same rule, same maths as
     buildVariants() — this is the reel's mechanism on a phone, not a
     second one.

     ⚠ THE TRACK IS MEASURED FROM THE STAGE, NOT FROM window.innerHeight.
     The stage is `100svh` and innerHeight on a phone is the LARGE
     viewport — they differ by the height of the URL bar, and using the
     wrong one leaves the stage unpinning a bar's height before the last
     variant has been reached. */
  useGSAP(
    () => {
      if (!pinned) return
      const scrollEl = scrollRef.current
      const stage = stageRef.current
      if (!scrollEl || !stage) return

      function setHeight() {
        scrollEl.style.height =
          Math.round(stage.offsetHeight * (1 + n * TRACK_PER_VARIANT)) + 'px'
      }
      setHeight()
      ScrollTrigger.addEventListener('refreshInit', setHeight)

      function drive(self) {
        setActive(clamp(Math.floor(self.progress * n), 0, n - 1))
      }

      ScrollTrigger.create({
        trigger: scrollEl,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: drive,
        /* Also on refresh, so a deep link or a rotation that lands
           mid-track shows the variant belonging to that scroll position
           rather than whatever was last painted. */
        onRefresh: drive,
      })

      /* The trigger itself is reverted by the gsap context; the listener
         and the injected height are not, so they are undone here. */
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', setHeight)
        scrollEl.style.height = ''
      }
    },
    { scope: rootRef, dependencies: [pinned, n] }
  )

  /* ── The arming gate ── */
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setArmed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        setArmed(true)
        io.disconnect()
      },
      { rootMargin: '600px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /* ── Sources and playback ──────────────────────────────────────
     The outgoing clip keeps running until the crossfade has finished
     covering it; pausing it on the same tick freezes a half-lit frame
     in the middle of the dissolve. */
  useEffect(() => {
    if (!armed) return
    const vids = videosRef.current

    const arm = (i) => {
      const v = vids[i]
      if (!v || v.getAttribute('src') || !v.dataset.src) return
      v.setAttribute('src', v.dataset.src)
      v.preload = 'auto'
      try { v.load() } catch { /* ignore */ }
    }

    arm(active)

    /* Under reduced motion nothing plays on its own: the poster is the
       picture and the clip is there for anyone who asks for it, which is
       what the reel's static mode does too. */
    if (reduceMotion) {
      const v = vids[active]
      if (v) v.controls = true
      return
    }

    arm(active + 1)
    arm(active - 1)

    const v = vids[active]
    if (v) {
      const p = v.play()
      if (p && p.catch) p.catch(() => { /* autoplay refused — poster stays */ })
    }

    const t = setTimeout(() => {
      vids.forEach((el, i) => {
        if (el && i !== active && !el.paused) el.pause()
      })
    }, 520)
    return () => clearTimeout(t)
  }, [active, armed, reduceMotion])

  /* ── Only decode while the section is actually on screen ──
     An IntersectionObserver rather than a scroll listener, because an IO
     reports its state on the FIRST callback — arriving already inside the
     section (a deep link, a restored scroll position) would otherwise
     leave the clip paused on its poster. */
  useEffect(() => {
    if (reduceMotion || !('IntersectionObserver' in window)) return
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        const vids = videosRef.current
        if (entries[0].isIntersecting) {
          const v = vids[activeRef.current]
          if (v && v.getAttribute('src')) {
            const p = v.play()
            if (p && p.catch) p.catch(() => {})
          }
        } else {
          vids.forEach((v) => { if (v && !v.paused) v.pause() })
        }
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduceMotion])

  /* ── Swipe ─────────────────────────────────────────────────────
     Pointer events, not touch events, so a mouse drag on a small window
     works the same way. The frame follows the finger by a damped 28% up
     to 40px and springs back on release — the gesture has to answer
     before the slide changes, or a swipe on a phone feels like a tap
     that happened to work.

     ⚠ THE AXIS IS DECIDED ONCE, AT 8px, AND NEVER REVISITED. Without
     that latch a diagonal drag flickers between "this is a swipe" and
     "this is a scroll" all the way down the page — and on a pinned
     section the vertical axis is what walks the variants, so getting
     this wrong would fight the driver rather than merely feel loose.
     `touch-action: pan-y` in the stylesheet is the other half: the
     browser keeps the vertical for itself and hands us the horizontal,
     so nothing here ever calls preventDefault() on a scroll. */
  useEffect(() => {
    const el = frameRef.current
    if (!el || n < 2) return

    let id = null
    let sx = 0
    let sy = 0
    let decided = false
    let horiz = false

    const release = () => {
      id = null
      decided = false
      horiz = false
      el.classList.remove('is-dragging')
      el.style.removeProperty('--vrtm-drag')
    }

    const ac = new AbortController()
    const on = (type, fn) =>
      el.addEventListener(type, fn, { signal: ac.signal, passive: true })

    on('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      id = e.pointerId
      sx = e.clientX
      sy = e.clientY
      decided = false
      horiz = false
    })

    on('pointermove', (e) => {
      if (id === null || e.pointerId !== id) return
      const dx = e.clientX - sx
      const dy = e.clientY - sy
      if (!decided && (Math.abs(dx) > SWIPE_DECIDE || Math.abs(dy) > SWIPE_DECIDE)) {
        decided = true
        horiz = Math.abs(dx) > Math.abs(dy)
        if (horiz) el.classList.add('is-dragging')
      }
      if (!decided || !horiz) return
      const drag = clamp(dx * DRAG_DAMP, -DRAG_MAX, DRAG_MAX)
      el.style.setProperty('--vrtm-drag', `${drag.toFixed(1)}px`)
    })

    on('pointerup', (e) => {
      if (id === null || e.pointerId !== id) return
      const dx = e.clientX - sx
      const swipe = decided && horiz && Math.abs(dx) > SWIPE_MIN
      release()
      if (swipe) go(dx < 0 ? 1 : -1)
    })

    on('pointercancel', release)
    on('pointerleave', release)

    return () => {
      ac.abort()
      release()
    }
  }, [go, n])

  /* ── The button's clearance flag ───────────────────────────────
     The site's chat launcher is `position: fixed` in the bottom-right
     corner of every page, and on a phone it is a 52px circle exactly
     where the enquiry button's right end is. While that button is on
     screen the launcher steps up above it — a class on <body>, read by
     one rule in this section's stylesheet, so the widget itself knows
     nothing about this section. */
  useEffect(() => {
    const el = dockRef.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => document.body.classList.toggle('vrtm-dock-on', entries[0].isIntersecting),
      { threshold: 0 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      document.body.classList.remove('vrtm-dock-on')
    }
  }, [])

  /* ── The slide change ──────────────────────────────────────────
     The picture crossfades and settles out of scale(1.02) in CSS —
     both composited, both 450ms. GSAP animates only the type, which is
     what it is already doing on desktop: the block fades upward and the
     specification rows arrive in sequence rather than as one slab.

     ⚠ THE LINES ARE ANIMATED, NOT THE PANEL. The panel's own visibility
     is a class, so an interrupted tween can never leave two variants
     stacked in the same piece of type — the failure the reel's
     controller documents at length. */
  useGSAP(
    () => {
      if (reduceMotion) return
      const el = copyRef.current
      if (!el) return
      const item = el.querySelector('.vrtm__copy-item.is-active')
      if (!item) return
      gsap.fromTo(
        item.querySelectorAll('[data-vrtm-line]'),
        { y: 14, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.45,
          ease: 'power3.out',
          stagger: 0.045,
          overwrite: true,
        }
      )
    },
    { scope: rootRef, dependencies: [active] }
  )

  const onKeyDown = (e) => {
    if (n < 2) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(1) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); go(-1) }
    else if (e.key === 'Home') { e.preventDefault(); goTo(0) }
    else if (e.key === 'End') { e.preventDefault(); goTo(n - 1) }
  }

  const total = String(n).padStart(2, '0')
  const current = variants[active]

  return (
    <div className={pinned ? 'vrtm vrtm--pinned' : 'vrtm vrtm--flow'} ref={rootRef}>
      {/* The tall scrub track. JS raises this height to buy one stage of
          travel per variant; until it does — and in flow mode, where it
          never does — the section is exactly one screen and reads
          correctly. */}
      <div className="vrtm__scroll" ref={scrollRef}>
        <div className="vrtm__stage" ref={stageRef}>

          {/* The section's own heading. The variant's name is the big
              type on this layout and the picture is meant to be the
              first thing on screen, so the section title is left to the
              screen reader and the eye gets the picture. */}
          <h2 className="vrtm__sr" id="vrt-title">
            {system.name} — {n === 1 ? 'one format' : `${countWord(n).toLowerCase()} formats`}
          </h2>

          {/* A pinned stage has no room to spend a line on orientation —
              the counter on the picture is doing that job there. */}
          {!pinned && <p className="vrtm__kicker">Formats</p>}

          {/* ── The picture ── */}
          <div
            className="vrtm__frame"
            ref={frameRef}
            role="group"
            tabIndex={n > 1 ? 0 : -1}
            aria-roledescription="carousel"
            aria-label={`${system.name} formats — swipe or use the arrow keys`}
            onKeyDown={onKeyDown}
          >
            <div className="vrtm__stack" aria-hidden="true">
              {variants.map((v, i) => (
                <div className={i === active ? 'vrtm__layer is-live' : 'vrtm__layer'} key={v.id}>
                  <video
                    data-src={v.video}
                    poster={v.poster}
                    muted
                    ref={(el) => {
                      videosRef.current[i] = el
                      keepMuted(el)
                    }}
                    loop
                    playsInline
                    preload="none"
                    tabIndex={-1}
                  ></video>
                </div>
              ))}
            </div>

            <span className="vrtm__frame-scrim" aria-hidden="true"></span>

            <p className="vrtm__counter" aria-hidden="true">
              <span className="vrtm__counter-now">{current.num}</span>
              <span className="vrtm__counter-sep">/</span>
              <span className="vrtm__counter-all">{total}</span>
            </p>
          </div>

          {/* ── Navigation ──
              Two outline buttons and one dot per variant. The wheel does
              not come down here: it is a 250px shape that reads by hover,
              and both of those are desktop luxuries.

              ⚠ IT IS A SIBLING OF THE FRAME IN BOTH MODES and is pulled
              up ONTO the picture by a negative margin when the section is
              pinned — see the stylesheet. Moving it inside the frame
              would have meant two markups for one control. */}
          {n > 1 && (
            <nav className="vrtm__nav" aria-label={`${system.name} variants`}>
              <button
                className="vrtm__arrow"
                type="button"
                onClick={() => go(-1)}
                disabled={active === 0}
                aria-label="Previous format"
              >
                <span aria-hidden="true">&#8592;</span>
              </button>

              <span className="vrtm__dots">
                {variants.map((v, i) => (
                  <button
                    className={i === active ? 'vrtm__dot is-current' : 'vrtm__dot'}
                    type="button"
                    key={v.id}
                    onClick={() => goTo(i)}
                    aria-label={v.name}
                    aria-current={i === active ? 'true' : undefined}
                  >
                    <span aria-hidden="true"></span>
                  </button>
                ))}
              </span>

              <button
                className="vrtm__arrow"
                type="button"
                onClick={() => go(1)}
                disabled={active === n - 1}
                aria-label="Next format"
              >
                <span aria-hidden="true">&#8594;</span>
              </button>
            </nav>
          )}

          {/* ── The copy ──
              Every variant is rendered into one grid cell so the block
              takes the height of the longest of them and nothing moves
              when the slide changes. `aria-live` announces the swap for
              anyone driving this with the arrows rather than by eye. */}
          <div className="vrtm__copy" ref={copyRef} aria-live="polite">
            {variants.map((v, i) => (
              <article
                className={i === active ? 'vrtm__copy-item is-active' : 'vrtm__copy-item'}
                key={v.id}
                aria-label={v.name}
                aria-hidden={i === active ? undefined : 'true'}
              >
                <p className="vrtm__eyebrow" data-vrtm-line>{v.kind}</p>
                <h3 className="vrtm__name" data-vrtm-line>{v.name}</h3>
                <p className="vrtm__lede" data-vrtm-line>{v.lede}</p>

                <p className="vrtm__specs-label" data-vrtm-line>Technical Specifications</p>
                <dl className="vrtm__specs">
                  {v.specs.map((s) => (
                    <div className="vrtm__spec" key={s.k} data-vrtm-line>
                      <dt className="vrtm__spec-key">{s.k}</dt>
                      <dd className="vrtm__spec-val">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>

          {/* ── CTA ──
              ⚠ `onPointerDown`, NOT `onClick`, and that is not a style
              choice. useProductsScrollBridge listens for clicks in the
              CAPTURE phase at `document` and calls stopPropagation() on
              every `a[href^="#"]`, so a React onClick on this anchor would
              never run. pointerdown is not intercepted; the keydown pair
              covers Enter and Space, which fire no pointer event at all.
              What it writes is `spec.variant` — see the same handler on
              the desktop panel. */}
          <div className="vrtm__dock" ref={dockRef}>
            <a
              className="vrtm__cta"
              href="#contact"
              onPointerDown={() => setSpec('variant', current.name)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSpec('variant', current.name)
              }}
            >
              <span className="vrtm__cta-label">Enquire with this Variant</span>
              <span className="vrtm__cta-arrow" aria-hidden="true">&rarr;</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
