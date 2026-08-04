import { formatDate } from '@/utils/format'

/**
 * Charts, hand-drawn in DOM/CSS rather than pulled from a library.
 *
 * One series of daily counts and a set of proportion bars does not justify a
 * charting dependency — Chart.js is ~70 KB gzipped and Recharts pulls all of
 * D3's scale packages. These are a few divs, they inherit the brand tokens,
 * and they keep the admin bundle small.
 *
 * Both are readable without hovering: the bar chart labels its own axis and
 * gives every column a <title> (native tooltip AND the accessible name), and
 * the proportion bars print their value beside the label. Hover is an
 * enhancement, never the only way to read a number — a touch user has no
 * hover at all.
 */

export function BarChart({ series, valueKey = 'views', label = 'views' }) {
  if (!series?.length) {
    return <p className="ad-field__hint">No data for this period yet.</p>
  }

  // A flat zero series would divide by zero; a floor of 1 draws it as an
  // empty baseline rather than crashing or filling every bar.
  const max = Math.max(...series.map((point) => point[valueKey]), 1)

  return (
    <>
      <div className="ad-chart" role="img" aria-label={`Daily ${label} over the selected period`}>
        {series.map((point) => {
          const height = (point[valueKey] / max) * 100
          return (
            <div
              key={point.date}
              className="ad-chart__col"
              tabIndex={0}
              title={`${formatDate(point.date)}: ${point[valueKey]} ${label}`}
            >
              <span className="ad-chart__tip">
                {formatDate(point.date, { year: undefined })} · {point[valueKey]}
              </span>
              <span
                className="ad-chart__bar"
                style={{ height: `${Math.max(height, 1)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="ad-chart__axis">
        <span>{formatDate(series[0].date, { year: undefined })}</span>
        <span>peak {max}</span>
        <span>{formatDate(series[series.length - 1].date, { year: undefined })}</span>
      </div>
    </>
  )
}

export function ProportionBars({ items, labelKey = 'label', valueKey = 'value', suffix = '' }) {
  if (!items?.length) {
    return <p className="ad-field__hint">Nothing recorded yet.</p>
  }

  const max = Math.max(...items.map((item) => item[valueKey]), 1)

  return (
    <div className="ad-bars">
      {items.map((item) => (
        <div key={item[labelKey]}>
          <div className="ad-bar__head">
            <span className="ad-bar__label" title={item[labelKey]}>{item[labelKey]}</span>
            <span className="ad-bar__value">
              {item[valueKey].toLocaleString()}{suffix}
            </span>
          </div>
          <div className="ad-bar__track">
            <span
              className="ad-bar__fill"
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
