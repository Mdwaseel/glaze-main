import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import { BarChart, ProportionBars } from '@/components/admin/Chart'
import { Card, Empty, Loading, Stat } from '@/components/admin/ui'
import { formatDuration, formatRelative } from '@/utils/format'
import Icon from '@/components/admin/Icon'
import { PageHead } from './AdminLayout'

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
]

/**
 * The overview screen.
 *
 * Ordered by how often a question gets asked, not by how impressive the
 * widget looks: the four headline numbers first, then the traffic shape, then
 * what needs a decision (pending comments, new enquiries), then the detail.
 */
export default function Dashboard() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    setState('loading')

    adminApi
      .dashboard(days, controller.signal)
      .then((result) => {
        setData(result)
        setState('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState('failed')
      })

    return () => controller.abort()
  }, [days])

  if (state === 'loading') {
    return (
      <>
        <PageHead title="Dashboard" subtitle="Traffic, content and enquiries at a glance" />
        <Loading rows={6} />
      </>
    )
  }

  if (state === 'failed') {
    return (
      <>
        <PageHead title="Dashboard" />
        <Empty title="Could not load analytics">
          The server did not respond. Check that the Django API is running.
        </Empty>
      </>
    )
  }

  const { totals, content, series, top_pages, top_posts, devices, referrers, security } = data

  const deviceItems = [
    { label: 'Desktop', value: devices.desktop },
    { label: 'Mobile', value: devices.mobile },
    { label: 'Tablet', value: devices.tablet },
  ].filter((item) => item.value > 0)

  return (
    <>
      <PageHead title="Dashboard" subtitle={`Last ${days} days · ${content.total_page_views_all_time.toLocaleString()} page views all time`}>
        {RANGES.map((range) => (
          <button
            key={range.days}
            type="button"
            className={`ad-btn ad-btn--sm${days === range.days ? ' ad-btn--primary' : ''}`}
            onClick={() => setDays(range.days)}
            aria-pressed={days === range.days}
          >
            {range.label}
          </button>
        ))}
      </PageHead>

      <div className="ad-grid ad-grid--4" style={{ marginBottom: '24px' }}>
        <Stat label="Page views" value={totals.views} change={totals.views_change} />
        <Stat label="Unique visitors" value={totals.visitors} change={totals.visitors_change} />
        <Stat label="Enquiries" value={totals.enquiries} change={totals.enquiries_change} />
        <Stat label="Avg. time on page" value={formatDuration(totals.avg_duration_ms)} change={null} />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Card title="Traffic" hint={`Daily page views across the last ${days} days`}>
          <BarChart series={series} valueKey="views" label="views" />
        </Card>
      </div>

      {/* Things waiting on a person. Shown only when there is something to
          act on — a permanent row of zeroes trains people to ignore it. */}
      {(content.comments_pending > 0 || content.enquiries_new > 0 || content.posts_scheduled > 0) && (
        <div className="ad-grid ad-grid--4" style={{ marginBottom: '24px' }}>
          {content.enquiries_new > 0 && (
            <ActionTile
              to="/admin/enquiries"
              icon="inbox"
              count={content.enquiries_new}
              label={`new ${content.enquiries_new === 1 ? 'enquiry' : 'enquiries'}`}
            />
          )}
          {content.comments_pending > 0 && (
            <ActionTile
              to="/admin/comments"
              icon="comments"
              count={content.comments_pending}
              label={`comment${content.comments_pending === 1 ? '' : 's'} awaiting review`}
            />
          )}
          {content.posts_scheduled > 0 && (
            <ActionTile
              to="/admin/posts?status=scheduled"
              icon="posts"
              count={content.posts_scheduled}
              label={`article${content.posts_scheduled === 1 ? '' : 's'} scheduled`}
            />
          )}
        </div>
      )}

      <div className="ad-grid ad-grid--2" style={{ marginBottom: '24px' }}>
        <Card title="Top pages" hint="By views in the selected period">
          <ProportionBars
            items={top_pages.map((page) => ({ label: page.path, value: page.views }))}
          />
        </Card>

        <Card title="Devices" hint="How visitors reached the site">
          <ProportionBars items={deviceItems} />
        </Card>
      </div>

      <div className="ad-grid ad-grid--2" style={{ marginBottom: '24px' }}>
        <Card title="Most-read articles" hint="All-time views">
          {top_posts.length === 0 ? (
            <p className="ad-field__hint">No published articles yet.</p>
          ) : (
            <div className="ad-bars">
              {top_posts.map((post) => (
                <div key={post.slug}>
                  <div className="ad-bar__head">
                    <Link className="ad-bar__label" to={`/blog/${post.slug}`} title={post.title}>
                      {post.title}
                    </Link>
                    <span className="ad-bar__value">{post.view_count.toLocaleString()}</span>
                  </div>
                  <div className="ad-bar__track">
                    <span
                      className="ad-bar__fill"
                      style={{
                        width: `${(post.view_count / Math.max(...top_posts.map((p) => p.view_count), 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Referrers" hint="External sources only — internal links are excluded">
          <ProportionBars
            items={referrers.map((row) => ({ label: row.referrer, value: row.count }))}
          />
        </Card>
      </div>

      <div className="ad-grid ad-grid--2">
        <Card title="Content" hint="Everything in the blog centre">
          <div className="ad-bars">
            <CountRow label="Published" value={content.posts_published} to="/admin/posts?status=published" />
            <CountRow label="Drafts" value={content.posts_draft} to="/admin/posts?status=draft" />
            <CountRow label="Scheduled" value={content.posts_scheduled} to="/admin/posts?status=scheduled" />
            <CountRow label="Comments pending" value={content.comments_pending} to="/admin/comments" />
          </div>
        </Card>

        <Card
          title="Recent activity"
          hint="Every privileged action is recorded"
          actions={<Link className="ad-btn ad-btn--sm" to="/admin/security">Full log</Link>}
        >
          {data.recent_activity.length === 0 ? (
            <p className="ad-field__hint">Nothing recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {data.recent_activity.slice(0, 8).map((entry, index) => (
                <div key={index} className="ad-bar__head" style={{ marginBottom: 0 }}>
                  <span className="ad-bar__label">
                    <strong style={{ fontWeight: 600 }}>{entry.action}</strong>
                    {entry.target && <span style={{ opacity: 0.65 }}> · {entry.target}</span>}
                  </span>
                  <span className="ad-bar__value">{formatRelative(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
          <p className="ad-field__hint" style={{ marginTop: '16px' }}>
            {security.failed_logins_24h} failed and {security.successful_logins_24h} successful
            sign-ins in the last 24 hours.
          </p>
        </Card>
      </div>
    </>
  )
}

function ActionTile({ to, icon, count, label }) {
  return (
    <Link to={to} className="ad-stat" style={{ display: 'block' }}>
      <p className="ad-stat__label">
        <Icon name={icon} size={11} style={{ verticalAlign: '-1px', marginRight: '4px' }} />
        Needs attention
      </p>
      <p className="ad-stat__value">{count}</p>
      <span className="ad-stat__trend ad-stat__trend--flat">{label} →</span>
    </Link>
  )
}

function CountRow({ label, value, to }) {
  return (
    <div className="ad-bar__head" style={{ marginBottom: 0 }}>
      <Link className="ad-bar__label" to={to}>{label}</Link>
      <span className="ad-bar__value">{value}</span>
    </div>
  )
}
