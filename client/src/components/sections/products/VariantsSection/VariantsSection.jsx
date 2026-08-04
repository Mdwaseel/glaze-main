import { useRef } from 'react'
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
 * specification; the numbered rail along the foot says where you are and
 * lets you jump. Reaching the section walks the variants; passing the last
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

            {/* The timeline. A <nav> of buttons on a hairline rather than a
                card grid — the picture is already on screen behind it.
                Numbers carry the sequence; the name belongs to whichever
                item is current or hovered, so eleven variants do not put
                eleven strings of type across the foot of the frame. */}
            <nav className="vrt__rail" aria-label={`${system.name} variants`}>
              <span className="vrt__rail-line" aria-hidden="true"></span>
              {variants.map((v, i) => (
                <button
                  className={i === 0 ? 'vrt__rail-item is-current' : 'vrt__rail-item'}
                  type="button"
                  key={v.id}
                  aria-label={v.name}
                  aria-current={i === 0 ? 'true' : undefined}
                >
                  <span className="vrt__rail-name" aria-hidden="true">{v.name}</span>
                  <span className="vrt__rail-tick" aria-hidden="true"></span>
                  <span className="vrt__rail-num" aria-hidden="true">{v.num}</span>
                </button>
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
