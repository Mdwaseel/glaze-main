import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGSAP } from '@gsap/react'
import { gsap } from '@/utils/gsap'
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
 * meets is one large photograph of the frame and a single floating
 * control; the eight finishes and the four families live in a bottom
 * sheet that rises when that control is tapped. The reference points are
 * the pages this section competes with on a phone — Apple's and
 * Polestar's material pickers — not this site's own desktop.
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
 * ── WHY THE SHEET IS PORTALLED ──────────────────────────────────
 * The page behind the sheet scales down as it rises, and a CSS transform
 * makes its element the containing block for every `position: fixed`
 * descendant — a sheet left inside `.finm` would be positioned against
 * the shrinking page rather than against the viewport, and would shrink
 * with it. Rendering it into `document.body` is what keeps "fixed"
 * meaning fixed. It also puts the sheet cleanly above the nav (z-index
 * 60) without either one having to know about the other.
 *
 * ⚠ WHAT SCALES IS `.finm`, NOT THE SECTION. `.fin` paints the black
 * ground; `.finm` is the content inside it. Scaling the content leaves
 * the ground full-bleed, so the effect reads as the page stepping back
 * rather than as a black card with a seam around it.
 *
 * ── THE FAMILY PILLS ────────────────────────────────────────────
 * ⚠ A PILL SELECTS, IT DOES NOT FILTER. Tapping "Wood Grain" jumps to the
 * first wood-grain finish and lights up; the pill that is lit is always
 * the family of whatever finish is currently selected, so the row is a
 * readout as much as a control. All eight swatches stay on screen
 * throughout. Filtering is the obvious reading of "tabs" and it is wrong
 * for THIS list: two of the four families have a single finish in them,
 * so a filtered grid opens on one lonely circle in a fullscreen sheet —
 * and the default finish, Champagne Bronze, is in one of those two.
 */

/** The four families, in the order the desktop label row lists them. */
const FAMILIES = ['Powder Coat', 'PVDF', 'Wood Grain', 'Anodised']

/* ── The settle ─────────────────────────────────────────────────
   The new finish arrives a little to the right, overshoots back past
   centre and comes to rest — the movement a panel makes being dropped
   into a frame rather than a slide transition. Written as three legs so
   the overshoot is a real second direction and not an ease.

   ⚠ THE NUMBERS ARE THE WHOLE POINT AND THEY ARE SMALL. 10px on a 390px
   frame is under 3% of its width; at 20px it stops reading as settling
   and starts reading as a carousel sliding, which is the one thing this
   frame is not. */
const SETTLE = [
  { x: 10, duration: 0.13, ease: 'power2.out' },
  { x: -5, duration: 0.15, ease: 'sine.inOut' },
  { x: 0, duration: 0.2, ease: 'power2.out' },
]

/** Open and close both land inside the brief's 350–450ms. */
const SHEET_IN = 0.42
const SHEET_OUT = 0.36

