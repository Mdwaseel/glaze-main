import './overviewSection.css'

/**
 * OverviewSection — port of products/sliding.html lines 2225-2306.
 *
 * Three registers stacked and separated by hairlines rather than empty
 * space, so the section reads as one argument instead of three blocks:
 * the claim (title + "Best for" chips), the argument (two paragraphs),
 * the numbers, and the four reasons.
 *
 * ⚠ NO CONTROLLER. §03 ships as `<style>` + `<section>` with no script of
 * its own. Every beat rides page-level machinery:
 *
 *   [data-curtain] on the title      → useProductsEntrance
 *   [data-reveal] on "Best for"      → useProductsEntrance
 *   [data-stagger] on chips/stats/   → useProductsEntrance
 *     strengths
 *   [data-countup] on each figure    → useProductsEntrance → GLZ.countTo
 *   .ovw__body                       → useProductsEntrance (copy fade)
 *
 * ⚠ THE STAT COUNT VARIES. Sliding, Lift & Slide, Bi-Fold and Casement
 * ship four figures; Pivot ships three and Fixed two. The grid is
 * `repeat(4, …)` in the CSS on every page, so a short row simply leaves
 * the trailing cells empty — which is what those two pages do. Not padded.
 *
 * `data-countup` renders the literal `0` the original ships as its text,
 * so a visitor with reduced motion or no scroll into view sees the same
 * placeholder the static page does before the counter fires.
 */
export default function OverviewSection({ system }) {
  const { overview } = system

  return (
    <section className="ovw" id="sys-overview" aria-labelledby="ovw-title">
      <div className="ovw__inner">
        <p className="eyebrow">The System</p>

        <div className="ovw__grid">
          <div className="ovw__lead">
            <h2 className="sec-title ovw__head-title" id="ovw-title" data-curtain>
              {overview.title.lead}<em>{overview.title.em}</em>
            </h2>

            <div className="ovw__best" data-reveal>
              <p className="ovw__best-label">Best for</p>
              <div className="ovw__chips" data-stagger>
                {overview.chips.map((chip) => (
                  <span className="ovw__chip" key={chip}>{chip}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="ovw__body">
            {overview.body.map((para) => (
              <p key={para.slice(0, 40)}>
                {para}
              </p>
            ))}
          </div>
        </div>

        <div className="ovw__stats" data-stagger>
          {overview.stats.map((stat) => (
            <div className="ovw__stat" key={stat.key}>
              <p className="ovw__stat-num"><span data-countup data-to={stat.to} data-dec={stat.dec}>0</span><span className="ovw__stat-unit">{stat.unit}</span></p>
              <p className="ovw__stat-key">{stat.key}</p>
            </div>
          ))}
        </div>

        <div className="ovw__strengths" data-stagger>
          {overview.strengths.map((str, i) => (
            <div className="ovw__str" key={str.title}>
              <p className="ovw__str-num">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="ovw__str-title">{str.title}</h3>
              <p className="ovw__str-copy">
                {str.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
