import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useScrollTriggerRefresh } from '@/hooks'
import { buildPerformanceSequence } from './performanceSequence'
import './performanceSection.css'

/**
 * PerformanceSection — port of hero.html lines 3174-3262
 * ("Engineering Excellence").
 *
 * A scroll-scrubbed 145-frame WebP sequence (frames/layers/layer_000…144)
 * on a <canvas>, with the <img> underneath as the no-JS / not-yet-painted
 * state, plus a scroll-synced layer index and hairline meter.
 *
 * All animation lives in performanceSequence.js.
 */

/** The five layers, transcribed from the original markup. */
const ENG_STEPS = [
  { num: '01', title: 'Precision Aluminium Frame', body: 'Multi-chamber profile engineered for exceptional structural stability.' },
  { num: '02', title: 'Insulated Double Glazing', body: 'Reduces heat transfer while maximising natural light.' },
  { num: '03', title: 'Thermal Barrier', body: 'Polyamide thermal break for superior energy efficiency.' },
  { num: '04', title: 'Premium Hardware', body: 'Concealed multi-point locking for effortless, lasting operation.' },
  { num: '05', title: 'Weather Sealing', body: 'High-performance gaskets protect against wind, rain and dust.' },
]

export default function PerformanceSection() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const plateRef = useRef(null)
  const fillRef = useRef(null)

  // Original: window.addEventListener('load', ScrollTrigger.refresh)
  // at the end of #eng-script — "recompute once fonts/images/the
  // horizontal section height settle".
  useScrollTriggerRefresh()

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      const steps = [].slice.call(section.querySelectorAll('.eng__step'))
      return buildPerformanceSequence(section, {
        canvas: canvasRef.current,
        plate: plateRef.current,
        steps,
        fill: fillRef.current,
      })
    },
    { scope: sectionRef }
  )

  return (
    <section id="performance" className="eng" aria-labelledby="eng-title" ref={sectionRef}>
      <div className="eng__inner">

        {/* Heading + layer index (left) */}
        <div className="eng__head">
          <span className="eng__eyebrow">Engineering Excellence</span>
          <h2 id="eng-title" className="eng__title">Precision,<br />Layer by Layer.</h2>
          <p className="eng__intro">
            Every Glaze system is engineered as a complete assembly, where every
            layer contributes to structural strength, thermal efficiency, acoustic
            comfort and lasting performance.
          </p>

          {/* Scroll-synced layer index. Row N lights up while the render is
              in the Nth fifth of its travel; the controller only toggles
              .is-active, all the motion lives in the CSS above. */}
          <ol className="eng__steps" id="engSteps">
            {ENG_STEPS.map((step, i) => (
              <li className="eng__step" data-step={String(i)} key={step.num}>
                <span className="eng__step-num">{step.num}</span>
                <div className="eng__step-body">
                  <h3 className="eng__step-title">{step.title}</h3>
                  <div className="eng__step-more"><p>{step.body}</p></div>
                </div>
              </li>
            ))}
          </ol>

          <div className="eng__meter" aria-hidden="true">
            <span className="eng__meter-fill" id="engMeterFill" ref={fillRef}></span>
          </div>
        </div>

        {/* PRODUCT RENDER — scroll-scrubbed WebP frame sequence
            frames/layers/layer_000.webp … layer_144.webp (145)
            Source: assets-source/videos/layer by layer precision.mp4
            The frames are tone-graded to --eng-ground (#E3E2E4), which is
            what lets the render sit on the page without a visible plate —
            see the ffmpeg note in the original markup before re-exporting. */}
        <div className="eng__stage">
          <div className="eng__plate" id="engPlate" ref={plateRef}>
            {/* Frame 0 (assembled) is the static state: what no-JS, no-GSAP
                and "frames still loading" all fall back to. */}
            <img className="eng__still" id="engStill" src="/frames/layers/layer_000.webp"
                 width="1440" height="1080" decoding="async" loading="lazy"
                 alt="Cross-section of a Glaze aluminium window system — handle, gearbox, multi-chamber profile and double glazing" />
            <canvas className="eng__canvas" id="engCanvas" aria-hidden="true" ref={canvasRef}></canvas>
          </div>
        </div>

      </div>
    </section>
  )
}
