import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useScrollTriggerRefresh } from '@/hooks'
import { prefersReducedMotion } from '@/utils/motion'
import { buildPhilosophyAnimation, setFinalNumbers } from './philosophyAnimation'
import './philosophySection.css'

/**
 * PhilosophySection — port of hero.html lines 1509-1548.
 *
 * Markup, class names, ids and the data-anim hooks are unchanged. All
 * animation lives in philosophyAnimation.js; this component only renders
 * and scopes it.
 */

/** Stats grid content, transcribed from the original markup. */
const PHILOSOPHY_STATS = [
  { countTo: '40', decimals: '0', initial: '0', unit: ' ft', label: 'Maximum Span' },
  { countTo: '50', decimals: '0', initial: '0', unit: ' dB', label: 'Acoustic Performance' },
  { countTo: '3.5', decimals: '1', initial: '0.0', unit: ' kPa', label: 'Structural Strength' },
  { countTo: '30', decimals: '0', initial: '0', unit: '+ Years', label: 'Engineered to Last' },
]

export default function PhilosophySection() {
  const sectionRef = useRef(null)

  // Recompute trigger positions once the page has fully settled —
  // the original registers this from inside the Philosophy script.
  useScrollTriggerRefresh()

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return

      // Reduced motion → rest state + final numbers, no movement.
      // (The original also bailed when GSAP failed to load from the CDN;
      // it is bundled here, so only the motion check remains.)
      if (prefersReducedMotion()) {
        setFinalNumbers(section)
        return
      }

      buildPhilosophyAnimation(section)
    },
    { scope: sectionRef }
  )

  return (
    <section id="philosophy" className="philosophy" ref={sectionRef}>
      <div className="philosophy__inner">
        <h2 className="philosophy__heading" data-anim="headline">
          {/* ⚠ The trailing space lives INSIDE the string literal, not as a
              separate {' '}. hero.html line 1513 puts this whole run in one
              text node; `…to{' '}` makes React emit two, and Chrome shapes
              each text node as its own run — the accent span then lands
              0.02px to the right of the reference at 768px. */}
          {'Not every window is designed to '}
          <span className="philosophy__heading-accent" data-anim="accent">disappear</span>. Ours are.
        </h2>
        <p className="philosophy__description" data-anim="para">
          We engineer architectural systems that disappear into the design,
          leaving only light, openness and exceptional comfort.
        </p>

        <div className="philosophy__divider" data-anim="divider"></div>

        {/* Stats grid */}
        <div className="philosophy__stats">

          {PHILOSOPHY_STATS.map((stat) => (
            <div className="philosophy__stat" key={stat.label}>
              <span className="philosophy__stat-number"><span className="philosophy__stat-value" data-count-to={stat.countTo} data-decimals={stat.decimals}>{stat.initial}</span><span className="philosophy__stat-unit">{stat.unit}</span></span>
              <span className="philosophy__stat-label" data-anim="label">{stat.label}</span>
            </div>
          ))}

        </div>
      </div>
    </section>
  )
}
