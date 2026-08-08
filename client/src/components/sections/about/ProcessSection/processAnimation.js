import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §02b Process — the pinned six-slide curtain deck.
 *
 * Verbatim port of <script id="about-process-script"> in about.html
 * (lines 5472-5593).
 *
 * At ≥861px the controller clones the six in-flow steps into a sticky
 * stage, turns `.proc__run` into a tall scroll track and scrubs each
 * slide up over the previous one as a single clip-path curtain —
 * photograph and text panel share the clip, so they can never drift out
 * of sync. Below 861px, with reduced motion, the default CSS IS the
 * finished static brochure spread, so the whole controller is a no-op.
 *
 * NOT reusing Home's ProcessSection animation or any of its hooks: that
 * section is a centred timeline with a gooey watermark and per-step
 * ignition triggers. The two share four class NAMES and nothing else —
 * see the scoping note at the top of processSection.css. The only shared
 * imports are utils/gsap (single registerPlugin point) and
 * prefersReducedMotion, exactly as the Origin port uses them.
 *
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * process script registers no load refresh.
 *
 * Every numeric constant below is copied from the original.
 */

/* ── PACING ─────────────────────────────────────────
   STEP_VH — extra viewport-heights of scroll each slide
   transition owns. 6 slides → track = 100 + 5×STEP_VH vh. */
const STEP_VH = 90

/* A thumb covers less ground per gesture than a wheel does, so the same
   six wipes are given proportionally less scroll on a phone. */
const STEP_VH_MOBILE = 68

/**
 * Under this the viewport cannot hold a slide — a photograph, a heading,
 * a lede, a paragraph and a CTA do not fit in a landscape phone's ~390px
 * however far the type is compressed. There the static six-step spread
 * stays, which is the authored brochure layout and needs no help.
 * ⚠ The same number is written in processSection.css.
 */
const MIN_HELD_HEIGHT = 560

/**
 * @param {HTMLElement} section  #about-process
 * @param {HTMLElement} runEl    .proc__run
 * @param {() => void} [onCtaClick]  router push for the cloned CTAs
 * @returns {(() => void) | undefined} cleanup
 */
