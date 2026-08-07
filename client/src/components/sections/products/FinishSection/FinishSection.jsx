import { useLayoutEffect, useRef } from 'react'
import { useMediaQuery } from '@/hooks'
import { initFinishSwitcher } from './finishSwitcher'
import FinishMobile from './FinishMobile'
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
 *
 * ⚠ ALL OF THIS IS THE 769px-AND-UP SECTION. Below that the whole subtree
 * is replaced by FinishMobile — a touch-first configurator with a 4:5
 * preview, family pills and circular swatches — because everything here
 * is driven by hover, and a phone has no pointer to hover with. See its
 * header for the reasoning, and the `isMobile` note in the body for how
 * the swap is kept safe. Tablet still gets this section, unchanged.
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

  /* ⚠ THE PHONE GETS A DIFFERENT SECTION, NOT A NARROWER ONE. Below 768px
     everything from `.fin__grid` down is replaced by FinishMobile. It is a
     SWAP, not an overlay — neither tree is rendered hidden behind the
     other — and the shell around it is the same element either way: same
     id, same label, same ground, which is what the phone layout reads its
     colours from. */
  const isMobile = useMediaQuery('(max-width: 768px)')

  /* ⚠ `isMobile` IS A DEPENDENCY, NOT JUST A RENDER FLAG. The switcher is
     an imperative controller that captured its swatches, layers and stamp
     when it ran; crossing 768px destroys all three. Listing it here runs
     the AbortController teardown on the way across in both directions, and
     keeps the hover/focus/mouseleave bindings off the phone entirely. */
  useLayoutEffect(() => {
    if (isMobile) return undefined
    return initFinishSwitcher(sectionRef.current)
  }, [isMobile])

  if (isMobile) {
    return (
      <section className="fin" id="sys-finish" aria-labelledby="fin-title" ref={sectionRef}>
        <div className="fin__inner">
          <FinishMobile finishes={FINISHES} />
        </div>
      </section>
    )
  }

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
