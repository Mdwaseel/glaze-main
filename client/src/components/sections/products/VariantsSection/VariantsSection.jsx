import { Fragment, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useReducedMotion, useScrollTriggerRefresh } from '@/hooks'
import { keepMuted } from '@/utils/media'
import { setSpec } from '@/utils/glz'
import { countWord } from '@/utils/format'
import { buildVariants, initVariantsStatic } from './variantsSequence'
import './variantsSection.css'

/**
 * VariantsSection — §04 on every system page.
 *
 * NEW WORK, not a port: the originals have no variant gallery. It is built
 * out of parts that already ship on this page rather than a fresh visual
 * language — the Glass Switcher's full-bleed dark stage and floating glass
 * panel, and Home's Systems carousel's sticky-stage-over-a-tall-track
 * scroll. See the header of variantsSection.css for the rule-by-rule
 * provenance, and data/variants.js for where the clips come from.
 *
 * One variant fills one viewport. Its clip is the background; the glass
 * panel on the right carries the name, one sentence and four rows of
 * specification; the selector wheel in the lower left says where you are
 * and lets you jump — a segmented ring on desktop, the same numbers on a
 * flat rail on tablet and mobile, where the panel has taken the foot of
 * the screen. Reaching the section walks the variants; passing the last
 * one carries straight on into the Series grid, because the scroll is
 * never taken over — it is a sticky element over a taller track, which is
 * the same mechanism (and the same 0.85-viewports-per-item) as the Systems
 * carousel on Home.
 *
 * ⚠ RENDERS NOTHING for a system with no clips. Lift & Slide has no
 * footage yet, so its page has no §04 at all rather than an empty shell or
 * borrowed Sliding footage.
 *
 * ⚠ THE <video>s SHIP WITHOUT `src`, carrying `data-src` instead. The
 * controller arms the active clip and its two neighbours only, so Casement
 * — eleven variants — fetches three files rather than eleven. React never
 * touches `src` after mount, so the imperative assignment is safe.
 *
 * ⚠ `useScrollTriggerRefresh({ immediate: true })` is mounted here and
 * nowhere else on this page. This section injects its own track height
 * from a layout effect, which moves every trigger below it — the Series
 * accordion already refreshes for the same reason when its panel opens.
 */
/* ── THE WHEEL'S GEOMETRY ───────────────────────────────────────
   On desktop the timeline is drawn as a segmented ring — one wedge
   per variant, current one lit — rather than as numbers on a line.
   The angles are computed rather than authored because the list is
   editable: two formats and eleven formats both have to fill the
   circle, and neither is allowed to leave a hole in it.

   Every value is handed to CSS as a custom property on the button, so
   the STYLESHEET decides whether to use it. Tablet and mobile keep the
   flat rail — the glass panel has moved to the foot of the screen
   there and a 200px wheel has nowhere to sit — and simply ignore
   every number below.

     --vrt-hit    the button's hit area — face and arc together
     --vrt-seg    the frosted face of the wedge
     --vrt-arc    the detached band outside it that lights up
     --vrt-nx/ny  where the still sits inside that wedge
     --vrt-ox/oy  the unit vector the wedge pushes out along when it
                  is current, hovered or focused
     --vrt-icon   how big that still may be — one value for the whole
                  wheel, so it goes on the <nav> rather than the button

   ⚠ PERCENTAGES, NOT PIXELS, throughout. The button is a square the
   size of the wheel, so a polygon written in % survives every step of
   the --vrt-wheel clamp() — and the resize that crosses it — without
   anything being recomputed in JS.

   ⚠ THE CLIP-PATH IS ALSO THE HIT AREA. The buttons all sit at
   `inset: 0` on top of one another; what makes them separately
   clickable is that clip-path takes pointer events with it. Remove
   the clip and every wedge but the last becomes unreachable.

   ⚠ THREE POLYGONS, NOT ONE, AND THAT IS WHAT KEEPS THE GLASS OFF THE
   ARC. The face is frosted — it carries a backdrop-filter — and the
   filter is confined by the clip of the element that declares it. With
   one polygon spanning face AND arc, the ring of open ground between
   the two would have been blurred as well, which read as a smeared
   halo rather than as a gap. So the face and the arc are separate
   elements with separate clips, and only the face is glass. */
const WHEEL_HOLE = 0.4 /* inner radius, as a fraction of the outer */
const WHEEL_FACE = 0.88 /* outer edge of the frosted face */
const WHEEL_ARC_IN = 0.925 /* the detached outer band */
const WHEEL_ARC_OUT = 0.995
const WHEEL_MID = (WHEEL_HOLE + WHEEL_FACE) / 2 /* where the still centres */
const WHEEL_GAP = 2.6 /* degrees of ground showing between two wedges */
const WHEEL_STEP = 4 /* degrees per straight edge along an arc */
/* ⚠ 0.80, NOT 0.86. The remaining fifth is not decoration — it is the
   margin the current wedge's 2px lit ring lives in, and at eleven
   variants that margin is only about five pixels. Raise this and the
   ring starts being sliced off by the wedge's own clip-path. */
