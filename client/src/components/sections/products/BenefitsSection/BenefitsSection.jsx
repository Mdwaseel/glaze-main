import { useEffect, useRef } from 'react'
import { initLabStrip } from './labStrip'
import './benefitsSection.css'

/**
 * BenefitsSection — port of products/sliding.html lines 2727-2788.
 *
 * The five Performance Lab films from the homepage, reused here as a
 * compact strip: they loop muted at rest, and hovering one widens it and
 * turns the sound on for as long as the pointer stays. Identical on all
 * six pages.
 *
 * ⚠ THE VIDEO PATHS ARE PERCENT-ENCODED because the folder and files are
 * named with spaces ("Performance lab/Rain Test.mp4"). Reproduced exactly
 * as authored — the files sit under public/videos/ with those names.
 *
 * ⚠ Passive effect, not a layout one: nothing here changes layout, and
 * the observer only needs to exist by the time the strip can be scrolled
 * to.
 */

/** The five tests, in the order the original lists them. */
const FILMS = [
  { src: '/videos/Performance%20lab/Rain%20Test.mp4', label: 'Rain test footage', test: 'Rain', stat: '750', unit: 'Pa' },
  { src: '/videos/Performance%20lab/Wind%20Test.mp4', label: 'Wind test footage', test: 'Wind', stat: '2400', unit: 'Pa' },
  { src: '/videos/Performance%20lab/Sound%20Test.mp4', label: 'Noise test footage', test: 'Noise', stat: '42', unit: 'dB' },
  { src: '/videos/Performance%20lab/thermal%20test.mp4', label: 'Thermal test footage', test: 'Thermal', stat: '1.1', unit: 'U' },
  { src: '/videos/Performance%20lab/Security%20Test.mp4', label: 'Security test footage', test: 'Security', stat: '10', unit: 'min' },
]

export default function BenefitsSection() {
  const stripRef = useRef(null)

  useEffect(() => initLabStrip(stripRef.current), [])

  return (
    <section className="plab" id="sys-benefits" aria-labelledby="plab-title">
      <div className="plab__inner">
        <p className="eyebrow">Proven, Not Promised</p>
        <h2 className="sec-title plab__title" id="plab-title" data-curtain>
          The Performance Lab. <em>Every claim, tested.</em>
        </h2>

        <div className="plab__strip" id="plabStrip" ref={stripRef}>
          {FILMS.map((f) => (
            <article className="plab__film" key={f.test}>
              <video src={f.src} muted loop playsInline preload="none" aria-label={f.label}></video>
              <span className="plab__sound" aria-hidden="true">Sound on</span>
              <div className="plab__meta">
                <p className="plab__test">{f.test}</p>
                <p className="plab__stat">{f.stat}<span>{f.unit}</span></p>
                <p className="plab__pass">Passed</p>
              </div>
            </article>
          ))}
        </div>

        <p className="plab__hint">Hover a film to expand it · sound plays while you hold</p>
      </div>
    </section>
  )
}
