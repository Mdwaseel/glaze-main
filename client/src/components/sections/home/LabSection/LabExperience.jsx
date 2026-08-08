import { useCallback, useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap, ScrollTrigger } from '@/utils/gsap'
import { useReducedMotion } from '@/hooks'
import { keepMuted } from '@/utils/media'
import { LAB_ICONS } from './labIcons'
import './labExperience.css'

/**
 * The Performance Lab — five filmed tests, one screen, scrolled through.
 *
 * The masthead and the running test's number and name sit on the left,
 * the film is large on the right, and a control bar underneath says how
 * many tests there are and which one is playing. Scrolling walks the five
 * in order and then releases the page; the bar, the two arrows and the
 * arrow keys jump straight to any test without scrolling past the others.
 *
 * ⚠ THE SCROLL IS A CSS TRACK AND A STICKY CHILD, NOT ScrollTrigger's
 * `pin`. This mattered enough to be worth the rewrite. `pin: true` with
 * an `end: '+=' + n * window.innerHeight` computes the travel ONCE and
 * recomputes it on every ScrollTrigger.refresh() — and a refresh is fired
 * by a lazy image landing above this section, by a font swapping, by a
 * resize, and on a phone every single time the address bar slides away.
 * Each of those moves the start/end under a visitor who is already inside
 * the range, and a shift of one segment drops them out the bottom: the
 * reported symptom was reaching test 02 and being thrown into the next
 * section with 03, 04 and 05 unreachable.
 *
 * A `height: calc(100svh + var(--labd-travel))` track with a
 * `position: sticky` child cannot drift, because the browser recomputes
 * it from the same units on every frame and nothing has to agree with
 * anything. It also injects no pin-spacer, so React is never asked to
 * insert a node next to an element ScrollTrigger has re-parented — the
 * crash this component hit when it swapped trees at a breakpoint. The
 * ScrollTrigger left here only reads progress; it moves nothing.
 *
 * `svh` throughout, not `vh`: on a phone `vh` is the height with the
 * browser chrome RETRACTED, so a 100vh sticky frame is taller than the
 * screen for as long as the address bar shows — which is exactly when a
 * visitor first meets the section.
 *
 * WHAT CAME ACROSS FROM THE ORIGINAL 560vh MACHINE: the five tests, the
 * five films, muted-autoplay handling, play-only-what-is-on-screen, and
 * the reduced-motion path. What did not: the giant instrument dial, the
 * orbital gauge, the character cascade, and five screens of empty scroll
 * between the things worth looking at.
 *
 * ⚠ THE INTRO, THE PER-TEST DESCRIPTION AND THE MEASURED RESULT ARE NOT
 * RENDERED. Four blocks were cut on request — the two intro paragraphs,
 * the test's explanatory paragraph, and the status/figure/metric readout.
 * LAB_PANELS still carries `copy`, `status`, `value`, `unit` and `metric`
 * so nothing is lost from the data if they are ever wanted back.
 *
 * ⚠ THIS COMPONENT DOES NOT RENDER THE <section>. LabSection owns it.
 */

const EASE = 'power2.out'
const SWAP = 0.72 /* seconds — slow and cinematic, not snappy */

/**
 * Below this the viewport is too short to hold a full-screen frame —
 * landscape phones, mostly. The track collapses (see labExperience.css)
 * and the section becomes an ordinary block driven only by its controls.
 * ⚠ The same number is written in the stylesheet; they move together.
 */
const MIN_HELD_HEIGHT = '(min-height: 560px)'

