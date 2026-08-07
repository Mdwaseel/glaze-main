import { useLayoutEffect, useRef } from 'react'
import { seriesFor } from '@/data/systems'
import { initSeriesAccordion } from './seriesAccordion'
import './seriesSection.css'

/**
 * SeriesSection — port of products/sliding.html lines 2314-2494.
 *
 * The full twelve-series catalogue as a gapless grid, plus the one shared
 * spec panel underneath. Every card carries its own numbers as `data-*`
 * attributes and the panel reads them, so "adding a series is a
 * markup-only change" — the original's note, and the reason the panel is
 * authored once rather than twelve times.
 *
 * ⚠ WHAT CHANGES PER SYSTEM is only the ORDER of the twelve cards and
 * which of them are flagged `is-fit` with a `· For <System>` tag. The
 * numbers behind each series were verified byte-identical across all six
 * pages, so they live once in data/systems.js.
 *
 * ⚠ `--ser-cols: 6` is authored inline on every one of the six pages —
 * the CSS reads it as `repeat(var(--ser-cols, 6), …)` so a system with a
 * different card count would not leave an empty cell. All six ship 6.
 *
 * ⚠ THE `<noscript>` STYLE IS NOT CARRIED OVER. The original withdraws
 * the panel and the "Specs" affordance when JS is off, because an
 * accordion that cannot open should not be advertised. In an SPA the
 * scripts are never absent, so the rule would be dead CSS.
 *
 * The `&nbsp;` in the panel's name and kind is authored: it holds the
 * two lines' height before a card is opened, so the panel does not jump
 * when the first one fills it.
 */
export default function SeriesSection({ system }) {
  const sectionRef = useRef(null)
  const series = seriesFor(system)

  useLayoutEffect(() => initSeriesAccordion(sectionRef.current), [])

  return (
    <section className="ser" id="sys-series" aria-labelledby="ser-title" ref={sectionRef}>
      <div className="ser__inner">

        <div className="ser__head">
          <h2 className="sec-title" id="ser-title" data-curtain>
            Twelve series. <em>Every project scale.</em>
          </h2>
          <p className="ser__note">
            {system.seriesNote}
          </p>
        </div>

        <div className="ser__grid" id="serGrid" role="list" style={{ '--ser-cols': 6 }}>
          {series.map((s) => {
            const fit = system.fits.includes(s.id)
            return (
              <button
                className={fit ? 'ser__card is-fit' : 'ser__card'}
                type="button"
                role="listitem"
                key={s.id}
                data-name={s.name}
                data-kind={s.kind}
                data-w={s.w}
                data-h={s.h}
                data-kg={s.kg}
                data-u={s.u}
                data-udec={s.udec}
                data-rw={s.rw}
                data-pa={s.pa}
                data-note={s.note}
              >
                <span className="ser__shot"><img src={s.img} alt={s.alt} loading="lazy" decoding="async" /></span>
                <span className="ser__type">
                  {s.type}{fit ? <> <b>· For {system.name}</b></> : null}
                </span>
                <span className="ser__name">{s.name}</span>
                <span className="ser__dims">{s.dims}</span>
                <span className="ser__more">Specs <i aria-hidden="true">▾</i></span>
              </button>
            )
          })}
        </div>

        <div className="ser__panel" id="serPanel" aria-live="polite">
          <div className="ser__panel-in">
            <div className="ser__panel-top">
              <h3 className="ser__panel-name" id="serPanelName">&nbsp;</h3>
              <p className="ser__panel-kind" id="serPanelKind">&nbsp;</p>
            </div>

            <div className="ser__metrics">
              <div>
                <p className="ser__metric-label">Max width<br />per pane</p>
                <p className="ser__metric-value"><span data-metric="w" data-dec="0">0</span><span className="ser__metric-unit">mm</span></p>
              </div>
              <div>
                <p className="ser__metric-label">Max height<br />per pane</p>
                <p className="ser__metric-value"><span data-metric="h" data-dec="0">0</span><span className="ser__metric-unit">mm</span></p>
              </div>
              <div>
                <p className="ser__metric-label">Max weight<br />per pane</p>
                <p className="ser__metric-value"><span data-metric="kg" data-dec="0">0</span><span className="ser__metric-unit">kg</span></p>
              </div>
              <div>
                <p className="ser__metric-label">Thermal<br />U-value</p>
                <p className="ser__metric-value"><span data-metric="u" data-dec="2">0</span><span className="ser__metric-unit">W/m²K</span></p>
              </div>
              <div>
                <p className="ser__metric-label">Sound<br />insulation</p>
                <p className="ser__metric-value"><span data-metric="rw" data-text>41–44</span><span className="ser__metric-unit">Rw dB</span></p>
              </div>
              <div>
                <p className="ser__metric-label">Water<br />tightness</p>
                <p className="ser__metric-value"><span data-metric="pa" data-dec="0">0</span><span className="ser__metric-unit">Pa</span></p>
              </div>
            </div>

            <p className="ser__extra" id="serPanelNote" hidden></p>

            <div className="ser__standards">
              <span>Air permeability · Class 4</span>
              <span>BS EN 1026 / 12207</span>
              <span>BS EN 12208 · no leakage</span>
              <span>Wind load · P4–P5 · BS EN 12210</span>
            </div>

            <a className="ser__panel-cta" href="#contact" data-pick-series>Enquire with this series <span aria-hidden="true">&rarr;</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}
