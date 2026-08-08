import { useLayoutEffect, useRef } from 'react'
import { initGlassSwitcher } from './glassSwitcher'
import './glassSection.css'

/**
 * GlassSection — port of products/sliding.html lines 2529-2643.
 *
 * One room, one camera, one hour of the afternoon, photographed through
 * eight glazings and stacked as eight layers. The floating panel swaps
 * which layer is live; the spec rows roll to that glazing's figures.
 * Identical on all six pages, so nothing here is parameterised.
 *
 * ⚠ THE EIGHT SPEC PAYLOADS ARE AUTHORED ON THE BUTTONS, as `data-*`.
 * They are left there rather than lifted into a data module, because
 * glassSwitcher.js reads them off the DOM exactly as the original script
 * does — moving them would mean rewriting the controller, which is the
 * one thing this migration does not do.
 *
 * The first layer is `is-live` and the first sample `is-active` /
 * `aria-checked="true"` in the authored markup, so the section is a
 * complete, readable state before the controller runs.
 *
 * `fetchpriority="high"` on the clear render is authored: it is both the
 * opening layer here AND the hero's poster on five of the six pages.
 */

/** The eight glazings, in the order the original lists them. */
const GLASS = [
  {
    key: 'clear', name: 'Clear', label: 'Clear',
    layerAlt: 'Living room seen through clear glazing',
    desc: 'Maximum transparency with minimal reflection.',
    u: '2.8', shgc: '0.82', vlt: '89', rw: '31', uv: '22', priv: 'Minimal',
  },
  {
    key: 'grey', name: 'Grey', label: 'Grey',
    layerAlt: 'The same room through grey tinted glazing',
    desc: 'Reduced brightness with a sophisticated charcoal tint.',
    u: '2.8', shgc: '0.58', vlt: '42', rw: '31', uv: '38', priv: 'Low',
  },
  {
    key: 'bronze', name: 'Bronze', label: 'Bronze',
    layerAlt: 'The same room through bronze tinted glazing',
    desc: 'Warm amber tones that create a luxurious atmosphere.',
    u: '2.8', shgc: '0.62', vlt: '50', rw: '31', uv: '35', priv: 'Low',
  },
  {
    key: 'frosted', name: 'Frosted', label: 'Frosted',
    layerAlt: 'The same room through frosted glazing',
    desc: 'High privacy with soft light diffusion and blurred visibility.',
    u: '2.8', shgc: '0.78', vlt: '76', rw: '32', uv: '25', priv: 'High',
  },
  {
    key: 'reflective', name: 'Reflective', label: 'Reflective',
    layerAlt: 'The same room through reflective glazing',
    desc: 'Mirror-like exterior reflections with reduced interior visibility.',
    u: '2.6', shgc: '0.34', vlt: '20', rw: '32', uv: '55', priv: 'High',
  },
  {
    key: 'lowe', name: 'Low-E', label: 'Low-E',
    layerAlt: 'The same room through Low-E glazing',
    desc: 'Crystal clear with subtle blue spectral reflections, tuned for energy efficiency.',
    u: '1.6', shgc: '0.40', vlt: '70', rw: '33', uv: '84', priv: 'Minimal',
  },
  {
    key: 'laminated', name: 'Laminated', label: 'Laminated',
    layerAlt: 'The same room through laminated glazing',
    desc: 'Clear safety glass with layered optical depth and stronger acoustics.',
    u: '2.7', shgc: '0.70', vlt: '84', rw: '38', uv: '99', priv: 'Minimal',
  },
  {
    /* The only sample whose button label differs from its recorded name —
       "Double" on the chip, "Double Glazed" in the spec. Authored. */
    key: 'double', name: 'Double Glazed', label: 'Double',
    layerAlt: 'The same room through double glazed units',
    desc: 'Two panes with an insulated cavity — subtle edge depth, best thermal figures.',
    u: '1.4', shgc: '0.55', vlt: '78', rw: '36', uv: '45', priv: 'Minimal',
  },
]

