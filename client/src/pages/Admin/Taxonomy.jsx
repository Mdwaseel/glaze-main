import { useCallback, useEffect, useState } from 'react'
import { adminApi, toRequestBody } from '@/services/admin'
import { mediaUrl } from '@/services/api'
import { useToast } from '@/components/admin/Toast'
import { Card, Empty, ImageUpload, Loading, TextArea, TextField, Toggle } from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { initials } from '@/utils/format'
import { PageHead } from './AdminLayout'

/**
 * Categories and authors, on one screen behind two tabs.
 *
 * They are separate models but the same job — the small reference lists an
 * article picks from — and each is short enough that a page of its own would
 * be mostly empty. Tabs keep them one click apart without a nav entry each.
 */
export default function Taxonomy() {
  const [tab, setTab] = useState('categories')

  return (
    <>
      <PageHead
        title="Categories & authors"
        subtitle="The reference lists articles are filed under"
      />

      <div className="ad-tabs">
        <button
          type="button"
          className={`ad-tab${tab === 'categories' ? ' is-active' : ''}`}
          onClick={() => setTab('categories')}
        >
          Categories
        </button>
        <button
          type="button"
          className={`ad-tab${tab === 'authors' ? ' is-active' : ''}`}
          onClick={() => setTab('authors')}
        >
          Authors
        </button>
      </div>

      {tab === 'categories' ? <Categories /> : <Authors />}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════ */

const EMPTY_CATEGORY = { name: '', description: '', accent_color: '#726655', order: 0 }

function Categories() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [draft, setDraft] = useState(EMPTY_CATEGORY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listCategories(signal)
      .then((data) => {
        setItems(data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const reset = () => {
    setDraft(EMPTY_CATEGORY)
    setEditingId(null)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, draft)
        toast.success('Category updated.')
      } else {
        await adminApi.createCategory(draft)
        toast.success('Category created.')
      }
      reset()
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(
      `Delete the “${item.name}” category?\n\n` +
      `${item.post_count} article(s) will become uncategorised. They are NOT deleted.`,
    )) return

    try {
      await adminApi.deleteCategory(item.id)
      toast.success('Category deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="ad-grid ad-grid--2">
      <div>
        {state === 'loading' && <Loading rows={4} />}
        {state === 'failed' && <Empty title="Could not load categories" />}
        {state === 'ready' && items.length === 0 && (
          <Empty title="No categories yet">Create the first one on the right.</Empty>
        )}
        {state === 'ready' && items.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="ad-table__num">Articles</th>
                  <th scope="col"><span className="ad-table__actions">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          aria-hidden="true"
                          style={{
                            width: '10px', height: '10px', borderRadius: '2px',
                            background: item.accent_color, flex: 'none',
                          }}
                        />
                        <span className="ad-table__title">{item.name}</span>
                      </span>
                      {item.description && <p className="ad-table__sub">{item.description}</p>}
                    </td>
                    <td className="ad-table__num">{item.post_count}</td>
                    <td>
                      <div className="ad-table__actions">
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--ghost"
                          onClick={() => { setDraft(item); setEditingId(item.id) }}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--danger"
                          onClick={() => remove(item)}
                          aria-label={`Delete ${item.name}`}
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
      </div>

      <Card title={editingId ? 'Edit category' : 'New category'}>
        <form onSubmit={save}>
          <TextField
            label="Name"
            required
            value={draft.name}
            onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
          />
          <TextArea
            label="Description"
            rows={2}
            limit={300}
            value={draft.description}
            onChange={(v) => setDraft((p) => ({ ...p, description: v }))}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="ad-field">
              <label className="ad-field__label" htmlFor="ad-cat-colour">Accent colour</label>
              <input
                id="ad-cat-colour"
                type="color"
                className="ad-input"
                style={{ height: '38px', padding: '4px' }}
                value={draft.accent_color}
                onChange={(e) => setDraft((p) => ({ ...p, accent_color: e.target.value }))}
              />
            </div>
            <TextField
              label="Sort order"
              type="number"
              value={draft.order}
              onChange={(v) => setDraft((p) => ({ ...p, order: Number(v) || 0 }))}
              hint="Lower shows first."
            />
          </div>

          <div className="ad__actions">
            <button type="submit" className="ad-btn ad-btn--primary" disabled={saving || !draft.name.trim()}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" className="ad-btn ad-btn--ghost" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */

const EMPTY_AUTHOR = {
  name: '', role: '', bio: '', email: '', linkedin_url: '', is_active: true, avatar: null,
}

function Authors() {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [draft, setDraft] = useState(EMPTY_AUTHOR)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listAuthors(signal)
      .then((data) => {
        setItems(data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const reset = () => {
    setDraft(EMPTY_AUTHOR)
    setEditingId(null)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    // `avatar` is a File only when freshly picked; otherwise it is the saved
    // URL and must be omitted so the server keeps what it has.
    const body = toRequestBody({ ...draft }, ['avatar'])
    try {
      if (editingId) {
        await adminApi.updateAuthor(editingId, body)
        toast.success('Author updated.')
      } else {
        await adminApi.createAuthor(body)
        toast.success('Author created.')
      }
      reset()
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(
      `Delete ${item.name}?\n\n` +
      `${item.post_count} article(s) will lose their byline. They are NOT deleted.`,
    )) return

    try {
      await adminApi.deleteAuthor(item.id)
      toast.success('Author deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const savedAvatar = typeof draft.avatar === 'string' ? draft.avatar : null

  return (
    <div className="ad-grid ad-grid--2">
      <div>
        {state === 'loading' && <Loading rows={4} />}
        {state === 'failed' && <Empty title="Could not load authors" />}
        {state === 'ready' && items.length === 0 && (
          <Empty title="No authors yet">Add the first byline on the right.</Empty>
        )}
        {state === 'ready' && items.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th scope="col">Author</th>
                  <th scope="col" className="ad-table__num">Articles</th>
                  <th scope="col"><span className="ad-table__actions">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        {item.avatar ? (
                          <img
                            src={mediaUrl(item.avatar)}
                            alt=""
                            style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              display: 'grid', placeItems: 'center', fontSize: '11px',
                              background: 'rgba(114,102,85,0.14)', color: 'var(--bronze)',
                            }}
                          >
                            {initials(item.name)}
                          </span>
                        )}
                        <span>
                          <span className="ad-table__title">{item.name}</span>
                          {!item.is_active && <> <span className="ad-pill ad-pill--archived">Hidden</span></>}
                          {item.role && <p className="ad-table__sub">{item.role}</p>}
                        </span>
                      </span>
                    </td>
                    <td className="ad-table__num">{item.post_count}</td>
                    <td>
                      <div className="ad-table__actions">
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--ghost"
                          onClick={() => { setDraft(item); setEditingId(item.id) }}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Icon name="edit" size={13} />
                        </button>
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--danger"
                          onClick={() => remove(item)}
                          aria-label={`Delete ${item.name}`}
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
      </div>

      <Card title={editingId ? 'Edit author' : 'New author'}>
        <form onSubmit={save}>
          <TextField
            label="Name"
            required
            value={draft.name}
            onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
          />
          <TextField
            label="Role"
            value={draft.role}
            onChange={(v) => setDraft((p) => ({ ...p, role: v }))}
            placeholder="Head of Systems Engineering"
          />
          <TextArea
            label="Bio"
            rows={4}
            value={draft.bio}
            onChange={(v) => setDraft((p) => ({ ...p, bio: v }))}
            hint="Shown in the byline card at the foot of each article."
          />
          <ImageUpload
            label="Portrait"
            hint="Square works best. Optional — initials are used when there is none."
            value={draft.avatar}
            previewUrl={mediaUrl(savedAvatar)}
            onChange={(file) => setDraft((p) => ({ ...p, avatar: file }))}
            onClear={() => setDraft((p) => ({ ...p, avatar: null }))}
          />
          <TextField
            label="Email"
            type="email"
            value={draft.email}
            onChange={(v) => setDraft((p) => ({ ...p, email: v }))}
            hint="Internal only. Never published on the site."
          />
          <TextField
            label="LinkedIn URL"
            type="url"
            value={draft.linkedin_url}
            onChange={(v) => setDraft((p) => ({ ...p, linkedin_url: v }))}
          />
          <Toggle
            checked={draft.is_active}
            onChange={(v) => setDraft((p) => ({ ...p, is_active: v }))}
            label="Available as a byline"
            hint="Off removes them from the author dropdown without touching past articles."
          />

          <div className="ad__actions">
            <button type="submit" className="ad-btn ad-btn--primary" disabled={saving || !draft.name.trim()}>
              {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
            {editingId && (
              <button type="button" className="ad-btn ad-btn--ghost" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