export function buildProcessStage(section, runEl, onCtaClick) {
  if (!section) return
  const run = runEl || section.querySelector('.proc__run')
  const steps = [].slice.call(section.querySelectorAll('.proc__step'))
  if (!run || steps.length < 2) return

  if (prefersReducedMotion()) return
  // (static spread stays: all six steps laid out plainly)

  // ⚠ The caller MUST invoke this from a LAYOUT effect. In about.html
  // this script runs at parse time — the stage exists, the in-flow steps
  // are hidden and the track height is set before the browser ever paints
  // the section. From a passive effect React would paint the six
  // full-height in-flow steps first and only then swap in the pinned
  // deck, a visible flash of a layout the original never shows. Same
  // reasoning as the Phase 14 fix to useAboutWordReveal.

  // ── The stage: six complete slides (photograph left, panel
  // right) cloned from the in-flow steps, so the static markup
  // stays the single source of truth for images, copy and alt
  // text. The clones drop the base-script reveal primitives —
  // the curtain wipe IS their reveal.
  let stage = null
  let slides = []
  function buildStage() {
    if (stage) return
    stage = document.createElement('div')
    stage.className = 'proc__stage'
    slides = steps.map(function (step) {
      const slide = document.createElement('div')
      slide.className = 'proc__slide'
      const media = document.createElement('div')
      media.className = 'proc__slide-media'
      const img = step.querySelector('.proc__media img')
      if (img) media.appendChild(img.cloneNode(false))
      slide.appendChild(media)
      const panel = step.querySelector('.proc__panel')
      if (panel) {
        const clone = panel.cloneNode(true)
        ;[].forEach.call(
          clone.querySelectorAll('.fade-up, .wipe-in'),
          function (el) {
            el.classList.remove('fade-up', 'wipe-in', 'is-revealed')
          }
        )
        slide.appendChild(clone)
      }
      stage.appendChild(slide)
      return slide
    })
    run.insertBefore(stage, run.firstChild)
  }

  // ── React-only: the cloned CTAs are plain <a> elements, not the
  // router's <Link>. In animated mode the in-flow steps are
  // display:none, so EVERY visible "Plan your project" link is a
  // clone — without this the section would hard-reload the document
  // on desktop while the same link client-navigates on mobile. The
  // static page had no router, so there is nothing to port here; this
  // only restores the SPA behaviour the rest of the site has.
  //
  // The callback carries the destination rather than this handler reading
  // it back off the clone: the rendered href is already basename-prefixed
  // (`/react-preview/contact#enquiry` in the parity build), and feeding
  // that to navigate() would prefix it a second time.
  function onStageClick(e) {
    if (!onCtaClick) return
    if (e.defaultPrevented || e.button !== 0) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const link = e.target.closest ? e.target.closest('a.proc__cta') : null
    if (!link || !stage || !stage.contains(link)) return
    if (link.target && link.target !== '_self') return
    e.preventDefault()
    onCtaClick()
  }

  // ⚠ THE DECK RUNS ON PHONES NOW TOO. It used to be desktop-only, so a
  // phone got the six full-height steps as a plain ~4,700px spread and
  // none of the curtain the section is built around. The mechanism ports
  // across unchanged — it was already CSS `position: sticky` over a tall
  // track rather than a GSAP pin, which is exactly what a phone wants:
  // no pin-spacer, no pixel travel to drift when the address bar moves.
  // Only the slide's own layout differs, and that is CSS (see the
  // ≤860px block in processSection.css).
  //
  // The height condition is the real gate: a landscape phone cannot hold
  // a slide, so it keeps the static spread.
  //
  // gsap.matchMedia reverts every tween, trigger and inline style it
  // created when the query stops matching.
  const mm = gsap.matchMedia()
  mm.add(
    {
      isWide: '(min-width: 861px)',
      isPhone: `(max-width: 860px) and (min-height: ${MIN_HELD_HEIGHT}px)`,
    },
    function (ctx) {
      // Neither matches: too short to hold. Nothing is built, and the
      // authored static spread is what the visitor reads.
      if (!ctx.conditions.isWide && !ctx.conditions.isPhone) return undefined

      buildStage()
      section.classList.add('proc--anim')
      const stepVh = ctx.conditions.isWide ? STEP_VH : STEP_VH_MOBILE
      // ⚠ svh on the phone branch. `vh` is the height with the browser
      // chrome RETRACTED, so a track measured in vh is longer than the
      // number of screens it is meant to be for as long as the address
      // bar is showing — the last slide would still be arriving when the
      // sticky stage has already begun to scroll away.
      const unit = ctx.conditions.isWide ? 'vh' : 'svh'
      run.style.height = 100 + (slides.length - 1) * stepVh + unit

      // ── One scrubbed timeline across the whole track. Each
      // unit of it: a dwell on the settled slide, then the next
      // slide — photograph and text panel together — wipes up
      // over it (clip-path inset 100% → 0%, curtain-style), with
      // a slight settle on the incoming photograph. Image and
      // text can never drift out of sync: they share the clip.
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: run,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      slides.forEach(function (slide, k) {
        if (!k) return
        const img = slide.querySelector('.proc__slide-media img')
        const at = k - 1 + 0.35 // 0.35 dwell, 0.65 wipe per unit
        tl.fromTo(
          slide,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65 },
          at
        )
        if (img) {
          tl.fromTo(
            img,
            { yPercent: 7, scale: 1.06 },
            { yPercent: 0, scale: 1, duration: 0.65 },
            at
          )
        }
        // the slide beneath falls into shade as it is covered
        tl.fromTo(
          slides[k - 1],
          { '--veil': 0 },
          { '--veil': 0.16, duration: 0.65 },
          at
        )
      })

      // Rest on the final slide before the pin releases.
      tl.to({}, { duration: 0.4 }, '>')

      return function () {
        section.classList.remove('proc--anim')
        run.style.height = ''
      }
    }
  )

  run.addEventListener('click', onStageClick)

  // ── React-only teardown. The original never removes the stage —
  // about.html simply ends. Here the stage is appended INTO
  // React-owned DOM, so without this every remount (StrictMode in
  // dev, every return to /about in production) would append another
  // six slides and leave the previous timeline scrubbing a detached
  // tree. mm.revert() first: it runs the matchMedia cleanup above,
  // kills the timeline and its ScrollTrigger, and reverts the inline
  // styles gsap wrote onto the slides — all of which must happen
  // while the slides are still in the document.
  return function cleanup() {
    run.removeEventListener('click', onStageClick)
    mm.revert()
    if (stage && stage.parentNode) stage.parentNode.removeChild(stage)
    stage = null
    slides = []
  }
}

export default buildProcessStage