export default function FinishMobile({ finishes }) {
  const rootRef = useRef(null)
  const pageRef = useRef(null)
  const heroRef = useRef(null)
  const copyRef = useRef(null)
  const pillRef = useRef(null)
  const scrimRef = useRef(null)
  const sheetRef = useRef(null)
  const closeRef = useRef(null)
  const layerRefs = useRef([])
  const swatchRefs = useRef([])

  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const reduceMotion = useReducedMotion()

  const current = finishes[active]

  /* First index of each family, so a pill knows where to jump. */
  const familyHead = useMemo(() => {
    const head = {}
    finishes.forEach((f, i) => {
      if (head[f.family] === undefined) head[f.family] = i
    })
    return head
  }, [finishes])

  /* The one place the selection changes, so the picture and the two spec
     keys cannot fall out of step. Tapping the finish already showing is a
     no-op for the layers but still re-stamps the spec, exactly as a
     second click does on desktop. */
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
     makes the first paint, the no-JS render and the reduced-motion path
     correct without a frame of JS, and the inline styles GSAP writes
     simply outrank it from the first change onward. Both agree about
     where every layer ends up, so they can never disagree on screen. */
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

  /* ── Opening and closing ───────────────────────────────────────
     `open` mounts the portal; the animation runs in the layout effect
     below, once the nodes exist. Closing is the other way round — the
     tween runs first and unmounts the portal when it lands, which is why
     nothing here sets `open` to false directly. */
  const openSheet = useCallback(() => setOpen(true), [])

  const closeSheet = useCallback(() => {
    const sheet = sheetRef.current
    const scrim = scrimRef.current
    const page = pageRef.current
    if (!sheet) return setOpen(false)

    const done = () => setOpen(false)

    if (reduceMotion) return done()

    gsap.to(sheet, { yPercent: 100, duration: SHEET_OUT, ease: 'power3.in', onComplete: done })
    gsap.to(scrim, { opacity: 0, duration: SHEET_OUT, ease: 'power2.in' })
    gsap.to(page, { scale: 1, duration: SHEET_OUT, ease: 'power3.out' })
  }, [reduceMotion])

  /* ⚠ THE PAGE IS SCROLLED BEFORE IT IS FROZEN, and that is what makes
     the preview a preview. The sheet covers the bottom ~70% of the
     screen, so what shows above it is whatever happened to be there when
     the pill was tapped — and the pill sits at the FOOT of the picture,
     so at that moment the strip above the sheet is usually the section
     ABOVE this one. The frame has to be moved into the gap the sheet
     leaves, or there is nothing to preview.

     ⚠ CENTRED IN THE STRIP, NOT ALIGNED TO ITS TOP. The strip is around
     240px and the frame is around 520px, so something is cropped either
     way; centring crops top and bottom equally and leaves the middle of
     the photograph — where the corner detail actually is — on screen.
     Aligning to the top would spend the strip on the frame's head rail.

     ⚠ THE STRIP IS MEASURED, NOT ASSUMED. `stripOf` reads the sheet's own
     height off the DOM, so the 70svh in the stylesheet is the single
     place that number is written down and this stays correct if it moves.

     Lenis when it is running, because two scroll owners disagreeing about
     the current offset is how a page ends up drifting after the sheet
     closes. `immediate` skips its 1.1s easing — the movement is meant to
     be hidden under the sheet's rise, not watched. */
  const lockScroll = useCallback(() => {
    const hero = heroRef.current
    const sheet = sheetRef.current
    if (!hero) return

    const strip = Math.max(0, window.innerHeight - (sheet ? sheet.getBoundingClientRect().height : 0))
    const r = hero.getBoundingClientRect()
    const top = Math.max(0, (window.scrollY || 0) + r.top + r.height / 2 - strip / 2)

    const lenis = window.__glazeLenis
    if (lenis) {
      lenis.scrollTo(top, { immediate: true })
      lenis.stop()
    } else {
      window.scrollTo(0, top)
    }
    /* ⚠ BOTH ELEMENTS, NOT JUST `body`. Which of the two is the scrolling
       element is not the same across browsers, and `overflow: hidden` on
       the one that is not does nothing at all. `lenis.stop()` above
       already blocks wheel and touch wherever Lenis is running — this is
       what covers the reduced-motion path, where there is no Lenis. */
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }, [])

  const unlockScroll = useCallback(() => {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
    if (window.__glazeLenis) window.__glazeLenis.start()
  }, [])

  useLayoutEffect(() => {
    if (!open) return undefined

    const sheet = sheetRef.current
    const scrim = scrimRef.current
    const page = pageRef.current
    /* Captured now rather than read in the cleanup: by the time the
       cleanup runs the sheet has already unmounted, and the pill this
       dialog was opened FROM is the one focus has to go back to. */
    const pill = pillRef.current

    lockScroll()

    /* ⚠ `y: 0` IS LOAD-BEARING IN BOTH BRANCHES. GSAP composes its
       transform from `y` (pixels) and `yPercent` separately, and it seeds
       both from the element's computed matrix — so any pixel offset it
       inherits survives a tween that only names yPercent. Pinning y to 0
       as part of the start state is what guarantees the sheet's position
       is described by yPercent alone, which is the only unit that stays
       correct when the sheet's own height changes. */
    if (reduceMotion) {
      gsap.set(sheet, { y: 0, yPercent: 0 })
      gsap.set(scrim, { opacity: 1 })
    } else {
      gsap.fromTo(sheet, { y: 0, yPercent: 100 }, { yPercent: 0, duration: SHEET_IN, ease: 'power3.out' })
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: SHEET_IN, ease: 'power2.out' })
      /* Not opacity as well — the picture behind the sheet has to stay
         readable, because watching it change is the reason the sheet is
         not opaque in the first place. The scrim does the darkening. */
      gsap.to(page, { scale: 0.94, duration: SHEET_IN, ease: 'power3.out' })
    }

    closeRef.current?.focus()

    return () => {
      unlockScroll()
      /* The page is left exactly where the close tween put it — but if
         the component unmounts mid-animation (a rotation across 768px)
         the tween never lands, so the transform is cleared here too. */
      gsap.killTweensOf(page)
      gsap.set(page, { scale: 1 })
      pill?.focus()
    }
  }, [open, reduceMotion, lockScroll, unlockScroll])

  /* Escape closes, and Tab is kept inside the sheet — the two things a
     dialog owes a keyboard that the browser will not do for it. */
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeSheet()
        return
      }
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet) return
      const stops = sheet.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')
      if (!stops.length) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, closeSheet])

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

  /* The entrance. `.fin__stage` and `.fin__lede` are what
     useProductsEntrance reaches for on this section and neither exists in
     this tree, so the reveals are re-declared here in the same terms —
     the 1.2s clip on the picture, the 26px fade-up on the copy — rather
     than in new ones. */
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
    },
    { scope: rootRef, dependencies: [reduceMotion] }
  )

  const swatchGrid = (
    <div className="finm__swatches" role="radiogroup" aria-label="Frame finish">
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
        >
          <span className="finm__sw-chip">
            <img src={`/products/finish/${f.key}-chip.webp`} alt="" loading="lazy" decoding="async" />
            <span className="finm__sw-ring" aria-hidden="true"></span>
            <span className="finm__sw-tick" aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.4 6.6 11.4 12.5 5" stroke="currentColor" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
          <span className="finm__sw-name">{f.name}</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="finm" ref={rootRef}>

      {/* Everything that steps back when the sheet rises. */}
      <div className="finm__page" ref={pageRef}>

        {/* ── The preview ────────────────────────────────────────
            All eight photographs ship stacked, exactly as they do on
            desktop, and one is live.

            ⚠ NOT A CAROUSEL. No dots, no arrows, no swipe, no timer —
            the frame is a readout of the selection and moves only when
            that selection does. */}
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

          {/* The only control on the picture, and the only one on the
              page until it is pressed.

              ⚠ THE DISC IS THE FINISH ITSELF, NOT A DOT. It started as a
              7px champagne pip — decoration, saying only "this button is
              about colour". Carrying the selected chip at 22px instead
              makes the control a readout: the pill answers "which finish
              is this?" without being opened, and it changes when the
              selection does. That is the whole difference between a menu
              button and a configurator's swatch, and it is why the label
              can stay one calm word.

              The accessible name carries the same fact in words, so a
              screen reader gets from the pill what a sighted visitor
              gets from the disc. */}
          <button
            className="finm__pill"
            type="button"
            ref={pillRef}
            onClick={openSheet}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Colours — showing ${current.name}. Choose a finish`}
          >
            <span className="finm__pill-chip" aria-hidden="true">
              <img src={`/products/finish/${current.key}-chip.webp`} alt="" decoding="async" />
            </span>
            <span className="finm__pill-label">Colours</span>
          </button>
        </div>

        <div className="finm__copy" ref={copyRef}>
          {/* ⚠ `fin-title` LIVES HERE ON A PHONE. The section's
              aria-labelledby points at it and only one of the two trees
              is ever rendered, so the id is not duplicated. */}
          <h2 className="sec-title finm__title" id="fin-title">
            Choose a finish.<br /><em>Watch it settle.</em>
          </h2>

          <p className="finm__lede">
            The same profile, dressed eight ways. Anodised metals,
            powder-coated solids and wood-grain sublimation — each one a
            factory finish, not a coating applied on site.
          </p>

          {/* The same figure the desktop rule carries, boxed — at this
              width a hairline with a number on it reads as the foot of
              the section rather than as part of the offer. */}
          <div className="finm__ral">
            <p className="finm__ral-fig">100+</p>
            <p className="finm__ral-key">RAL Colours</p>
            <p className="finm__ral-sub">Across five finish families</p>
          </div>
        </div>
      </div>

      {open && createPortal(
        <div className="finm-modal">
          {/* Tapping the darkened picture closes — the standard sheet
              gesture, and the picture is the thing the visitor is
              looking at when they have finished choosing. */}
          <div className="finm-modal__scrim" ref={scrimRef} onClick={closeSheet} aria-hidden="true"></div>

          <div
            className="finm-modal__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finm-sheet-title"
            ref={sheetRef}
          >
            {/* ⚠ THE BAR CARRIES ONLY THE CLOSE BUTTON. It used to carry a
                "Colours" eyebrow as well, which the heading below now says
                — in a sentence, where it is doing work rather than
                labelling a panel the visitor just opened from a button
                marked Colours. */}
            <header className="finm-modal__bar">
              <button
                className="finm-modal__close"
                type="button"
                ref={closeRef}
                onClick={closeSheet}
                aria-label="Close colours"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 5 15 15M15 5 5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <div className="finm-modal__head">
              {/* Lead-in, offer, then what is on screen right now — the
                  third line being the one that moves. Said as prose
                  rather than as a title over a caption because the three
                  facts are one thought, and because the live half ("shown
                  in Champagne Bronze") only means anything attached to
                  the half that sets it up.

                  ⚠ THE COUNT IS COUNTED. `countWord(finishes.length)` —
                  the same helper the variants headline uses — so a ninth
                  finish added to the list does not leave the sheet
                  claiming there are eight. */}
              <h3 className="finm-modal__title" id="finm-sheet-title">
                <b>Colours.</b>{' '}
                Choose from {countWord(finishes.length).toLowerCase()} factory finishes.
              </h3>
              <p className="finm-modal__shown" aria-live="polite">
                Frame shown in <span>{current.name}</span>.
              </p>

              <div className="finm__families" role="group" aria-label="Finish family">
                {FAMILIES.map((fam) => (
                  <button
                    className={fam === current.family ? 'finm__fam is-active' : 'finm__fam'}
                    type="button"
                    key={fam}
                    aria-pressed={fam === current.family}
                    onClick={() => select(familyHead[fam])}
                  >
                    {fam}
                  </button>
                ))}
              </div>
            </div>

            {/* Only the grid scrolls, so the families stay reachable
                however far down the eight the visitor has gone. */}
            <div className="finm-modal__body">
              {swatchGrid}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
