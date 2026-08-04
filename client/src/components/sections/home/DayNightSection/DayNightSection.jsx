import { useMemo, useRef } from 'react'
import { useMediaQuery, useScrollSequence } from '@/hooks'
import { MOBILE_SEQUENCE_QUERY } from '../HeroSection/heroSequence'
import {
  DAYNIGHT_SEQUENCE,
  DAYNIGHT_SEQUENCE_MOBILE,
  REDUCED_MOTION_PROGRESS,
  createDayNightProgressHandler,
} from './dayNightSequence'
// Section CSS first, then the shared sequence sheet — same ordering rule
// as HeroSection. See the note in useScrollSequence.
import './dayNightSection.css'
import '@/styles/sequence.css'

/**
 * DayNightSection — port of hero.html lines 1555-1582.
 *
 * Pinned section; the WebP sequence in frames/daynight scrubs a window
 * from dawn through to night as you scroll.
 *
 * Unlike the hero there is no separate wrapper element: the <section>
 * itself carries .seq-scroll and the inner .daynight__pin carries
 * .seq-pin, so scrollRef points at the section.
 *
 * This is the second consumer of useScrollSequence and adds no sequence
 * code of its own — only the config and the phase indicator in
 * dayNightSequence.js. Both sequences share the single rAF ticker in
 * utils/scroll.js, exactly as the original's one loop drove both.
 */
export default function DayNightSection() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const timeRef = useRef(null)
  const phaseRef = useRef(null)
  const fillRef = useRef(null)

  const applyPhase = useMemo(
    () => createDayNightProgressHandler(fillRef, phaseRef, timeRef),
    []
  )

  /* Same portrait swap as the hero, off the same media query so the two
     sequences can never disagree about what a phone is. */
  const portrait = useMediaQuery(MOBILE_SEQUENCE_QUERY)

  useScrollSequence({
    canvasRef,
    scrollRef: sectionRef,
    ...(portrait ? DAYNIGHT_SEQUENCE_MOBILE : DAYNIGHT_SEQUENCE),
    onProgress: applyPhase,
    // Original: dn.setStatic(...); applyPhase(0.55);
    onReducedMotion: () => applyPhase(REDUCED_MOTION_PROGRESS),
  })

  return (
    <section
      id="daynight"
      className="daynight seq-scroll"
      aria-label="From day to night"
      ref={sectionRef}
    >
      <div className="daynight__pin seq-pin">
        <canvas className="seq-canvas" id="dnCanvas" aria-hidden="true" ref={canvasRef}></canvas>
        <div className="daynight__overlay"></div>

        <div className="daynight__content">
          <div className="daynight__time" id="dnTime" aria-label="Time of day" ref={timeRef}>05<span className="daynight__time-colon">:</span>30</div>
          <div className="daynight__top">

            <h2 className="daynight__title">Beautiful in<br />every light.</h2>
            <p className="daynight__subtitle">
              From the first warmth of morning to the calm of night, Glaze
              systems hold the view unbroken — thermally sealed, whisper-quiet
              and effortlessly clear as the hours turn.
            </p>
          </div>

          <div className="daynight__bottom">
            <div className="daynight__phase-row">
              <span className="daynight__phase" id="dnPhase" ref={phaseRef}>Dawn</span>
            </div>
            <div className="daynight__progress">
              <div className="daynight__progress-fill" id="dnProgress" ref={fillRef}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
