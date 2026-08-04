import { useEffect, useState } from 'react'
import { adminApi } from '@/services/admin'
import { BarChart } from '@/components/admin/Chart'
import { Card, Empty, Loading, Stat } from '@/components/admin/ui'
import { formatDateTime, formatDuration, formatRelative } from '@/utils/format'
import { PageHead } from './AdminLayout'

const RANGES = [7, 30, 90, 365]

/**
 * Per-page analytics.
 *
 * Answers the question the dashboard's top-ten deliberately does not: how
 * many distinct pages the site has, and how every one of them performed —
 * including the long tail that never reaches a top-ten list.
 */
export default function Analytics() {
  const [days, setDays] = useState(30)
  const [report, setReport] = useState(null)
  const [summary, setSummary] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')

    Promise.all([
      adminApi.pagesReport(days, controller.signal),
      adminApi.dashboard(days, controller.signal),
    ])
      .then(([pages, dash]) => {
        setReport(pages)
        setSummary(dash)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })

    return () => controller.abort()
  }, [days])

  if (state === 'loading') return <><PageHead title="Analytics" /><Loading rows={8} /></>
  if (state === 'failed') {
    return (
      <>
        <PageHead title="Analytics" />
        <Empty title="Could not load the report">The server did not respond.</Empty>
      </>
    )
  }

  const totalViews = report.results.reduce((sum, row) => sum + row.views, 0)

  return (
    <>
      <PageHead
        title="Analytics"
        subtitle={`${report.page_count} distinct page${report.page_count === 1 ? '' : 's'} visited in the last ${days} days`}
      >
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            className={`ad-btn ad-btn--sm${days === range ? ' ad-btn--primary' : ''}`}
            onClick={() => setDays(range)}
            aria-pressed={days === range}
          >
            {range === 365 ? '12 months' : `${range} days`}
          </button>
        ))}
      </PageHead>

      <div className="ad-grid ad-grid--4" style={{ marginBottom: '24px' }}>
        <Stat label="Pages visited" value={report.page_count} change={null} />
        <Stat label="Total views" value={totalViews} change={summary.totals.views_change} />
        <Stat label="Unique visitors" value={summary.totals.visitors} change={summary.totals.visitors_change} />
        <Stat label="Avg. time on page" value={formatDuration(summary.totals.avg_duration_ms)} change={null} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Card title="Daily views" hint={`Across the last ${days} days`}>
          <BarChart series={summary.series} valueKey="views" label="views" />
        </Card>
      </div>

      <Card
        title="Every page"
        hint="Sorted by views. Admin routes are never tracked."
        bodyless
      >
        {report.results.length === 0 ? (
          <div className="ad-card__body">
            <p className="ad-field__hint">
              No page views recorded yet. The beacon fires on every public route
              once someone visits the site.
            </p>
          </div>
        ) : (
          <div className="ad-table-wrap" style={{ border: 'none' }}>
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">Path</th>
                  <th scope="col" className="ad-table__num">Views</th>
                  <th scope="col" className="ad-table__num">Visitors</th>
                  <th scope="col" className="ad-table__num">Avg. time</th>
                  <th scope="col" className="ad-table__num">Share</th>
                  <th scope="col">Last visit</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((row) => (
                  <tr key={row.path}>
                    <td><span className="ad-table__title">{row.path}</span></td>
                    <td className="ad-table__num">{row.views.toLocaleString()}</td>
                    <td className="ad-table__num">{row.visitors.toLocaleString()}</td>
                    <td className="ad-table__num">{formatDuration(row.avg_duration)}</td>
                    <td className="ad-table__num" style={{ minWidth: '120px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="ad-bar__track" style={{ flex: 1 }}>
                          <span
                            className="ad-bar__fill"
                            style={{ width: `${totalViews ? (row.views / totalViews) * 100 : 0}%` }}
                          />
                        </span>
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>
                          {totalViews ? Math.round((row.views / totalViews) * 100) : 0}%
                        </span>
                      </span>
                    </td>
                    <td className="ad-table__num" style={{ fontSize: '12px', opacity: 0.7 }}>
                      {formatRelative(row.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="ad-field__hint" style={{ marginTop: '16px', maxWidth: '70ch' }}>
        These figures come from the site&rsquo;s own first-party tracking. No cookie is set and
        no IP address is stored — a visitor is counted through a daily-rotating keyed hash, so
        the numbers are accurate within a day and carry nothing that identifies anyone across days.
        {summary.content.total_page_views_all_time > 0 && (
          <> {summary.content.total_page_views_all_time.toLocaleString()} page views recorded all time.</>
        )}
      </p>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════ */

/**
 * Security log — login attempts and the audit trail.
 *
 * Read-only by design and by API: there is no edit or delete path for either
 * model. An audit trail someone can quietly rewrite is not evidence of
 * anything.
 */
export function SecurityLog() {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')
  const [tab, setTab] = useState('audit')

  useEffect(() => {
    const controller = new AbortController()
    adminApi
      .securityReport(controller.signal)
      .then((result) => {
        setData(result)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
    return () => controller.abort()
  }, [])

  if (state === 'loading') return <><PageHead title="Security log" /><Loading rows={6} /></>
  if (state === 'failed') {
    return (
      <>
        <PageHead title="Security log" />
        <Empty title="Could not load the security log" />
      </>
    )
  }

  const failed = data.attempts.filter((a) => !a.successful).length

  return (
    <>
      <PageHead
        title="Security log"
        subtitle={`Last 7 days · ${data.attempts.length} sign-in attempts, ${failed} failed`}
      />

      <div className="ad-tabs">
        <button
          type="button"
          className={`ad-tab${tab === 'audit' ? ' is-active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit trail
        </button>
        <button
          type="button"
          className={`ad-tab${tab === 'attempts' ? ' is-active' : ''}`}
          onClick={() => setTab('attempts')}
        >
          Sign-in attempts
        </button>
      </div>

      {tab === 'audit' ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Target</th>
                <th scope="col">From</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.length === 0 && (
                <tr><td colSpan={5}>Nothing recorded yet.</td></tr>
              )}
              {data.audit.map((entry, index) => (
                <tr key={index}>
                  <td className="ad-table__num" style={{ fontSize: '12px' }}>
                    {formatDateTime(entry.created_at)}
                  </td>
                  <td>{entry.actor_email || '—'}</td>
                  <td><span className="ad-table__title">{entry.action}</span></td>
                  <td style={{ overflowWrap: 'anywhere' }}>{entry.target || '—'}</td>
                  <td className="ad-table__num" style={{ fontSize: '12px', opacity: 0.7 }}>
                    {entry.ip_address || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Email tried</th>
                <th scope="col">From</th>
                <th scope="col">Result</th>
                <th scope="col">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.attempts.length === 0 && (
                <tr><td colSpan={5}>No sign-in attempts in the last 7 days.</td></tr>
              )}
              {data.attempts.map((attempt, index) => (
                <tr key={index}>
                  <td className="ad-table__num" style={{ fontSize: '12px' }}>
                    {formatDateTime(attempt.created_at)}
                  </td>
                  <td style={{ overflowWrap: 'anywhere' }}>{attempt.email}</td>
                  <td className="ad-table__num" style={{ fontSize: '12px' }}>{attempt.ip_address}</td>
                  <td>
                    <span className={`ad-pill ad-pill--${attempt.successful ? 'approved' : 'spam'}`}>
                      {attempt.successful ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', opacity: 0.75 }}>{attempt.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="ad-field__hint" style={{ marginTop: '16px', maxWidth: '72ch' }}>
        Failed attempts are recorded against the submitted address even when no such account
        exists — skipping those would turn the lockout into an account oracle. An account locks
        after 5 failures and an IP after 20, with each consecutive lockout doubling the wait.
        To release a lockout early, delete the row in Django admin under Account &rsaquo; Login lockouts.
      </p>
    </>
  )
}
