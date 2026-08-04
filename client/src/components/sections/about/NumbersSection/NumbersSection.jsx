import { useLayoutEffect, useRef } from 'react'
import { buildNumbersPlan } from './numbersAnimation'
import './numbersSection.css'

/**
 * NumbersSection — port of about.html lines 4069-4148.
 *
 * Four count-up stats on near-black, the 50,000 sq ft one carrying a
 * simplified factory-floor blueprint that draws itself stroke by stroke,
 * then a continuously drifting finish marquee.
 *
 * ⚠ The COUNT-UPS ARE NOT WIRED HERE. All four carry `[data-count-to]`
 * and ride the shared system in the About base script —
 * `useAboutCountUp`, mounted page-level by About.jsx. The markup holds
 * the FINAL value (`1989` · `50,000` · `100` · `10`), which is the single
 * source of truth and the no-JS / reduced-motion state; the hook zeroes
 * and counts up only when motion is allowed. That hook is About's own
 * (`Math.round` + `data-format="comma"` → `toLocaleString('en-IN')`,
 * comma-stripped target, counters zeroed up front) — Home's `useCountUp`
 * is deliberately not used, per the Phase 13 table.
 *
 * ⚠ LAYOUT effect, matching Process (16), Two Worlds (17), Factory (19),
 * Manifesto (20), People (21) and Values (22). about.html runs this script
 * at parse time, so `nums--plananim` and the zeroed stroke dasharrays are
 * both in place before the section is first painted. From a passive
 * effect React would paint the finished blueprint and only then blank it
 * — a visible flash of the completed drawing.
 *
 * The marquee is pure CSS (`nums-drift 46s linear infinite`, paused on
 * hover, `animation: none` under reduced motion) with the swatch set
 * duplicated in the markup so the 50% translate loops seamlessly.
 * `.fade-up` on the four stats rides useAboutFadeReveal.
 */
export default function NumbersSection() {
  const sectionRef = useRef(null)
  const planRef = useRef(null)

  useLayoutEffect(
    () => buildNumbersPlan(sectionRef.current, planRef.current),
    []
  )

  return (
    <section id="about-numbers" className="nums" aria-label="Glaze in numbers" ref={sectionRef}>
      <div className="nums__grid">
        <div className="nums__stat fade-up">
          <span className="nums__value"><span data-count-to="1989" data-format="plain">1989</span></span>
          <span className="nums__label">Aluminium Since</span>
        </div>
        <div className="nums__stat fade-up" style={{ '--reveal-delay': '0.1s' }}>
          <span className="nums__value"><span data-count-to="50000" data-format="comma">50,000</span><span className="nums__unit">sq ft</span></span>
          <span className="nums__label">Hyderabad Facility</span>
          {/* Simplified floor plan of the five production zones —
              pure linework, drawn stroke by stroke on entry. */}
          <svg className="nums__plan" id="numsPlan" viewBox="0 0 240 140"
               role="img" aria-label="Simplified plan of the 50,000 square foot factory floor" ref={planRef}>
            <rect className="nums__plan-fill" x="5" y="5" width="230" height="130" />
            <g strokeWidth="1.2">
              {/* outer shell, with a break for the loading bay */}
              <path data-draw="" d="M5 5 H235 V135 H80" />
              <path data-draw="" style={{ '--d': '0.25s' }} d="M56 135 H5 V5" />
              {/* loading bay door swing */}
              <path data-draw="" style={{ '--d': '0.4s' }} d="M56 135 A24 24 0 0 1 80 111" strokeWidth="0.7" />
              {/* zone partitions, door gaps left open */}
              <path data-draw="" style={{ '--d': '0.5s' }} d="M52 5 V96" />
              <path data-draw="" style={{ '--d': '0.62s' }} d="M98 40 V135" />
              <path data-draw="" style={{ '--d': '0.74s' }} d="M144 5 V82" />
              <path data-draw="" style={{ '--d': '0.86s' }} d="M190 52 V135" />
              {/* mezzanine line across zone five */}
              <path data-draw="" style={{ '--d': '0.98s' }} d="M190 52 H235" strokeWidth="0.7" />
            </g>
            {/* column grid */}
            <g strokeWidth="1">
              <circle data-draw="" style={{ '--d': '1.05s' }} cx="52" cy="118" r="1.6" />
              <circle data-draw="" style={{ '--d': '1.1s' }} cx="98" cy="22" r="1.6" />
              <circle data-draw="" style={{ '--d': '1.15s' }} cx="121" cy="70" r="1.6" />
              <circle data-draw="" style={{ '--d': '1.2s' }} cx="167" cy="112" r="1.6" />
              <circle data-draw="" style={{ '--d': '1.25s' }} cx="212" cy="26" r="1.6" />
            </g>
          </svg>
        </div>
        <div className="nums__stat fade-up" style={{ '--reveal-delay': '0.2s' }}>
          <span className="nums__value"><span data-count-to="100" data-format="plain">100</span><span className="nums__unit">+</span></span>
          <span className="nums__label">Finishes</span>
        </div>
        <div className="nums__stat fade-up" style={{ '--reveal-delay': '0.3s' }}>
          <span className="nums__value"><span data-count-to="10" data-format="plain">10</span><span className="nums__unit">yr</span></span>
          <span className="nums__label">Warranty</span>
        </div>
      </div>

      <div className="nums__marquee">
        <p className="nums__marquee-head">A hundred ways to finish a frame</p>
        {/* The swatch set is duplicated once so the 50% translate loops
            seamlessly. Chip colours are content (real anodic tones),
            not new UI colours. */}
        <div className="nums__belt" aria-label="Anodized and powder-coat finish range">

          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#C9C9C4' }}></div><span className="nums__finish">Natural Silver</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#A79A87' }}></div><span className="nums__finish">Champagne</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#8C7A5F' }}></div><span className="nums__finish">Light Bronze</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#5A4E3F' }}></div><span className="nums__finish">Dark Bronze</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#4A4A48' }}></div><span className="nums__finish">Graphite</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#1B1B1B' }}></div><span className="nums__finish">Jet Black</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#EFEDE8' }}></div><span className="nums__finish">Pearl White</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#55585C' }}></div><span className="nums__finish">Gunmetal</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#7E6A55' }}></div><span className="nums__finish">Copper Anodic</span></div>
          <div className="nums__swatch"><div className="nums__chip" style={{ background: '#B9B7B2' }}></div><span className="nums__finish">Brushed Steel</span></div>

          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#C9C9C4' }}></div><span className="nums__finish">Natural Silver</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#A79A87' }}></div><span className="nums__finish">Champagne</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#8C7A5F' }}></div><span className="nums__finish">Light Bronze</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#5A4E3F' }}></div><span className="nums__finish">Dark Bronze</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#4A4A48' }}></div><span className="nums__finish">Graphite</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#1B1B1B' }}></div><span className="nums__finish">Jet Black</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#EFEDE8' }}></div><span className="nums__finish">Pearl White</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#55585C' }}></div><span className="nums__finish">Gunmetal</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#7E6A55' }}></div><span className="nums__finish">Copper Anodic</span></div>
          <div className="nums__swatch" aria-hidden="true"><div className="nums__chip" style={{ background: '#B9B7B2' }}></div><span className="nums__finish">Brushed Steel</span></div>

        </div>
      </div>
    </section>
  )
}