export default function GlassSection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => initGlassSwitcher(sectionRef.current), [])

  return (
    <section className="gls" id="sys-glass" aria-labelledby="gls-title" ref={sectionRef}>
      <div className="gls__stage" id="glsStage">
        {GLASS.map((g, i) => (
          <div
            className={i === 0 ? 'gls__layer is-live' : 'gls__layer'}
            data-glass-layer={g.key}
            key={g.key}
          >
            <img
              src={`/products/glass/${g.key}.webp`}
              alt={g.layerAlt}
              {...(i === 0
                ? { fetchPriority: 'high' }
                : { loading: 'lazy' })}
              decoding="async"
            />
          </div>
        ))}
        <div className="gls__veil" aria-hidden="true"></div>
      </div>

      <div className="gls__inner">
        <div className="gls__head">
          <h2 className="gls__title" id="gls-title" data-curtain>
            Experience <em>every glass.</em>
          </h2>
          <p className="gls__lede">
            One room, one camera, one hour of the afternoon. Only the
            glazing changes — so what you are comparing is the glass and
            nothing else.
          </p>
        </div>

        <div className="gls__foot">
          <p className="gls__foot-title">Live preview</p>
          {/* ⚠ TWO WORDINGS OF THE SAME INSTRUCTION, one shown at a time by
              CSS. The desktop sentence is built on hover, which does not
              exist on a phone — leaving it there would describe an
              interaction the visitor cannot perform. Rendering both and
              swapping in the ≤768 block keeps the copy honest without
              duplicating the section or reaching for a media-query hook. */}
          <p className="gls__foot-copy gls__foot-copy--hover">
            Hover a sample to swap the glazing in place — tint,
            transparency, reflection and daylight all update with it.
            Click to lock your choice; it travels with your enquiry.
          </p>
          <p className="gls__foot-copy gls__foot-copy--touch">
            Tap a sample to swap the glazing in place — tint, transparency,
            reflection and daylight all update with it. Your choice is
            remembered and travels with your enquiry.
          </p>
        </div>
      </div>

      {/* Floating selector */}
      <div className="gls__panel" id="glsPanel">
        {/* Decorative grip mark, mobile only. It reads as the top edge of a
            sheet; the panel is not draggable and nothing here claims it is. */}
        <span className="gls__grip" aria-hidden="true"></span>
        <p className="gls__panel-label">Glass selection</p>

        <div className="gls__samples" id="glsSamples" role="radiogroup" aria-label="Glass type">
          {GLASS.map((g, i) => (
            <button
              className={i === 0 ? 'gls__sample is-active' : 'gls__sample'}
              type="button"
              role="radio"
              aria-checked={i === 0 ? 'true' : 'false'}
              key={g.key}
              data-glass={g.key}
              data-name={g.name}
              data-desc={g.desc}
              data-u={g.u}
              data-shgc={g.shgc}
              data-vlt={g.vlt}
              data-rw={g.rw}
              data-uv={g.uv}
              data-priv={g.priv}
            >
              <span className="gls__sample-img"><img src={`/products/glass/${g.key}-tile.webp`} alt="" loading="lazy" /></span>
              <span className="gls__sample-name">{g.label}</span>
            </button>
          ))}
        </div>

        <div className="gls__spec">
          <p className="gls__panel-label">Glass specifications</p>
          <p className="gls__spec-desc" id="glsDesc">Maximum transparency with minimal reflection.</p>

          <dl className="gls__rows">
            <div className="gls__row"><dt>U-Value</dt><dd><span data-count data-dec="1" id="gU">2.8</span> W/m²K</dd></div>
            <div className="gls__row"><dt>SHGC</dt><dd><span data-count data-dec="2" id="gShgc">0.82</span></dd></div>
            <div className="gls__row"><dt>Visible light</dt><dd><span data-count data-dec="0" id="gVlt">89</span>%</dd></div>
            <div className="gls__row"><dt>Rw acoustic</dt><dd><span data-count data-dec="0" id="gRw">31</span> dB</dd></div>
            <div className="gls__row"><dt>UV blocked</dt><dd><span data-count data-dec="0" id="gUv">22</span>%</dd></div>
            <div className="gls__row"><dt>Privacy</dt><dd id="gPriv">Minimal</dd></div>
          </dl>

          <p className="gls__fine">Indicative values — confirmed per specification</p>

          {/* ⚠ THIS IS THE ONLY NEW BEHAVIOUR IN THE SECTION, and it is a
              plain in-page anchor rather than invented functionality. The
              section already commits to "it travels with your enquiry" —
              `glassSwitcher` writes the locked sample into the shared spec
              store via setSpec('glass', …) and §11 reads it back — but on
              desktop the visitor scrolls on to reach that form. On a phone
              the panel is the end of the screen, so the promise needs a
              door. #contact is SystemEnquirySection on this same page, and
              useProductsScrollBridge eases the jump clear of the sticky nav.

              Hidden above 768px: the desktop composition is unchanged. */}
          <a className="gls__cta" href="#contact">
            <span className="gls__cta-dot" aria-hidden="true"></span>
            <span className="gls__cta-text">Enquire with this glass</span>
            <span className="gls__cta-arrow" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  )
}