const WHEEL_ICON = 0.8 /* share of the room a wedge has that the still takes */

/** A point on the wheel, in % of the button box. 0° is 3 o'clock. */
function wheelPoint(deg, r) {
  const a = (deg * Math.PI) / 180
  return [50 + Math.cos(a) * r * 50, 50 + Math.sin(a) * r * 50]
}

function wheelPct(deg, r) {
  const p = wheelPoint(deg, r)
  return `${p[0].toFixed(2)}% ${p[1].toFixed(2)}%`
}

/** An annular sector as a clip-path polygon: out along the far arc,
    back along the near one.

    ⚠ THE STEP COUNT IS PER DEGREE, NOT PER SECTOR. A fixed count was
    tried and it is wrong at both ends of the range: nine chords across
    a 33° slice (eleven variants) are invisible, but nine across a 180°
    slice (two variants) cut the arc in by ~1.5% of the radius and
    sliced the hairline off the wedge's own edge. Sampling every 4°
    makes every wheel in the catalogue equally round. */
function wheelSector(a0, a1, rOut, rIn) {
  const steps = Math.max(4, Math.ceil((a1 - a0) / WHEEL_STEP))
  const pts = []
  for (let s = 0; s <= steps; s++) pts.push(wheelPct(a0 + ((a1 - a0) * s) / steps, rOut))
  for (let s = steps; s >= 0; s--) pts.push(wheelPct(a0 + ((a1 - a0) * s) / steps, rIn))
  return `polygon(${pts.join(', ')})`
}

/**
 * How big the still in each wedge may be — the radius of the largest
 * circle that fits in one sector, less a margin.
 *
 * TWO THINGS CAN BE THE BINDING CONSTRAINT and which one it is depends
 * on the count. A wheel of two has enormous sectors and is limited by
 * how THICK the ring is; a wheel of eleven is limited by how NARROW
 * each slice gets. Taking the smaller of the two is what lets Sliding
 * (six) and Casement (eleven) use the same stylesheet and both look
 * deliberate — six stills at 58px, eleven at 44px, neither cropped by
 * the wedge it sits in.
 *
 * ⚠ THE RETURNED VALUE IS A DIAMETER IN % OF THE WHEEL BOX, which is
 * why the two terms look mismatched and are not: the box is two radii
 * wide, so a length written as a fraction of the box is the same
 * number as that length's radius written in radius units.
 */
function wheelIcon(n) {
  const half = Math.min(Math.PI, (2 * Math.PI) / n) / 2
  const radial = (WHEEL_FACE - WHEEL_HOLE) / 2 /* the ring's thickness */
  const chord = WHEEL_MID * Math.sin(half) /* the slice's width */
  return `${(Math.min(radial, chord) * WHEEL_ICON * 100).toFixed(2)}%`
}

/** One variant's slot: the shapes it owns, and where its still and its
    push-out direction fall inside them. Slot 0 starts at twelve
    o'clock and the set runs clockwise, so the rail reads in the same
    direction the scroll walks it. */
function wheelSlot(i, n) {
  const span = 360 / n
  /* The gap is capped as a share of the slice so that two variants —
     180° each — do not end up with the same hairline of ground between
     them that eleven do, and so a very long list never gaps away more
     than it draws. */
  const gap = Math.min(WHEEL_GAP, span * 0.16)
  const a0 = -90 + i * span + gap / 2
  const a1 = -90 + (i + 1) * span - gap / 2
  const mid = (a0 + a1) / 2

  const num = wheelPoint(mid, WHEEL_MID)
  const rad = (mid * Math.PI) / 180
  return {
    '--vrt-hit': wheelSector(a0, a1, 1, WHEEL_HOLE),
    '--vrt-seg': wheelSector(a0, a1, WHEEL_FACE, WHEEL_HOLE),
    '--vrt-arc': wheelSector(a0, a1, WHEEL_ARC_OUT, WHEEL_ARC_IN),
    '--vrt-nx': `${num[0].toFixed(2)}%`,
    '--vrt-ny': `${num[1].toFixed(2)}%`,
    '--vrt-ox': Math.cos(rad).toFixed(3),
    '--vrt-oy': Math.sin(rad).toFixed(3),
  }
}

