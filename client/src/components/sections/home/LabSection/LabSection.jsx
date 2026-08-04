import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useReducedMotion } from '@/hooks'
import { buildLabAnimation, initLabStatic } from './labAnimation'
import { keepMuted } from '@/utils/media'
import './labSection.css'

/**
 * LabSection — port of hero.html lines 2731-2902 ("The Performance Lab").
 *
 * Five filmed tests. In the animated experience a tall .lab__scroll track
 * (560vh, from CSS under .lab--anim) drives a sticky stage: one panel at a
 * time, an iris-open film reveal, a character cascade on the title, and a
 * gauge arc that fills and locks gold as each test resolves.
 *
 * All animation lives in labAnimation.js.
 */

/** The five tests, transcribed from the original markup. */
const LAB_PANELS = [
  {
    aura: 'rgba(96, 126, 160, 0.17)',
    num: '01',
    title: 'Driving rain',
    copy: 'Water is thrown at the closed sash for hours, at pressures well beyond a monsoon squall. Double gaskets and concealed drainage keep the inner face of the frame completely dry.',
    status: 'Sealed',
    value: '750',
    unit: ' Pa',
    metric: 'of driving rain held out, not a drop through',
    video: '/videos/Performance%20lab/Rain%20Test.mp4',
  },
  {
    aura: 'rgba(141, 149, 158, 0.13)',
    num: '02',
    title: 'Gale-force wind',
    copy: 'The sash is flexed under gusting loads to make sure nothing racks, whistles or works loose. Reinforced profiles hold their line on exposed and high-rise sites.',
    status: 'Held firm',
    value: '2400',
    unit: ' Pa',
    metric: 'of gusting wind load resisted without deflection',
    video: '/videos/Performance%20lab/Wind%20Test.mp4',
  },
  {
    aura: 'rgba(126, 106, 148, 0.15)',
    num: '03',
    title: 'Street noise',
    copy: 'A calibrated speaker plays traffic on one side of the glass while microphones listen on the other. Laminated acoustic panes bring the street down to a murmur.',
    status: 'Quieted',
    value: '42',
    unit: ' dB',
    metric: 'of street noise removed at the glass',
    video: '/videos/Performance%20lab/Sound%20Test.mp4',
  },
  {
    aura: 'rgba(191, 116, 66, 0.15)',
    num: '04',
    title: 'Heat and cold',
    copy: 'One face of the unit is heated while the other is chilled, and thermal cameras watch where energy tries to escape. The polyamide break keeps the indoor surface near room temperature.',
    status: 'Insulated',
    value: '1.1',
    unit: ' W/m²K',
    metric: 'whole-window U-value under thermal imaging',
    video: '/videos/Performance%20lab/thermal%20test.mp4',
  },
  {
    aura: 'rgba(170, 88, 74, 0.15)',
    num: '05',
    title: 'Break-in attempt',
    copy: 'Multi-point locks and laminated glass are worked over with the tools burglars actually carry. The sash stays shut long after the attempt has been given up.',
    status: 'Secured',
    value: '10',
    unit: ' min',
    metric: 'of tooled attack survived, sash still locked',
    video: '/videos/Performance%20lab/Security%20Test.mp4',
  },
]

