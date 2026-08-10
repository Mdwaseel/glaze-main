import { Link } from 'react-router-dom'
import SEO, { ORGANIZATION_ID, absoluteUrl, breadcrumbSchema, graph } from '@/components/common/SEO'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { LEGAL_DOCS, LEGAL_ORDER, POLICY_UPDATED } from '@/data/legal'
import { ROUTES } from '@/constants/routes'
import './legalPage.css'

/**
 * The policy pages — /privacy, /terms, /cookies.
 *
 * ONE component for all three, driven by data/legal.js, for the same reason
 * SystemPage is one component for seven systems: the three documents differ
 * by their words and by nothing else. A second copy of this layout is a
 * second place for the "last updated" line to go stale.
 *
 * ⚠ THE CONTACT BLOCK READS SITE SETTINGS, it does not repeat the address.
 * A privacy notice naming an email address nobody reads any more is not a
 * cosmetic problem — it is the address a data-erasure request goes to. It
 * comes from the same source as the footer's, so changing it in the admin
 * panel changes it here.
 *
 * ⚠ INDEXED, NOT `noindex`. A policy page is thin and nobody links to it,
 * which tempts you to hide it; do not. Meta and Google both check that the
 * URL a lead form points at actually resolves and is crawlable, and a
 * `noindex` privacy policy has failed ad review before.
 *
 * The trail is built ONCE and passed to both <Breadcrumbs> and
 * breadcrumbSchema, so the visible steps and the marked-up ones cannot
 * disagree — see the note in Breadcrumbs.jsx for why that matters here.
 */
export default function LegalPage({ doc }) {
  const policy = LEGAL_DOCS[doc]
  const { settings } = useSiteSettings()

  // Every route that renders this component names a key that exists; the
  // guard is for the case where one is renamed in data/legal.js and a route
  // is missed, which should be a blank section rather than a crash.
  if (!policy) return null

  const others = LEGAL_ORDER.filter((key) => key !== doc).map((key) => LEGAL_DOCS[key])

  const trail = [
    { name: 'Home', path: ROUTES.HOME },
    { name: policy.nav, path: policy.path },
  ]

  return (
    <main className="lgl" id="top">
      <SEO
        title={policy.title}
        description={policy.description}
        path={policy.path}
        schema={graph([
          {
            '@type': 'WebPage',
            '@id': `${absoluteUrl(policy.path)}#webpage`,
            name: policy.nav,
            description: policy.description,
            url: absoluteUrl(policy.path),
            /* `dateModified` is the same string the page prints, parsed to
               the ISO form a crawler wants. A policy whose visible date and
               machine-readable date disagree is a policy nobody maintains. */
            dateModified: isoDate(POLICY_UPDATED),
            publisher: { '@id': ORGANIZATION_ID },
            about: { '@id': ORGANIZATION_ID },
          },
          breadcrumbSchema(trail),
        ])}
      />

      <div className="lgl__inner">
        <Breadcrumbs trail={trail} className="lgl__crumbs" />

        <header className="lgl__head">
          <p className="lgl__eyebrow">Legal</p>
          <h1 className="lgl__title">
            {policy.heading.lead} <em>{policy.heading.em}</em>
          </h1>
          <p className="lgl__standfirst">{policy.standfirst}</p>
          <p className="lgl__updated">Last updated {POLICY_UPDATED}</p>
        </header>

        {/* A contents list rather than a wall. These documents are read by
            someone looking for one clause — "how long do you keep it" — not
            front to back, and the anchors make that clause linkable. */}
        <nav className="lgl__toc" aria-label="On this page">
          <p className="lgl__toc-title">On this page</p>
          <ol className="lgl__toc-list">
            {policy.sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="lgl__body">
          {policy.sections.map((section, i) => (
            <section className="lgl__section" id={section.id} key={section.id}>
              <h2 className="lgl__h2">
                <span className="lgl__num">{String(i + 1).padStart(2, '0')}</span>
                {section.heading}
              </h2>

              {(section.body || []).map((para) => (
                <p key={para.slice(0, 48)}>{para}</p>
              ))}

              {(section.groups || []).map((group) => (
                <div className="lgl__group" key={group.title}>
                  <h3 className="lgl__h3">{group.title}</h3>
                  {group.body.map((para) => (
                    <p key={para.slice(0, 48)}>{para}</p>
                  ))}
                </div>
              ))}

              {section.list ? (
                <ul className="lgl__list">
                  {section.list.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {section.table ? (
                /* The scroller is the wrapper, not the table: a four-column
                   table cannot be made to fit 360px without either shrinking
                   the type below readable or breaking the page's own width,
                   and the brief on every other section of this site is that
                   the page never scrolls sideways. */
                <div className="lgl__table-wrap" tabIndex="0" role="region" aria-label={section.heading}>
                  <table className="lgl__table">
                    <thead>
                      <tr>
                        {section.table.columns.map((column) => (
                          <th scope="col" key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row[0]}>
                          <th scope="row"><code>{row[0]}</code></th>
                          {row.slice(1).map((cell, ci) => (
                            <td key={section.table.columns[ci + 1]}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {(section.after || []).map((para) => (
                <p key={para.slice(0, 48)}>{para}</p>
              ))}
            </section>
          ))}
        </div>

        {/* ── Contact + the other two policies ────────────────────
            Internal links, and the reason this page is not a dead end: a
            visitor who has just read how to have their data erased needs the
            address to write to, and a crawler that landed here needs a way
            back into the site. */}
        <aside className="lgl__foot">
          <div className="lgl__contact">
            <h2 className="lgl__foot-title">Contact us about this</h2>
            <p className="lgl__foot-copy">
              Write to us and we will answer. For anything about your personal
              data, put &ldquo;Data request&rdquo; in the subject line.
            </p>
            <ul className="lgl__contact-list">
              {settings.contact_email && (
                <li>
                  <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                </li>
              )}
              {settings.contact_phone && (
                <li>
                  <a href={`tel:${settings.contact_phone.replace(/[^\d+]/g, '')}`}>
                    {settings.contact_phone}
                  </a>
                </li>
              )}
              {settings.address && (
                <li className="lgl__address">
                  {settings.address.split('\n').map((line) => (
                    <span key={line}>{line.trim()}</span>
                  ))}
                </li>
              )}
            </ul>
            <Link className="lgl__foot-cta" to={ROUTES.CONTACT}>
              Contact page<span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>

          <nav className="lgl__others" aria-label="Other policies">
            <h2 className="lgl__foot-title">The other policies</h2>
            <ul className="lgl__others-list">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link to={other.path}>
                    <span className="lgl__others-name">{other.nav}</span>
                    <span className="lgl__others-desc">{other.standfirst}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </main>
  )
}

/**
 * "10 August 2026" → "2026-08-10".
 *
 * The human string is the authored one because it is what the page prints;
 * this derives the machine form from it rather than asking whoever edits the
 * date to keep two in step. An unparseable string yields no `dateModified`
 * at all, which is better than an invalid one in the graph.
 */
function isoDate(human) {
  const parsed = new Date(`${human} UTC`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10)
}
