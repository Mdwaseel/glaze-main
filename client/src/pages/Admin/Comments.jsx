import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Empty, Loading, Pill } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { formatDateTime } from '@/utils/format'
import { PageHead } from './AdminLayout'

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'spam', label: 'Spam' },
  { value: '', label: 'All' },
]

/**
 * Comment moderation queue.
 *
 * Opens on `pending` rather than `all`, because the only reason to visit this
 * screen is to clear the queue. Nothing a reader submits is visible on the
 * site until it is approved here.
 */
export default function Comments() {
  const [status, setStatus] = useState('pending')
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [busyId, setBusyId] = useState(null)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listComments({ status }, signal)
      .then((data) => {
        setItems(data.results || data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [status])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const moderate = async (id, next, message) => {
    setBusyId(id)
    try {
      await adminApi.moderateComment(id, next)
      toast.success(message)
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (comment) => {
    if (!window.confirm(`Delete this comment from ${comment.name} permanently?`)) return
    setBusyId(comment.id)
    try {
      await adminApi.deleteComment(comment.id)
      toast.success('Comment deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHead
        title="Comments"
        subtitle="Nothing appears on the site until you approve it"
      />

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

      {state === 'loading' && <Loading rows={4} />}
      {state === 'failed' && <Empty title="Could not load comments" />}

      {state === 'ready' && items.length === 0 && (
        <Empty title={status === 'pending' ? 'Nothing waiting' : 'No comments here'}>
          {status === 'pending'
            ? 'The moderation queue is clear.'
            : 'Comments will show up here as readers post them.'}
        </Empty>
      )}

      {state === 'ready' && items.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Comment</th>
                <th scope="col">Article</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="ad-table__actions">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((comment) => (
                <tr key={comment.id} style={busyId === comment.id ? { opacity: 0.5 } : undefined}>
                  <td style={{ maxWidth: '440px' }}>
                    <span className="ad-table__title">{comment.name}</span>
                    <p className="ad-table__sub">
                      {comment.email} · {formatDateTime(comment.created_at)}
                      {comment.ip_address && ` · ${comment.ip_address}`}
                    </p>
                    {/* Rendered as text. Comment bodies are reader input and
                        are never treated as markup, here or on the site. */}
                    <p style={{ marginTop: '8px', lineHeight: 1.65, overflowWrap: 'anywhere' }}>
                      {comment.body}
                    </p>
                  </td>
                  <td>
                    <Link to={`/blog/${comment.post_slug}`} className="ad-table__title">
                      {comment.post_title}
                    </Link>
                  </td>
                  <td><Pill status={comment.status}>{comment.status}</Pill></td>
                  <td>
                    <div className="ad-table__actions">
                      {comment.status !== 'approved' && (
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm"
                          disabled={busyId === comment.id}
                          onClick={() => moderate(comment.id, 'approved', 'Comment approved and now live.')}
                        >
                          <Icon name="check" size={13} /> Approve
                        </button>
                      )}
                      {comment.status !== 'spam' && (
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm"
                          disabled={busyId === comment.id}
                          onClick={() => moderate(comment.id, 'spam', 'Marked as spam.')}
                        >
                          Spam
                        </button>
                      )}
                      {comment.status === 'approved' && (
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm"
                          disabled={busyId === comment.id}
                          onClick={() => moderate(comment.id, 'pending', 'Hidden from the site.')}
                        >
                          Unapprove
                        </button>
                      )}
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--danger"
                        disabled={busyId === comment.id}
                        onClick={() => remove(comment)}
                        aria-label="Delete comment"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
