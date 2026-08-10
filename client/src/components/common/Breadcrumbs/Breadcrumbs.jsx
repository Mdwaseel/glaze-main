import { Link } from 'react-router-dom'
import './breadcrumbs.css'

/**
 * The visible breadcrumb trail.
 *
 * ⚠ IT EXISTS BECAUSE THE SCHEMA ALREADY DID. The system pages and the blog
 * articles have shipped a BreadcrumbList in their JSON-LD since the SEO
 * component landed, and siteOrigin.js carries the warning in writing:
 *
 *     "The schema has to match a breadcrumb the visitor can actually see —
 *      Google treats an invisible one as spam."
 *
 * Nothing rendered one. So every system page and every article was asserting
 * a navigation structure to a crawler that no human on the page could use —
 * which is the exact shape of markup Google's structured-data guidelines call
 * out, and it was sitting on the seven highest-value pages on the site. This
 * component is the missing half, not a new feature.
 *
 * ⚠ ONE ARRAY, BOTH HALVES. The page builds the trail once and passes the
 * same array here and to `breadcrumbSchema()`, so the two cannot describe
 * different journeys. Do not hand this a trail assembled separately from the
 * schema's — that reintroduces the mismatch it was written to close.
 *
 * The last step is the current page: it is rendered as text with
 * `aria-current="page"` rather than as a link to where you already are.
 *
 * @param {object}   props
 * @param {{name: string, path: string}[]} props.trail  Home first, this page last
 * @param {string}   [props.variant]  'over' to sit on dark media, 'plain' otherwise
 * @param {string}   [props.className]
 */
export default function Breadcrumbs({ trail, variant = 'plain', className = '' }) {
  /* A one-item trail is "Home", which is furniture — the logo already does
     that job. `breadcrumbSchema()` returns null on the same condition, so the
     two agree about when there is nothing to say. */
  if (!trail || trail.length < 2) return null

  const last = trail.length - 1

  return (
    <nav
      className={`crumbs crumbs--${variant}${className ? ` ${className}` : ''}`}
      aria-label="Breadcrumb"
    >
      <ol className="crumbs__list">
        {trail.map((step, i) => (
          <li className="crumbs__item" key={step.path}>
            {i === last ? (
              <span className="crumbs__current" aria-current="page">{step.name}</span>
            ) : (
              <>
                <Link className="crumbs__link" to={step.path}>{step.name}</Link>
                {/* Decorative: the <ol> is what conveys the order to a screen
                    reader, and a slash read aloud between every step is noise. */}
                <span className="crumbs__sep" aria-hidden="true">/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