export default function LabSection() {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const dialRef = useRef(null)
  const ticksRef = useRef(null)
  const gaugeRef = useRef(null)
  const meterFillRef = useRef(null)
  const panelsRef = useRef(null)

  const reduceMotion = useReducedMotion()

  useGSAP(
    () => {
      const section = sectionRef.current
      const scrollEl = scrollRef.current
      if (!section || !scrollEl) return

      const panels = [].slice.call(section.querySelectorAll('.lab__panel'))
      if (!panels.length) return
      const videos = panels.map((p) => p.querySelector('video'))

      /* Static experience: five films in a column, play on view.
         (The original also took this path when GSAP failed to load from
         the CDN; it is bundled here, so only the motion check remains.) */
      if (reduceMotion) {
        return initLabStatic(videos, true)
      }

      return buildLabAnimation(section, scrollEl, {
        panels,
        videos,
        dialBox: dialRef.current,
        ticks: ticksRef.current,
        gauge: gaugeRef.current,
        meterFill: meterFillRef.current,
        panelsWrap: panelsRef.current,
      })
    },
    { scope: sectionRef }
  )

  return (
    <section id="lab" className="lab" aria-labelledby="lab-title" ref={sectionRef}>
      <header className="lab__head">
        <h2 id="lab-title" className="lab__title">The Performance <em>Lab.</em></h2>
        <p className="lab__intro">
          Every system we sell goes through the lab before it goes near a
          home. Five of those tests, filmed as they ran: rain, wind,
          street noise, heat and a break-in attempt.
        </p>
      </header>

      <div className="lab__scroll" id="labScroll" ref={scrollRef}>
        <div className="lab__stage">

          {/* Instrument dial: the ticks turn with scroll; the gauge arc
              fills as each test runs and locks gold when it resolves. */}
          <div className="lab__dial" id="labDial" aria-hidden="true" ref={dialRef}>
            <svg viewBox="0 0 100 100" focusable="false">
              <circle cx="50" cy="50" r="48.5" fill="none"
                      stroke="rgba(167, 154, 135, 0.14)" strokeWidth="0.2" />
              <circle className="lab__ticks" cx="50" cy="50" r="48.5" fill="none"
                      stroke="rgba(167, 154, 135, 0.4)" strokeWidth="1.4"
                      strokeDasharray="0.3 7.315" ref={ticksRef} />
              <circle className="lab__gauge" cx="50" cy="50" r="48.5" fill="none"
                      stroke="#A79A87" strokeOpacity="0.85" strokeWidth="1.6"
                      strokeLinecap="round" pathLength="1"
                      strokeDasharray="1" strokeDashoffset="1"
                      transform="rotate(-90 50 50)" ref={gaugeRef} />
            </svg>
          </div>

          <div className="lab__panels" id="labPanels" ref={panelsRef}>

            {LAB_PANELS.map((panel) => (
              <article className="lab__panel" key={panel.num}>
                <div className="lab__panel-aura" style={{ '--aura': panel.aura }} aria-hidden="true"></div>
                <div className="lab__info">
                  <span className="lab__num">{panel.num}</span>
                  <h3 className="lab__panel-title">{panel.title}</h3>
                  <p>
                    {panel.copy}
                  </p>
                  <div className="lab__result">
                    <span className="lab__result-status">{panel.status}</span>
                    <span className="lab__result-stat"><span className="lab__result-value">{panel.value}</span><span className="lab__result-unit">{panel.unit}</span></span>
                    <span className="lab__result-metric">{panel.metric}</span>
                  </div>
                </div>
                <div className="lab__frame">
                  <video src={panel.video} muted ref={keepMuted} loop playsInline preload="metadata"></video>
                  <div className="lab__tele" aria-hidden="true">
                    <span className="lab__tele-dot"></span>
                    {/* ⚠ One template literal, not `Test {panel.num} · running`.
                        Interpolating mid-sentence makes React emit THREE text
                        nodes ("Test ", "01", " · running"); hero.html's parser
                        produces one. Chrome shapes each text node as its own
                        run, so with `letter-spacing: 0.24em` the split version
                        measures 128.438px against the original's 128.420px and
                        drags .lab__tele's shrink-to-fit width with it. */}
                    <span className="lab__tele-run">{`Test ${panel.num} · running`}</span>
                    <span className="lab__tele-pass">{`Test ${panel.num} · passed`}</span>
                  </div>
                </div>
              </article>
            ))}

          </div>

          {/* Progress meter (animated experience only) */}
          <div className="lab__meter" aria-hidden="true">
            <div className="lab__meter-fill" id="labMeterFill" ref={meterFillRef}></div>
          </div>

        </div>
      </div>
    </section>
  )
}