export default function LabExperience({ tests }) {
  const trackRef = useRef(null)
  const rootRef = useRef(null)
  const filmsRef = useRef([])
  const readRef = useRef(null)
  const tabsRef = useRef(null)
  /* The scroll driver, kept so the controls can convert a test index back
     into a scroll position. Null when the track is collapsed. */
  const scrollRef = useRef(null)

  const reduceMotion = useReducedMotion()

  const [active, setActive] = useState(0)
  /* Which way the visitor moved. Only used to lean the incoming copy in
     from the side it came from, so Back does not feel like Next. */
  const dirRef = useRef(1)
  /* The index the DOM is currently *showing*, which is behind `active`
     for the length of the crossfade. */
  const shownRef = useRef(-1)
  const [inView, setInView] = useState(false)

  const test = tests[active]

  /** Move to a test. No scrolling — this is what the scroll drives. */
  const select = useCallback((next, dir) => {
    setActive((prev) => {
      if (next === prev) return prev
      dirRef.current = dir || (next > prev ? 1 : -1)
      return next
    })
  }, [])

  /**
   * What a control does. While the frame is held, the tests live at
   * scroll positions rather than in state, so a control has to move the
   * scroll and let the driver's own onUpdate do the selecting — otherwise
   * state and scroll disagree and the next wheel tick snaps back.
   */
  const go = useCallback(
    (next) => {
      const i = ((next % tests.length) + tests.length) % tests.length
      const st = scrollRef.current
      if (!st) {
        select(i)
        return
      }
      /* Middle of the target's segment, so a rounding error at a seam
         cannot land on its neighbour. */
      const y = st.start + ((i + 0.5) / tests.length) * (st.end - st.start)

      /* ⚠ INSTANT, NOT SMOOTHED, AND THAT IS THE POINT. The frame is
         sticky, so moving the scroll inside the track moves nothing on
         screen — the jump is invisible and all the visitor sees is the
         film crossfading to the test they asked for. Easing there instead
         would fire onUpdate the whole way and flick through every film in
         between. */
      const lenis = window.__glazeLenis
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true })
      else window.scrollTo(0, y)
    },
    [tests.length, select]
  )

  const step = useCallback((by) => go(active + by), [go, active])

  /* ── Play only the running test, and only while the lab is on screen ── */
  useEffect(() => {
    const el = rootRef.current
    if (!el || !('IntersectionObserver' in window)) {
      setInView(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0].isIntersecting),
      { threshold: 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    filmsRef.current.forEach((v, i) => {
      if (!v) return
      if (i === active && inView) {
        const pr = v.play()
        if (pr && pr.catch) pr.catch(() => {})
      } else {
        v.pause()
      }
    })
  }, [active, inView])

  /* ── The swap: film crossfades, readout re-enters ── */
  useGSAP(
    () => {
      const films = filmsRef.current
      const from = shownRef.current
      shownRef.current = active
      if (!films[active]) return

      /* First run, and every run under reduced motion — the end state,
         with no transition to get there. */
      if (from < 0 || reduceMotion) {
        films.forEach((v, i) => {
          if (v) gsap.set(v, { autoAlpha: i === active ? 1 : 0, scale: 1 })
        })
        return
      }

      const tl = gsap.timeline({ defaults: { overwrite: 'auto' } })

      if (films[from] && from !== active) {
        tl.to(films[from], { autoAlpha: 0, scale: 1.02, duration: SWAP, ease: EASE }, 0)
      }
      tl.fromTo(
        films[active],
        { autoAlpha: 0, scale: 1.02 },
        { autoAlpha: 1, scale: 1, duration: SWAP, ease: EASE },
        0
      )

      /* The readout re-enters rather than cross-fading with itself: React
         has already replaced the text by the time this runs, so there is
         no outgoing copy left to animate. A short lean-in from the
         direction of travel reads as the panel advancing. */
      const parts = readRef.current
        ? readRef.current.querySelectorAll('[data-read]')
        : []
      if (parts.length) {
        tl.fromTo(
          parts,
          { autoAlpha: 0, y: 14, x: dirRef.current * 8 },
          { autoAlpha: 1, y: 0, x: 0, duration: 0.55, stagger: 0.055, ease: 'power3.out' },
          0.1
        )
      }
    },
    { scope: rootRef, dependencies: [active, reduceMotion] }
  )

  /* ── Entrance, and the scroll driver ── */
  useGSAP(
    () => {
      if (reduceMotion) return undefined

      gsap.from(rootRef.current.querySelectorAll('[data-enter]'), {
        y: 26,
        autoAlpha: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: trackRef.current, start: 'top 70%', once: true },
      })

      /* ⚠ matchMedia, so the driver exists only where the track does.
         Under 560px tall the stylesheet collapses the track to `height:
         auto` and unsticks the frame; a ScrollTrigger over a track with
         no travel would divide a zero range and report progress 1 the
         moment the section appeared, jumping straight to test 05.
         gsap.matchMedia kills and rebuilds it across that line, and
         `scrollRef` going null is what tells `go` to select directly
         instead of scrolling. */
      const mm = gsap.matchMedia()
      mm.add(MIN_HELD_HEIGHT, () => {
        const st = ScrollTrigger.create({
          trigger: trackRef.current,
          /* Both ends read off the track's own box. Nothing here is a
             computed pixel length, so a refresh cannot move them
             relative to the content they describe. */
          start: 'top top',
          end: 'bottom bottom',
          onUpdate(self) {
            const i = Math.max(
              0,
              Math.min(tests.length - 1, Math.floor(self.progress * tests.length))
            )
            select(i, self.direction >= 0 ? 1 : -1)
          },
        })
        scrollRef.current = st
        return () => {
          scrollRef.current = null
        }
      })

      return () => mm.revert()
    },
    { scope: rootRef, dependencies: [reduceMotion, tests.length, select] }
  )

  /* Arrow keys across the bar, as a grouped control should behave. */
  function onTabsKeyDown(e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = (active + (e.key === 'ArrowRight' ? 1 : -1) + tests.length) % tests.length
    go(next)
    const btns = tabsRef.current.querySelectorAll('.labd__tab')
    if (btns[next]) btns[next].focus()
  }

  return (
    <div className="labd__track" ref={trackRef}>
      <div className="labd__sticky">
        <div className="labd__inner" ref={rootRef}>
          <div className="labd__grid">

            {/* ── The masthead, then whichever test is running ── */}
            <div className="labd__col">
              <h2 id="lab-title" className="labd__title" data-enter>
                The Performance <em>Lab.</em>
              </h2>
              <span className="labd__rule" data-enter aria-hidden="true"></span>

              {/* ⚠ aria-live, because this text changes under a control
                  that is somewhere else on the page — and, while the frame
                  is held, under no control at all but the scroll. Without
                  it a screen-reader user presses 03 and hears nothing
                  move. `polite` — the change is theirs, so it can wait. */}
              <div className="labd__read" ref={readRef} data-enter aria-live="polite">
                <p className="labd__count" data-read>
                  <span className="labd__count-n">{test.num}</span>
                  <span className="labd__count-of">/ {String(tests.length).padStart(2, '0')}</span>
                </p>
                <h3 className="labd__name" data-read>{test.title}</h3>
              </div>
            </div>

            {/* ── The film, at the size it deserves ── */}
            <figure className="labd__stage" data-enter>
              {tests.map((t, i) => (
                <video
                  key={t.num}
                  className="labd__film"
                  src={t.video}
                  muted
                  ref={(el) => {
                    filmsRef.current[i] = el
                    keepMuted(el)
                  }}
                  loop
                  playsInline
                  preload={i === 0 ? 'metadata' : 'none'}
                  aria-hidden={i !== active}
                />
              ))}
              <span className="labd__glaze" aria-hidden="true"></span>

              <figcaption className="labd__tag">
                <span className="labd__tag-dot" aria-hidden="true"></span>
                {`Test ${test.num} — ${test.title}`}
              </figcaption>

              <button
                type="button"
                className="labd__advance"
                onClick={() => step(1)}
                aria-label={`Next test: ${tests[(active + 1) % tests.length].title}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </button>
            </figure>
          </div>

          {/* ── The control panel ── */}
          <div className="labd__bar">
            <div className="labd__bar-lead">
              <p className="labd__bar-label">Tests</p>
              <span className="labd__bar-rule" aria-hidden="true"></span>
              <div className="labd__arrows">
                <button
                  type="button" className="labd__arrow"
                  onClick={() => step(-1)}
                  aria-label={`Previous test: ${tests[(active - 1 + tests.length) % tests.length].title}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5M11 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button" className="labd__arrow labd__arrow--lead"
                  onClick={() => step(1)}
                  aria-label={`Next test: ${tests[(active + 1) % tests.length].title}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className="labd__tabs"
              ref={tabsRef}
              role="group"
              aria-label="Choose a test"
              onKeyDown={onTabsKeyDown}
            >
              {tests.map((t, i) => {
                const Icon = LAB_ICONS[t.num]
                const on = i === active
                return (
                  <div className="labd__cell" key={t.num}>
                    <button
                      type="button"
                      className="labd__tab"
                      aria-current={on ? 'true' : undefined}
                      /* One stop in the tab order for the whole group — the
                         arrow keys move within it, which is what a roving
                         tabindex is for. */
                      tabIndex={on ? 0 : -1}
                      onClick={() => go(i)}
                    >
                      <span className="labd__tab-num">{t.num}</span>
                      <span className="labd__tab-icon"><Icon /></span>
                      {/* ⚠ The name is hidden below 720px, not removed —
                          five names do not fit across a phone, and the
                          running test's full title is already set large
                          in the readout above. It stays in the DOM so the
                          button keeps its accessible name. */}
                      <span className="labd__tab-name">{t.short}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
