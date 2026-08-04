import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks'
import { buildProcessAnimation } from './processAnimation'
import { Link, useLocation } from 'react-router-dom'
import { resolveHref } from '@/utils/links'
import './processSection.css'

/**
 * ProcessSection — port of hero.html lines 3601-3731.
 *
 * Six steps on a centred timeline: a scrubbed spine that draws downward,
 * nodes that ignite as it reaches them, cards that slide in from their
 * own side, and a large gooey watermark word that morphs and glides to
 * the active step.
 *
 * All animation lives in processAnimation.js.
 */

/** The six steps, transcribed from the original markup. */
const PROCESS_STEPS = [
  {
    word: 'Listen',
    num: '01',
    title: 'Consultation',
    copy: 'We meet on site, in our studio or over a call to understand the space, the light and how you live in it. You leave with a realistic budget and timeline.',
  },
  {
    word: 'Measure',
    num: '02',
    title: 'Site Survey',
    copy: 'Once the structure is ready, our engineers laser-survey every opening to the millimetre, and each frame is made for the exact wall it will sit in.',
  },
  {
    word: 'Design',
    num: '03',
    title: 'Design & Drawings',
    copy: 'Working alongside your architect and designer, we turn elevations into system drawings, so sightlines, finishes and hardware are agreed before anything is made.',
  },
  {
    word: 'Make',
    num: '04',
    title: 'Fabrication',
    copy: 'Profiles are cut, machined and assembled in-house. Every unit is glazed, sealed and checked before it leaves the factory.',
  },
  {
    word: 'Fit',
    num: '05',
    title: 'Installation',
    copy: 'Our certified teams protect the site, set each frame level and true, and seal it to specification. Most installations are complete within the week.',
  },
  {
    word: 'Assure',
    num: '06',
    title: 'Handover',
    copy: 'We walk through every opening and finish together. You receive care guidance, your warranty and a single point of contact for anything that comes up later.',
  },
]

export default function ProcessSection() {
  const { pathname } = useLocation()
  const sectionRef = useRef(null)
  const stepsRef = useRef(null)
  const fillRef = useRef(null)
  const wordRef = useRef(null)

  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      /* Static fallback: default CSS is already the completed timeline
         (line drawn, nodes lit, cards visible). Nothing to do.
         (The original also took this path when GSAP failed to load from
         the CDN; it is bundled here, so only the motion check remains.) */
      if (reduceMotion) return

      return buildProcessAnimation(section, {
        stepsWrap: stepsRef.current,
        fill: fillRef.current,
        wordWrap: wordRef.current,
      })
    },
    { scope: sectionRef }
  )

  const coda = resolveHref('contact.html', pathname)

  return (
    <section id="process" className="proc" aria-labelledby="proc-title" ref={sectionRef}>
      {/* Alpha-threshold filter for the morphing step word (decor). */}
      <svg className="proc__gooey-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="procGooey">
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="1 0 0 0 0
                    0 1 0 0 0
                    0 0 1 0 0
                    0 0 0 255 -140" />
          </filter>
        </defs>
      </svg>

      <header className="proc__head">
        <h2 id="proc-title" className="proc__title">From first conversation<br /><em>to handover.</em></h2>
        <p className="proc__intro">
          Six steps take a project from the first site visit to the final
          walkthrough. This is how we work, and what to expect at each stage.
        </p>
      </header>

      <div className="proc__body">
        <div className="proc__flow">
          <div className="proc__track">

            {/* Sticky gooey watermark: names the current step, morphs on scroll */}
            <div className="proc__word-pin" aria-hidden="true">
              <div className="proc__word-hold">
                <div className="proc__word" id="procWord" ref={wordRef}>
                  <span>Listen</span>
                  <span></span>
                </div>
              </div>
            </div>

            {/* Drawn spine: faint rail + a soft-tipped fill that draws on scroll */}
            <div className="proc__spine" aria-hidden="true">
              <div className="proc__spine-fill" id="procFill" ref={fillRef}></div>
            </div>

            <ol className="proc__steps" id="procSteps" ref={stepsRef}>

              {PROCESS_STEPS.map((step) => (
                <li className="proc__step" data-word={step.word} key={step.num}>
                  <div className="proc__node"></div>
                  <article className="proc__card">
                    <div className="proc__meta"><span className="proc__num">{step.num}</span></div>
                    <h3 className="proc__step-title">{step.title}</h3>
                    <p>
                      {step.copy}
                    </p>
                  </article>
                </li>
              ))}

            </ol>
          </div>
        </div>
      </div>

      <div className="proc__coda">
        {coda.internal ? (
          <Link to={coda.to}>Begin with a conversation</Link>
        ) : (
          <a href={coda.to}>Begin with a conversation</a>
        )}
      </div>
    </section>
  )
}
