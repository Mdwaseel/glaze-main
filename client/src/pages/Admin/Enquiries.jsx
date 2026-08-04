import { Fragment, useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Empty, Loading, Pill } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { formatDateTime } from '@/utils/format'
import { PageHead } from './AdminLayout'

const TABS = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'closed', label: 'Closed' },
  { value: 'spam', label: 'Spam' },
  { value: '', label: 'All' },
]

/**
 * Where the enquiry came from — the same split the recipient settings are
 * organised by, so "show me the product enquiries" is the same idea in both
 * screens.
 *
 * Distinct from `enquiry_type`, which is the visitor's own answer to "what
 * are you building?" (Villa, Commercial …). This one is derived from the page
 * they submitted from and is what decided which inbox the email went to.
 */
const CATEGORIES = [
  { value: '', label: 'All sources' },
  { value: 'contact', label: 'Contact form' },
  { value: 'product', label: 'Product page' },
  { value: 'general', label: 'General' },
]

const CATEGORY_LABELS = {
  contact: 'Contact form',
  product: 'Product page',
  general: 'General',
}

/**
 * The enquiry inbox.
 *
 * Every contact-form submission is stored here as well as emailed. Email is a
 * delivery channel, not a record: it gets filtered, forwarded and deleted, and
 * once it is gone there is no trace the enquiry ever arrived. These rows are
 * the source of truth and are what the dashboard's enquiry count reads.
 *
 * `notified_at` / `auto_replied_at` are surfaced deliberately. A blank there
 * means the email never went out — usually SMTP misconfiguration — and
 * without it that failure would be invisible until a customer complained
 * about being ignored.
 */
export default function Enquiries() {
  const [status, setStatus] = useState('new')
  const [category, setCategory] = useState('')
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [openId, setOpenId] = useState(null)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listEnquiries({ status, category }, signal)
      .then((data) => {
        setItems(data.results || [])
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [status, category])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const setEnquiryStatus = async (id, next) => {
    try {
      await adminApi.updateEnquiry(id, { status: next })
      toast.success('Enquiry updated.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <>
      <PageHead title="Enquiry inbox" subtitle="Every contact form submission, stored and searchable" />

      <div className="ad-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            type="button"
            className={`ad-tab${status === tab.value ? ' is-active' : ''}`}
            onClick={() => setStatus(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Source filter. A second row of tabs rather than a second tab strip:
          status is the workflow (what have I dealt with) and source is the
          routing (whose desk is this), and they are filtered together. */}
      <div className="ad-tabs" style={{ marginTop: '-8px' }}>
        {CATEGORIES.map((option) => (
          <button
            key={option.value || 'all-sources'}
            type="button"
            className={`ad-tab${category === option.value ? ' is-active' : ''}`}
            onClick={() => setCategory(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {state === 'loading' && <Loading rows={4} />}
      {state === 'failed' && <Empty title="Could not load enquiries" />}

      {state === 'ready' && items.length === 0 && (
        <Empty title={status === 'new' ? 'No new enquiries' : 'Nothing here'}>
          Submissions from the contact form and the system pages arrive here.
        </Empty>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">Source</th>
                <th scope="col">Interest</th>
                <th scope="col">Received</th>
                <th scope="col">Email sent</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="ad-table__actions">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((enquiry) => (
                /* Fragment, not <>, because the key has to live on the
                   wrapper — a row and its expandable detail row are two
                   siblings that belong to one item. */
                <Fragment key={enquiry.id}>
                  <tr>
                    <td>
                      <span className="ad-table__title">{enquiry.name}</span>
                      <p className="ad-table__sub">
                        {enquiry.email && (
                          <a href={`mailto:${enquiry.email}`}>{enquiry.email}</a>
                        )}
                        {enquiry.email && enquiry.phone && ' · '}
                        {enquiry.phone && <a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a>}
                      </p>
                    </td>
                    <td>
                      <Pill status="draft">
                        {CATEGORY_LABELS[enquiry.category] || enquiry.category || 'General'}
                      </Pill>
                    </td>
                    <td>
                      {enquiry.system || enquiry.enquiry_type || '—'}
                      {enquiry.variant && <p className="ad-table__sub">{enquiry.variant}</p>}
                    </td>
                    <td className="ad-table__num" style={{ fontSize: '12px' }}>
                      {formatDateTime(enquiry.created_at)}
                    </td>
                    <td>
                      {enquiry.notified_at ? (
                        <Pill status="approved">Sent</Pill>
                      ) : (
                        <Pill status="pending">Not sent</Pill>
                      )}
                    </td>
                    <td><Pill status={enquiry.status === 'new' ? 'new' : enquiry.status === 'spam' ? 'spam' : 'draft'}>{enquiry.status.replace('_', ' ')}</Pill></td>
                    <td>
                      <div className="ad-table__actions">
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--ghost"
                          onClick={() => setOpenId(openId === enquiry.id ? null : enquiry.id)}
                          aria-expanded={openId === enquiry.id}
                        >
                          <Icon name="eye" size={13} />
                          {openId === enquiry.id ? 'Hide' : 'Read'}
                        </button>
                        <select
                          className="ad-select"
                          style={{ width: 'auto', minHeight: '30px', padding: '2px 8px', fontSize: '12px' }}
                          value={enquiry.status}
                          onChange={(event) => setEnquiryStatus(enquiry.id, event.target.value)}
                          aria-label={`Status for enquiry from ${enquiry.name}`}
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In progress</option>
                          <option value="closed">Closed</option>
                          <option value="spam">Spam</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                  {openId === enquiry.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'rgba(27,27,27,0.02)' }}>
                        <p className="ad-card__title" style={{ marginBottom: '8px' }}>Message</p>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, maxWidth: '70ch' }}>
                          {enquiry.message || 'No message was written.'}
                        </p>
                        <p className="ad-field__hint" style={{ marginTop: '12px' }}>
                          Submitted from {enquiry.source_path || 'an unknown page'}
                          {enquiry.ip_address && ` · ${enquiry.ip_address}`}
                          {enquiry.auto_replied_at
                            ? ` · auto-reply sent ${formatDateTime(enquiry.auto_replied_at)}`
                            : ' · no auto-reply sent'}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
