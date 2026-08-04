import { useEffect, useState } from 'react'
import { blogApi } from '@/services/blog'
import { formatDate } from '@/utils/format'

/**
 * Approved comments plus the submission form.
 *
 * `enabled` is the per-article toggle from the editor. When it is off the
 * whole section is absent — not a disabled form, which would invite someone
 * to write a comment before discovering they cannot post it.
 *
 * Nothing submitted here appears immediately. The server stores every comment
 * as `pending` and it stays invisible until a moderator approves it in the
 * admin panel, so the confirmation message says exactly that rather than
 * implying the comment is live.
 */
export default function CommentThread({ slug, enabled }) {
  const [comments, setComments] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', body: '', website: '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()
    blogApi
      .listComments(slug, controller.signal)
      .then((data) => setComments(data.results || []))
      .catch(() => {})
      .finally(() => setLoaded(true))

    return () => controller.abort()
  }, [slug, enabled])

  if (!enabled) return null

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setStatus('sending')
    setError('')

    try {
      await blogApi.addComment(slug, form)
      setStatus('sent')
      setForm({ name: '', email: '', body: '', website: '' })
    } catch (err) {
      setStatus('idle')
      // DRF returns per-field arrays; surface the first one rather than a
      // generic "something went wrong" the reader cannot act on.
      const first = err.fields && Object.values(err.fields)[0]
      setError(Array.isArray(first) ? first[0] : err.message)
    }
  }

  return (
    <section className="bl-comments" aria-labelledby="bl-comments-title">
      <p className="bl-eyebrow" id="bl-comments-title">
        {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
      </p>

      {loaded && comments.length === 0 && (
        <p className="bl-formnote" style={{ marginTop: '1rem' }}>
          No comments yet. Start the conversation.
        </p>
      )}

      {comments.map((comment) => (
        <article key={comment.id} className="bl-comment">
          <div className="bl-comment__head">
            <span className="bl-comment__name">{comment.name}</span>
            <span className="bl-comment__date">{formatDate(comment.created_at)}</span>
          </div>
          {/* Rendered as text, never as HTML. Comment bodies are reader input
              and the model stores them as plain text for exactly this reason. */}
          <p className="bl-comment__body">{comment.body}</p>
        </article>
      ))}

      {status === 'sent' ? (
        <p className="bl-formnote bl-formnote--ok" style={{ marginTop: '2rem' }} role="status">
          Thank you. Your comment will appear once it has been reviewed.
        </p>
      ) : (
        <form className="bl-form" onSubmit={submit} noValidate>
          <div className="bl-form__row">
            <div className="bl-field">
              <label htmlFor="bl-c-name">Name</label>
              <input
                id="bl-c-name"
                required
                value={form.name}
                onChange={update('name')}
                autoComplete="name"
              />
            </div>
            <div className="bl-field">
              <label htmlFor="bl-c-email">Email</label>
              <input
                id="bl-c-email"
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                autoComplete="email"
              />
              <p className="bl-formnote" style={{ marginTop: '0.4rem', fontSize: '0.78rem' }}>
                Never published.
              </p>
            </div>
          </div>

          <div className="bl-field">
            <label htmlFor="bl-c-body">Comment</label>
            <textarea id="bl-c-body" required value={form.body} onChange={update('body')} />
          </div>

          {/* Honeypot — see .bl-honeypot in blog.css. Hidden from people,
              filled in by naive bots, which the server files as spam. */}
          <div className="bl-honeypot" aria-hidden="true">
            <label htmlFor="bl-c-website">Website</label>
            <input
              id="bl-c-website"
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={update('website')}
            />
          </div>

          {error && (
            <p className="bl-formnote bl-formnote--error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="bl-submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Post comment'}
          </button>
        </form>
      )}
    </section>
  )
}
