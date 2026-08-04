import { useLayoutEffect, useRef } from 'react'
import { initFinishSwitcher } from './finishSwitcher'
import './finishSection.css'

/**
 * FinishSection — port of products/sliding.html lines 2648-2719.
 *
 * The same profile corner, dressed eight ways: anodised metals,
 * powder-coated solids and wood-grain sublimation, each a factory finish
 * rather than a coating applied on site. Identical on all six pages.
 *
 * ⚠ NAME AND FAMILY ARE BOTH AUTHORED on each swatch (`data-name`,
 * `data-family`) because the switcher writes both into the shared spec —
 * the colour for the standing sheet, the family for the form. Left on the
 * DOM for the same reason as the glass payloads: the controller reads
 * them there, exactly as the original does.
 *
 * The first layer is `is-live` and the first swatch `is-active` in the
 * authored markup, and `#finStamp` already reads "Finish · Champagne
 * Bronze", so the section is complete before the controller runs.
 *
 * The `.fin__stage` clip reveal comes from useProductsEntrance.
 */

/** The eight finishes, in the order the original lists them. */
const FINISHES = [
  { key: 'champagne', name: 'Champagne Bronze', family: 'Anodised', alt: 'Aluminium frame corner in champagne bronze' },
  { key: 'black', name: 'Matte Black', family: 'Powder Coat', alt: 'Aluminium frame corner in matte black' },
  { key: 'slate', name: 'Slate Grey', family: 'Powder Coat', alt: 'Aluminium frame corner in slate grey' },
  { key: 'bronzegrey', name: 'Bronze Grey', family: 'PVDF', alt: 'Aluminium frame corner in bronze grey' },
  { key: 'ashwood', name: 'Ashwood', family: 'Wood Grain', alt: 'Aluminium frame corner in ashwood finish' },
  { key: 'goldenoak', name: 'Golden Oak', family: 'Wood Grain', alt: 'Aluminium frame corner in golden oak finish' },
  { key: 'ivoryoak', name: 'Ivory Oak', family: 'Wood Grain', alt: 'Aluminium frame corner in ivory oak finish' },
  { key: 'walnut', name: 'Dark Walnut', family: 'Wood Grain', alt: 'Aluminium frame corner in dark walnut finish' },
]

export default function FinishSection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => initFinishSwitcher(sectionRef.current), [])

  return (
    <section className="fin" id="sys-finish" aria-labelledby="fin-title" ref={sectionRef}>
      <div className="fin__inner">
        <div className="fin__grid">

          <div className="fin__stage" id="finStage">
            {FINISHES.map((f, i) => (
              <div
                className={i === 0 ? 'fin__layer is-live' : 'fin__layer'}
                data-finish-layer={f.key}
                key={f.key}
              >
                <img
                  src={`/products/finish/${f.key}.webp`}
                  alt={f.alt}
                  {...(i === 0 ? {} : { loading: 'lazy' })}
                  decoding="async"
                />
              </div>
            ))}
            <p className="fin__stamp" id="finStamp">Finish · Champagne Bronze</p>
          </div>

          <div>
            <p className="eyebrow">Make It Yours</p>
            <h2 className="sec-title fin__title" id="fin-title" data-curtain>
              Hover a finish. <em>Watch it settle.</em>
            </h2>
            <p className="fin__lede">
              The same profile, dressed eight ways. Anodised metals,
              powder-coated solids and wood-grain sublimation — each one a
              factory finish, not a coating applied on site.
            </p>

            <p className="fin__families">
              <span>Powder Coat</span><span>PVDF</span><span>Wood Grain</span><span>Anodised</span>
            </p>

            <div className="fin__swatches" id="finSwatches" role="radiogroup" aria-label="Frame finish">
              {FINISHES.map((f, i) => (
                <button
                  className={i === 0 ? 'fin__sw is-active' : 'fin__sw'}
                  type="button"
                  role="radio"
                  aria-checked={i === 0 ? 'true' : 'false'}
                  key={f.key}
                  data-finish={f.key}
                  data-name={f.name}
                  data-family={f.family}
                >
                  <span className="fin__sw-chip"><img src={`/products/finish/${f.key}-chip.webp`} alt="" loading="lazy" /></span>
                  <span className="fin__sw-name">{f.name}</span>
                </button>
              ))}
            </div>

            <p className="fin__ral"><b>100+</b> <span>RAL colours, across five finish families</span></p>
          </div>

        </div>
      </div>
    </section>
  )
}