export default function VariantsSection({ system }) {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const mediaRef = useRef(null)
  const fillRef = useRef(null)
  const cardRef = useRef(null)

  const reduceMotion = useReducedMotion()

  /* ⚠ THE LIST COMES OFF THE SYSTEM RECORD, not from a module. This is the
     section the brief is really about: a variant added in the admin panel
     lands here — clip, panel, spec rows and its place on the rail — with
     nothing rebuilt. Adding one used to mean editing data/variants.js,
     re-encoding a clip by hand and deploying. */
  const variants = system.variants || []
  const n = variants.length

  /* Rebuilds the controller when the SET changes, not on every render — the
     same reasoning as the carousel on Home: this is an imperative scroll
     controller that captured its layers, panels and rail items when it ran,
     and the provider swaps the shipped catalogue for the live one mid-session
     if the two differ. `system.slug` alone would not catch a variant being
     added to the system already on screen. */
  const signature = `${system.slug}:${variants.map((v) => v.id).join(',')}`

  useScrollTriggerRefresh({ immediate: true })

  useGSAP(
    () => {
      const section = sectionRef.current
      const scrollEl = scrollRef.current
      const media = mediaRef.current
      if (!section || !scrollEl || !media || !n) return

      const layers = [].slice.call(media.querySelectorAll('.vrt__layer'))
      const videos = layers.map((l) => l.querySelector('video'))
      const panels = [].slice.call(section.querySelectorAll('.vrt__panel'))
      const railItems = [].slice.call(section.querySelectorAll('.vrt__rail-item'))
      const refs = {
        media,
        layers,
        videos,
        panels,
        railItems,
        fill: fillRef.current,
        card: cardRef.current,
      }

      // Reduced motion, or a single variant: nothing to scroll through, so
      // nothing is pinned. Same layout, same panel — only the storytelling
      // scroll is withdrawn.
      if (reduceMotion || n === 1) {
        return initVariantsStatic(section, refs, reduceMotion)
      }

      return buildVariants(section, scrollEl, refs)
    },
    { scope: sectionRef, dependencies: [signature] }
  )

  if (!n) return null

  return (
    <section
      className={n === 1 ? 'vrt vrt--single' : 'vrt'}
      id="sys-variants"
      aria-labelledby="vrt-title"
      ref={sectionRef}
    >
      <div className="vrt__scroll" ref={scrollRef}>
        <div className="vrt__stage">

          {/* The clips — all stacked, one visible. `src` is assigned by
              the controller; see the note in the component header. */}
          <div className="vrt__media" ref={mediaRef} aria-hidden="true">
            {variants.map((v) => (
              <div className="vrt__layer" key={v.id}>
                <video
                  data-src={v.video}
                  poster={v.poster}
                  muted
                  ref={keepMuted}
                  loop
                  playsInline
                  preload="none"
                  tabIndex={-1}
                ></video>
              </div>
            ))}
          </div>

          <div className="vrt__veil" aria-hidden="true"></div>

          <div className="vrt__inner">
            <header className="vrt__head">
              <p className="eyebrow">The Variants</p>
              <h2 className="vrt__title" id="vrt-title" data-curtain>
                {/* The break is authored, as it is on Home's "Six
                    systems. / One philosophy." — left to wrap, a long
                    count ("Eleven formats.") strands "One" at the end of
                    the first line and pushes "system." onto a third. */}
                {n === 1 ? (
                  <>The {system.name}<br /><em>format.</em></>
                ) : (
                  <>{countWord(n)} formats.<br /><em>One system.</em></>
                )}
              </h2>
              <p className="vrt__lede" data-reveal>
                Every format this system is built in, one at a time.
                {n > 1 ? ' Scroll to walk the range.' : ''}
              </p>
            </header>

            {/* The timeline — a selector wheel, in the section's own
                materials. A <nav> of buttons rather than a card grid,
                for the reason it always was: the picture is already on
                screen behind it. Numbers carry the sequence; the name
                and the counter belong to whichever wedge is current or
                hovered, so eleven variants put eleven NUMBERS at the
                foot of the frame rather than eleven strings of type.

                The hub carries the current number and nothing else. It
                used to carry the count under it as well — "05 over 06"
                — and that was one figure too many: the wheel is already
                a picture of how many there are, drawn at 254px.

                ⚠ THE NUMERAL AND THE STILL BOTH SHIP, and exactly one
                of them is ever drawn. The wheel shows the still — a
                picture of the format is worth more than its position in
                a list, which is what the number was standing in for.
                The flat rail on tablet and mobile shows the number: it
                is a 1.2rem-tall line at the very foot of the frame with
                the glass panel directly above it, and a row of round
                photographs there is a second gallery competing with the
                one already on screen.

                ⚠ THE STILL IS THE CLIP'S OWN POSTER — `v.poster`, the
                only image field every variant is guaranteed to have
                from BOTH sources (the shipped module and the admin
                API). It is a 1600px first frame being drawn at ~50px,
                so it is marked lazy and low priority: nothing is
                fetched for a visitor who never scrolls this far, and
                nothing here competes with the clip itself. If the
                eleven-variant page ever needs the bytes back, the fix
                is a real thumbnail field on the variant record — not a
                path derived from this one, which would not survive an
                admin-uploaded poster.

                ⚠ THE READOUT IS A SIBLING OF ITS BUTTON, NOT A CHILD,
                and the adjacent-sibling selectors in the stylesheet are
                why. The wedge pushes outward along its own radius when
                it lights up; the name above the wheel and the counter
                in its hub have to stay exactly where they are while it
                does. Inside the button they would have travelled with
                it, and with each of the eleven going a different
                direction the label would have jittered around the
                circle on every scroll step. */}
            <nav
              className="vrt__rail"
              aria-label={`${system.name} variants`}
              style={{ '--vrt-icon': wheelIcon(n) }}
            >
              <span className="vrt__rail-line" aria-hidden="true"></span>
              {variants.map((v, i) => (
                <Fragment key={v.id}>
                  <button
                    className={i === 0 ? 'vrt__rail-item is-current' : 'vrt__rail-item'}
                    type="button"
                    style={wheelSlot(i, n)}
                    aria-label={v.name}
                    aria-current={i === 0 ? 'true' : undefined}
                  >
                    <span className="vrt__rail-glass" aria-hidden="true"></span>
                    <span className="vrt__rail-arc" aria-hidden="true"></span>
                    {v.poster ? (
                      <span className="vrt__rail-icon" aria-hidden="true">
                        <img src={v.poster} alt="" loading="lazy" decoding="async" fetchPriority="low" />
                      </span>
                    ) : null}
                    <span className="vrt__rail-num" aria-hidden="true">{v.num}</span>
                  </button>
                  <span className="vrt__rail-read" aria-hidden="true">
                    <span className="vrt__rail-name">{v.name}</span>
                    <span className="vrt__rail-count">{v.num}</span>
                  </span>
                </Fragment>
              ))}
            </nav>
          </div>

          {/* ONE glass card, N contents stacked inside it — see the note
              in the stylesheet for why the chrome is not per variant.
              `aria-live` announces the swap for a screen reader driving
              the page by scroll rather than by the rail. */}
          <div className="vrt__panels" aria-live="polite" ref={cardRef}>
            <div className="vrt__panels-in">
            {variants.map((v) => (
              <article
                className={v.index === 0 ? 'vrt__panel is-active' : 'vrt__panel'}
                key={v.id}
                aria-label={v.name}
              >
                {/* The system's own name is the page's H1 and the section
                    heading above this card. Repeating it inside a 380px
                    panel spent a line of the frame on something the
                    visitor already knows, so the eyebrow carries the
                    format's kind and its place in the set, nothing else. */}
                <p className="vrt__eyebrow" data-vrt-line>
                  <span>{v.kind}</span>
                
                </p>

                <h3 className="vrt__name" data-vrt-line>{v.name}</h3>
                <p className="vrt__desc" data-vrt-line>{v.lede}</p>

                {/* Each row is its own animated line, so the four figures
                    arrive in sequence rather than as one block. */}
                <div className="vrt__specs">
                  {v.specs.map((s) => (
                    <div className="vrt__spec" key={s.k} data-vrt-line>
                      <span className="vrt__spec-key">{s.k}</span>
                      <span className="vrt__spec-val">{s.v}</span>
                    </div>
                  ))}
                </div>

                {/*
                  ⚠ `onPointerDown`, NOT `onClick`, and that is not a style
                  choice. useProductsScrollBridge listens for clicks in the
                  CAPTURE phase at `document` and calls stopPropagation() on
                  every `a[href^="#"]` so the shared offsetless handler in
                  useLenis cannot also fire — which means the event never
                  reaches this anchor and a React onClick here would never
                  run. pointerdown is not intercepted. The keydown pair
                  covers Enter and Space, which fire no pointer event at all.

                  What it writes is `spec.variant`: the one slot in the
                  five-layer attribution store (utils/glz.js) that has
                  existed since the port and that nothing has ever filled.
                */}
                <a
                  className="vrt__cta"
                  href="#contact"
                  data-vrt-line
                  onPointerDown={() => setSpec('variant', v.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSpec('variant', v.name)
                  }}
                >
                  <span className="vrt__cta-label">Enquire with this variant</span>
                  <span className="vrt__cta-arrow" aria-hidden="true">&rarr;</span>
                </a>
              </article>
            ))}
            </div>
          </div>

          <div className="vrt__progress" aria-hidden="true">
            <div className="vrt__progress-fill" ref={fillRef}></div>
          </div>

        </div>
      </div>
    </section>
  )
}

/* The headline counts in words — countWord() in utils/format.js, shared with
   the systems carousel, which counts an editable list for the same reason. */
