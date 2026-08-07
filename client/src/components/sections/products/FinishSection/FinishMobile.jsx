import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/utils/gsap'
import { useReducedMotion } from '@/hooks'
import { setSpec } from '@/utils/glz'
import { countWord } from '@/utils/format'
import './finishMobile.css'

/**
 * FinishMobile — §08 on a phone. A SEPARATE LAYOUT, NOT A NARROWER ONE.
 *
 * The desktop section is a two-column hover study: a square stage of eight
 * stacked photographs beside a headline, a row of family labels and a 4×2
 * grid of chips, all of it driven by HOVER — the stage previews whatever
 * the pointer is over and settles back to the locked finish when it
 * leaves. A phone has no pointer, so on a phone that composition arrives
 * as a picture with eight unexplained squares under it.
 *
 * So below 768px the section holds a configurator instead, and the
 * configurator is PUT AWAY until it is asked for. What the visitor first
 * meets is one large photograph of the frame and a single floating pill;
 * tapping it expands that pill, in place, into a compact card carrying
 * the copy and the eight finishes.
 *
 * ⚠ THIS IS AN EITHER/OR, NOT AN OVERLAY. FinishSection renders the
 * desktop study OR this, on a `(max-width: 768px)` media query — so
 * `initFinishSwitcher` and its hover/focus/mouseleave bindings do not
 * exist on a phone, and none of this exists above it. The desktop path is
 * byte-for-byte what it was.
 *
 * ⚠ SAME DATA, SAME SPEC KEYS. The eight finishes are handed down from
 * FinishSection rather than re-authored, and a tap writes the same two
 * keys the desktop switcher writes — `finish` (the colour the visitor
 * saw, which the standing spec sheet mirrors) and `finishType` (the
 * family the enquiry form records). Nothing downstream can tell which
 * layout produced them.
 *
 * ── WHY THIS IS A CARD AND NOT THE BOTTOM SHEET IT WAS ──────────
 * It was a fullscreen sheet: 70svh of dark ground, a scrim over the page,
 * the page scaled back, the body scroll locked, and the whole thing
 * portalled to `document.body` so the transform on the page could not
 * capture its `position: fixed`. It worked, and it was the wrong object.
 *
 * A sheet that size has to be FILLED, so the swatches grew names and the
 * families grew a row of tabs, and eight circles with captions over two
 * scrolling rows is a worse picture of eight colours than eight circles
 * in a block. Worse, the sheet covered the very thing it was configuring:
 * the frame survived only as a ~250px strip above it, which is why the
 * page had to be scrolled and frozen to keep that strip pointed at the
 * photograph at all.
 *
 * The card fixes all of it by being small. It sits ON the picture, over
 * the corner it is describing, and the frame stays whole behind it. Being
 * non-modal, it needs no scrim, no scroll lock, no scroll-into-place, no
 * focus trap and no portal — that entire apparatus is gone rather than
 * refactored, and with it the two bugs it carried.
 *
 * ── WHAT THE CARD DOES NOT HAVE ─────────────────────────────────
 * ⚠ NO SWATCH NAMES, AND NO FAMILY TABS. Both were in the sheet and both
 * are gone, because the live line does their job in one place: "Frame
 * shown in Champagne Bronze, anodised" names the selection AND its family
 * in prose, and the selection is one tap away from every other. Eight
 * captions repeat, at 10px, what one sentence says at 15px — and the
 * captions were the reason the swatches had to be small. Every name is
 * still on each button's `aria-label`, so nothing is lost to a screen
 * reader.
 */

/* ── The settle ─────────────────────────────────────────────────
   The new finish arrives a little to the right, overshoots back past
   centre and comes to rest — the movement a panel makes being dropped
   into a frame rather than a slide transition.

   ⚠ THE NUMBERS ARE THE WHOLE POINT AND THEY ARE SMALL. 10px on a 390px
   frame is under 3% of its width; at 20px it stops reading as settling
   and starts reading as a carousel sliding, which is the one thing this
   frame is not. */
const SETTLE = [
  { x: 10, duration: 0.13, ease: 'power2.out' },
  { x: -5, duration: 0.15, ease: 'sine.inOut' },
  { x: 0, duration: 0.2, ease: 'power2.out' },
]

/** The expand and collapse. Both inside the brief's 350–450ms. */
const CARD_IN = 0.42
const CARD_OUT = 0.26

