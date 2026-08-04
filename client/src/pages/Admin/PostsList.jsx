import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminApi } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Empty, Loading, Pill } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { formatDate, formatRelative } from '@/utils/format'
import { PageHead } from './AdminLayout'

const STATUSES = ['', 'published', 'draft', 'scheduled', 'archived']

/**
 * Article list — the blog centre's home.
 *
 * Filters live in the URL so a filtered view can be bookmarked and the back
 * button steps through them, matching the public listing's behaviour.
 */
export default function PostsList() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const search = params.get('search') || ''

  const [posts, setPosts] = useState([])
  const [state, setState] = useState('loading')
  const [busyId, setBusyId] = useState(null)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listPosts({ status, search }, signal)
      .then((data) => {
        setPosts(data.results || [])
        setState('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState('failed')
      })
  }, [status, search])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const setFilter = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })
  }

  const act = async (id, action, message) => {
    setBusyId(id)
    try {
      await action()
      toast.success(message)
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = (post) => {
    // A native confirm rather than a custom modal. Deleting an article is
    // irreversible and rare; the browser dialog is unmissable, keyboard
    // accessible for free, and cannot be dismissed by a stray click.
    if (!window.confirm(`Delete “${post.title}” permanently? This cannot be undone.`)) return
    act(post.id, () => adminApi.deletePost(post.id), 'Article deleted.')
  }

  return (
    <>
      <PageHead title="Articles" subtitle="Write, schedule and publish to the journal">
        <Link to="/admin/posts/new" className="ad-btn ad-btn--primary">
          <Icon name="plus" size={14} /> New article
        </Link>
      </PageHead>

      <div className="ad-tabs">
        {STATUSES.map((value) => (
          <button
            key={value || 'all'}
            type="button"
            className={`ad-tab${status === value ? ' is-active' : ''}`}
            onClick={() => setFilter('status', value)}
          >
            {value || 'All'}
          </button>
        ))}
        <input
          type="search"
          className="ad-input"
          style={{ width: 'auto', minWidth: '200px', marginLeft: 'auto', alignSelf: 'center' }}
          placeholder="Search titles…"
          defaultValue={search}
          onKeyDown={(event) => {
            if (event.key === 'Enter') setFilter('search', event.currentTarget.value)
          }}
          aria-label="Search articles"
        />
      </div>

      {state === 'loading' && <Loading rows={5} />}

      {state === 'failed' && (
        <Empty title="Could not load articles">The server did not respond.</Empty>
      )}

      {state === 'ready' && posts.length === 0 && (
        <Empty
          title={status || search ? 'No articles match' : 'No articles yet'}
          action={
            <Link to="/admin/posts/new" className="ad-btn ad-btn--primary">
              <Icon name="plus" size={14} /> Write the first one
            </Link>
          }
        >
          {status || search
            ? 'Try a different filter.'
            : 'Everything you publish here appears on the public journal at /blog.'}
        </Empty>
      )}

      {state === 'ready' && posts.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Article</th>
                <th scope="col">Status</th>
                <th scope="col">Category</th>
                <th scope="col">Author</th>
                <th scope="col" className="ad-table__num">Views</th>
                <th scope="col">Updated</th>
                <th scope="col"><span className="ad-table__actions">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={busyId === post.id ? { opacity: 0.5 } : undefined}>
                  <td>
                    <Link to={`/admin/posts/${post.id}`} className="ad-table__title">
                      {post.title}
                    </Link>
                    {post.is_featured && <> <Pill status="featured">Featured</Pill></>}
                    <p className="ad-table__sub">
                      /blog/{post.slug} · {post.reading_time} min
                      {post.published_at && ` · ${formatDate(post.published_at)}`}
                    </p>
                  </td>
                  <td><Pill status={post.status}>{post.status}</Pill></td>
                  <td>{post.category_detail?.name || '—'}</td>
                  <td>{post.author_detail?.name || '—'}</td>
                  <td className="ad-table__num">{post.view_count.toLocaleString()}</td>
                  <td className="ad-table__num" style={{ fontSize: '12px', opacity: 0.7 }}>
                    {formatRelative(post.updated_at)}
                  </td>
                  <td>
                    <div className="ad-table__actions">
                      {post.status === 'published' ? (
                        <>
                          <Link
                            to={`/blog/${post.slug}`}
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            title="View on the site"
                          >
                            <Icon name="eye" size={13} />
                          </Link>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm"
                            disabled={busyId === post.id}
                            onClick={() => act(post.id, () => adminApi.unpublishPost(post.id), 'Moved to draft.')}
                          >
                            Unpublish
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm"
                          disabled={busyId === post.id}
                          onClick={() => act(post.id, () => adminApi.publishPost(post.id), 'Article published.')}
                        >
                          Publish
                        </button>
                      )}
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        title="Duplicate as a draft"
                        disabled={busyId === post.id}
                        onClick={() => act(post.id, () => adminApi.duplicatePost(post.id), 'Duplicated as a draft.')}
                      >
                        <Icon name="copy" size={13} />
                      </button>
                      <Link
                        to={`/admin/posts/${post.id}`}
                        className="ad-btn ad-btn--sm ad-btn--ghost"
                        title="Edit"
                      >
                        <Icon name="edit" size={13} />
                      </Link>
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--danger"
                        title="Delete"
                        disabled={busyId === post.id}
                        onClick={() => remove(post)}
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