/* ── The hint ───────────────────────────────────────────────────
   The pill is the only control on the page and it is a small object in
   the corner of a large photograph, which is exactly the shape of thing a
   thumb scrolls straight past. So it knocks: a ring opens out of it and
   fades, four times, with a long pause between.

   ⚠ IT ENDS, AND IT ENDS EARLY. A pulse that runs until it is obeyed is
   not a hint, it is a nag — and this one sits over a photograph the
   visitor may simply be looking at. Four knocks is enough to be seen and
   few enough to be ignored; opening the card kills it on the spot and it
   never returns. */
const HINT_REPEATS = 3
const HINT_GAP = 1.7

export default function FinishMobile({ finishes }) {
  const rootRef = useRef(null)
  const heroRef = useRef(null)
  const copyRef = useRef(null)
  const pillRef = useRef(null)
  const pulseRef = useRef(null)
  const cardRef = useRef(null)
  const layerRefs = useRef([])
  const swatchRefs = useRef([])
  const hintRef = useRef(null)

  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const reduceMotion = useReducedMotion()

  const current = finishes[active]

  /* The one place the selection changes, so the picture, the live line,
     the pill's disc and the two spec keys cannot fall out of step. */
  const select = useCallback(
    (i) => {
      const f = finishes[i]
      if (!f) return
      setActive(i)
      setSpec('finish', f.name)
      setSpec('finishType', f.family)
    },
    [finishes]
  )

  /* ── The picture change ────────────────────────────────────────
     Crossfade, a 1.02 settle and the horizontal nudge, driven
     imperatively because three properties have to be choreographed
     against each other on two elements at once.

     ⚠ GSAP OWNS `opacity` / `transform` HERE AND THE `is-live` CLASS OWNS
     THEM BEFORE IT RUNS. That division is deliberate: the class is what
     makes the first paint and the reduced-motion path correct without a
     frame of JS, and the inline styles GSAP writes outrank it from the
     first change onward. Both agree about where every layer ends up, so
     they can never disagree on screen. */
  const prevActive = useRef(active)
  useLayoutEffect(() => {
    const from = prevActive.current
    prevActive.current = active
    if (from === active) return

    const incoming = layerRefs.current[active]
    const outgoing = layerRefs.current[from]
    if (!incoming) return

    if (reduceMotion) {
      gsap.set(incoming, { opacity: 1, scale: 1, x: 0, zIndex: 2 })
      if (outgoing) gsap.set(outgoing, { opacity: 0, zIndex: 1 })
      return
    }

    gsap.killTweensOf([incoming, outgoing].filter(Boolean))
    gsap.set(incoming, { zIndex: 2 })
    if (outgoing) gsap.set(outgoing, { zIndex: 1 })

    gsap.fromTo(
      incoming,
      { opacity: 0, scale: 1.02, x: 0 },
      { opacity: 1, duration: 0.4, ease: 'power2.out' }
    )
    gsap.to(incoming, { scale: 1, duration: 0.55, ease: 'power3.out' })
    gsap.to(incoming, { keyframes: SETTLE })

    if (outgoing) gsap.to(outgoing, { opacity: 0, duration: 0.32, ease: 'power1.out' })
  }, [active, reduceMotion])

  /* ── Expanding and collapsing ──────────────────────────────────
     `open` mounts the card; the tween runs in the layout effect below,
     before paint, so there is no frame of a card at rest to see.
     Collapsing is the other way round — the tween runs first and unmounts
     the card when it lands, which is why nothing here sets `open` false
     directly.

     ⚠ THE CARD'S START TRANSFORM IS SET IN JS, NOT CSS, and that is not a
     preference. GSAP seeds its transform from the element's COMPUTED
     MATRIX, so a start state declared in the stylesheet comes back to it
     in resolved pixels and lands in a different channel than the one the
     tween names — a `translateY(100%)` start read as `y: 590px` while the
     tween animates `yPercent`, and the element never moves. Whoever owns
     the property sets the start state; GSAP owns this one. */
  const openCard = useCallback(() => setOpen(true), [])

  const closeCard = useCallback(() => {
    const card = cardRef.current
    const pill = pillRef.current
    if (!card) return setOpen(false)

    if (reduceMotion) {
      gsap.set(pill, { autoAlpha: 1, scale: 1 })
      return setOpen(false)
    }

    gsap.to(card, {
      autoAlpha: 0,
      scale: 0.94,
      duration: CARD_OUT,
      ease: 'power2.in',
      onComplete: () => setOpen(false),
    })
    gsap.to(pill, { autoAlpha: 1, scale: 1, duration: 0.3, delay: 0.08, ease: 'power3.out' })
  }, [reduceMotion])

  useLayoutEffect(() => {
    if (!open) return undefined

    const card = cardRef.current
    const pill = pillRef.current

    /* The hint has been obeyed. It does not run again. */
    hintRef.current?.kill()
    gsap.set(pulseRef.current, { autoAlpha: 0 })

    if (reduceMotion) {
      gsap.set(card, { autoAlpha: 1, scale: 1 })
      gsap.set(pill, { autoAlpha: 0 })
    } else {
      /* Out of the pill, not up from the floor: the card's origin is the
         pill's own corner, so it reads as that control unfolding rather
         than as a second object arriving over it. */
      gsap.fromTo(
        card,
        { autoAlpha: 0, scale: 0.9 },
        { autoAlpha: 1, scale: 1, duration: CARD_IN, ease: 'power3.out' }
      )
      gsap.to(pill, { autoAlpha: 0, scale: 0.96, duration: 0.2, ease: 'power2.in' })
    }

    return undefined
  }, [open, reduceMotion])

  /* Escape collapses. No focus trap and no `aria-modal`: this is a
     popover on a photograph, not a dialog over a page — nothing behind it
     is inert, and taking Tab away from the rest of the page would be a
     lie about what it is. */
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      closeCard()
      pillRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeCard])

  /* Arrow keys walk the radiogroup and select as they go — the same
     grammar as the desktop switcher's keydown handler, which also selects
     on arrow rather than only moving focus. */
  const onSwatchKeyDown = useCallback(
    (e) => {
      let next = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (active + 1) % finishes.length
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (active - 1 + finishes.length) % finishes.length
      if (next === null) return
      e.preventDefault()
      select(next)
      swatchRefs.current[next]?.focus()
    },
    [active, finishes.length, select]
  )

  /* The entrance, and the hint.

     `.fin__stage` and `.fin__lede` are what useProductsEntrance reaches
     for on this section and neither exists in this tree, so the reveals
     are re-declared here in the same terms — the 1.2s clip on the
     picture, the 26px fade-up on the copy — rather than in new ones. */
  useGSAP(
    () => {
      if (reduceMotion) return

      gsap.fromTo(
        heroRef.current,
        { clipPath: 'inset(0 0 100% 0)' },
        {
          clipPath: 'inset(0 0 0% 0)',
          duration: 1.2,
          ease: 'power3.inOut',
          scrollTrigger: { trigger: heroRef.current, start: 'top 92%', once: true },
        }
      )

      gsap.from(copyRef.current.children, {
        y: 26,
        autoAlpha: 0,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.09,
        scrollTrigger: { trigger: copyRef.current, start: 'top 90%', once: true },
      })

      /* ⚠ HELD UNTIL THE PILL IS ACTUALLY ON SCREEN. Started on mount it
         would knock at a corner of the page nobody has scrolled to, spend
         all four repeats, and be over before the section arrives. */
      hintRef.current = gsap.timeline({ repeat: HINT_REPEATS, repeatDelay: HINT_GAP, paused: true })
        .fromTo(
          pulseRef.current,
          { scale: 1, opacity: 0.5 },
          { scale: 1.45, opacity: 0, duration: 1.15, ease: 'power2.out' }
        )

      ScrollTrigger.create({
        trigger: heroRef.current,
        start: 'top 65%',
        once: true,
        onEnter: () => hintRef.current?.play(),
      })
    },
    { scope: rootRef, dependencies: [reduceMotion] }
  )

  return (
    <div className="finm" ref={rootRef}>

      {/* ── The preview ──────────────────────────────────────────
          All eight photographs ship stacked, exactly as they do on
          desktop, and one is live.

          ⚠ NOT A CAROUSEL. No dots, no arrows, no swipe, no timer — the
          frame is a readout of the selection and moves only when that
          selection does. */}
      <div className="finm__hero" ref={heroRef}>
        {finishes.map((f, i) => (
          <div
            className={i === active ? 'finm__layer is-live' : 'finm__layer'}
            key={f.key}
            ref={(el) => { layerRefs.current[i] = el }}
            aria-hidden={i === active ? undefined : 'true'}
          >
            <img
              src={`/products/finish/${f.key}.webp`}
              alt={i === active ? f.alt : ''}
              {...(i === 0 ? {} : { loading: 'lazy' })}
              decoding="async"
            />
          </div>
        ))}

        {/* ⚠ THE DISC IS THE FINISH ITSELF, NOT A DOT. It started as a 7px
            champagne pip — decoration, saying only "this button is about
            colour". Carrying the selected chip at 22px instead makes the
            control a readout: the pill answers "which finish is this?"
            without being opened, and it changes when the selection does.

            ⚠ IT STAYS MOUNTED WHILE THE CARD IS OPEN, faded rather than
            removed. Unmounting it would take the element the card grows
            out of — and the element focus returns to — out of the
            document mid-animation. */}
        <button
          className="finm__pill"
          type="button"
          ref={pillRef}
          onClick={openCard}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={`Colours — showing ${current.name}. Choose a finish`}
          {...(open ? { tabIndex: -1, 'aria-hidden': 'true' } : {})}
        >
          <span className="finm__pill-pulse" ref={pulseRef} aria-hidden="true"></span>
          <span className="finm__pill-chip" aria-hidden="true">
            <img src={`/products/finish/${current.key}-chip.webp`} alt="" decoding="async" />
          </span>
          <span className="finm__pill-label">Colours</span>
        </button>

        {/* ── The card ───────────────────────────────────────────
            Two lines of prose and eight circles, on the picture it is
            configuring. Anchored to the same corner as the pill so the
            expand has somewhere to come from. */}
        {open && (
          <div className="finm__card" ref={cardRef} role="group" aria-label="Frame finish">
            <button
              className="finm__card-close"
              type="button"
              onClick={() => { closeCard(); pillRef.current?.focus() }}
              aria-label="Close colours"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M6 6 14 14M14 6 6 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {/* Lead-in and offer, then what is on screen right now. The
                second line is the only one that moves, and it is doing
                three jobs at once: it names the selection, it names that
                selection's FAMILY — the value the enquiry form records —
                and by doing both in prose it is why neither the swatches
                nor the card need labels of their own.

                ⚠ THE COUNT IS COUNTED. `countWord(finishes.length)`, the
                same helper the variants headline uses, so a ninth finish
                does not leave the card claiming there are eight. */}
            <p className="finm__card-copy">
              <b>Colours.</b>{' '}
              Choose from {countWord(finishes.length).toLowerCase()} factory finishes.
            </p>
            <p className="finm__card-shown" aria-live="polite">
              Frame shown in <span>{current.name}</span>, {current.family.toLowerCase()}.
            </p>

            <div className="finm__row" role="radiogroup" aria-label="Frame finish">
              {finishes.map((f, i) => (
                <button
                  className={i === active ? 'finm__sw is-active' : 'finm__sw'}
                  type="button"
                  role="radio"
                  aria-checked={i === active}
                  tabIndex={i === active ? 0 : -1}
                  key={f.key}
                  ref={(el) => { swatchRefs.current[i] = el }}
                  onClick={() => select(i)}
                  onKeyDown={onSwatchKeyDown}
                  aria-label={`${f.name}, ${f.family}`}
                >
                  <span className="finm__sw-chip">
                    <img src={`/products/finish/${f.key}-chip.webp`} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="finm__sw-ring" aria-hidden="true"></span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="finm__copy" ref={copyRef}>
        {/* ⚠ `fin-title` LIVES HERE ON A PHONE. The section's
            aria-labelledby points at it and only one of the two trees is
            ever rendered, so the id is not duplicated. */}
        <h2 className="sec-title finm__title" id="fin-title">
          Choose a finish.<br /><em>Watch it settle.</em>
        </h2>

        <p className="finm__lede">
          The same profile, dressed eight ways. Anodised metals,
          powder-coated solids and wood-grain sublimation — each one a
          factory finish, not a coating applied on site.
        </p>

        {/* The same figure the desktop rule carries, boxed — at this width
            a hairline with a number on it reads as the foot of the section
            rather than as part of the offer. */}
        <div className="finm__ral">
          <p className="finm__ral-fig">100+</p>
          <p className="finm__ral-key">RAL Colours</p>
          <p className="finm__ral-sub">Across five finish families</p>
        </div>
      </div>
    </div>
  )
}
