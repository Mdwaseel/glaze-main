import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminApi, toRequestBody } from '@/services/admin'
import { assetUrl } from '@/services/api'
import { useCatalogue } from '@/context/CatalogueContext'
import { useToast } from '@/components/admin/Toast'
import {
  Card, Empty, ImageUpload, Loading, SelectField, TextField, Toggle,
} from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { slugify } from '@/utils/format'
import { PageHead } from './AdminLayout'

/**
 * The gallery — photographs and films of completed work.
 *
 * Two tabs, the same arrangement Taxonomy uses and for the same reason: the
 * items and the categories they are filed under are separate models doing one
 * job, and each is too short to justify a nav entry of its own.
 *
 * ⚠ THE LIST IS A GRID OF PICTURES, NOT A TABLE OF TITLES. Every other admin
 * list on this site is rows of text because its records ARE text; a gallery
 * row whose entire content is an image, listed as "Villa, Jubilee Hills —
 * image — published", tells an editor nothing they came here to find out. The
 * thumbnail is the record.
 *
 * ⚠ ORDER IS EDITORIAL AND SAVES IMMEDIATELY. The sequence here is the
 * sequence the public grid renders, so moving a tile is a publish, not a
 * draft — the arrows write straight through, like the catalogue's do.
 */
export default function Gallery() {
  const [tab, setTab] = useState('items')

  return (
    <>
      <PageHead
        title="Gallery"
        subtitle="Photographs and films of completed projects"
      />

      <div className="ad-tabs">
        <button
          type="button"
          className={`ad-tab${tab === 'items' ? ' is-active' : ''}`}
          onClick={() => setTab('items')}
        >
          Photos &amp; films
        </button>
        <button
          type="button"
          className={`ad-tab${tab === 'categories' ? ' is-active' : ''}`}
          onClick={() => setTab('categories')}
        >
          Categories
        </button>
      </div>

      {tab === 'items' ? <Items /> : <Categories />}
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Photos & films
   ═══════════════════════════════════════════════════════════════ */

const EMPTY_ITEM = {
  kind: 'image',
  title: '',
  caption: '',
  alt_text: '',
  category: '',
  system: '',
  image: '',
  image_file: null,
  video: '',
  video_file: null,
  poster: '',
  poster_file: null,
  is_featured: false,
  is_published: true,
  shot_on: '',
}

/* The three file inputs, named once. toRequestBody() needs the list to decide
   between JSON and multipart, and a name missing from it is a file that is
   silently never uploaded. */
const FILE_FIELDS = ['image_file', 'video_file', 'poster_file']

function Items() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [state, setState] = useState('loading')
  const [draft, setDraft] = useState(EMPTY_ITEM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  // The systems list, for the optional "which system is in the picture"
  // link. Read from the catalogue the site already has rather than fetched
  // again — it is the same set, and it is already in memory.
  const { systems } = useCatalogue()

  const load = useCallback((signal) => {
    setState('loading')
    return Promise.all([
      adminApi.listGalleryItems(signal),
      adminApi.listGalleryCategories(signal),
    ])
      .then(([itemData, categoryData]) => {
        setItems(itemData)
        setCategories(categoryData)
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
    setDraft(EMPTY_ITEM)
    setEditingId(null)
  }

  const edit = (item) => {
    /* The saved row carries resolved `*_url` fields for the preview and null
       for the file inputs; the draft has to hold the WRITABLE halves, with
       the File slots empty so an edit that does not touch a picture does not
       re-upload or clear it. */
    setDraft({
      ...EMPTY_ITEM,
      ...item,
      category: item.category ?? '',
      system: item.system ?? '',
      shot_on: item.shot_on ?? '',
      image_file: null,
      video_file: null,
      poster_file: null,
    })
    setEditingId(item.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event) => {
    event.preventDefault()

    // The same rule the model and the serialiser enforce, checked here so the
    // editor says so before a round trip rather than after one.
    const hasMedia = draft.kind === 'video'
      ? Boolean(draft.video || draft.video_file)
      : Boolean(draft.image || draft.image_file)
    if (!hasMedia) {
      toast.error(draft.kind === 'video'
        ? 'A film needs a video file or a path.'
        : 'A photograph needs an image file or a path.')
      return
    }

    setSaving(true)
    try {
      const body = toRequestBody({
        ...draft,
        // Empty select → null, not "". DRF reads "" as an invalid pk for a
        // nullable FK and rejects the whole row.
        category: draft.category || null,
        system: draft.system || null,
        shot_on: draft.shot_on || null,
      }, FILE_FIELDS)

      if (editingId) {
        await adminApi.updateGalleryItem(editingId, body)
        toast.success('Item updated.')
      } else {
        await adminApi.createGalleryItem(body)
        toast.success('Item added.')
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
      `Delete “${item.title}”?\n\nThis cannot be undone. To take it off the ` +
      'site without deleting it, switch Published off instead.',
    )) return
    try {
      await adminApi.deleteGalleryItem(item.id)
      toast.success('Item deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  /** Publish/feature toggles write through — they are one field each. */
  const toggle = async (item, field) => {
    setBusy(true)
    try {
      await adminApi.updateGalleryItem(item.id, { [field]: !item[field] })
      await load()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Move one tile and renumber the whole sequence in one call.
   *
   * Not a pair of PATCHes like the systems list: that list only ever swaps
   * two adjacent rows, whereas a gallery is arranged by walking one picture
   * up several positions, and doing that as N round trips would leave the
   * public grid in a half-reordered state between them.
   */
  const move = async (index, by) => {
    const target = index + by
    if (target < 0 || target >= items.length) return
    const next = items.slice()
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    setItems(next) // optimistic — the grid should move under the click
    setBusy(true)
    try {
      await adminApi.reorderGalleryItems(next.map((i) => i.id))
    } catch (error) {
      toast.error(error.message)
      await load() // put it back the way the server has it
    } finally {
      setBusy(false)
    }
  }

  const categoryOptions = useMemo(
    () => [
      { value: '', label: '— None (shows under All) —' },
      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categories],
  )

  const systemOptions = useMemo(
    () => [
      { value: '', label: '— None —' },
      ...systems.map((s) => ({ value: s.slug, label: s.name })),
    ],
    [systems],
  )

  return (
    <div className="ad-grid ad-grid--2">
      <div>
        {state === 'loading' && <Loading rows={4} />}
        {state === 'failed' && <Empty title="Could not load the gallery" />}
        {state === 'ready' && items.length === 0 && (
          <Empty title="Nothing in the gallery yet">
            Add the first photograph or film on the right. Until then the
            public page says so rather than showing an empty grid.
          </Empty>
        )}

        {state === 'ready' && items.length > 0 && (
          <div className="ad-gal-grid">
            {items.map((item, index) => (
              <article
                className={`ad-gal-card${item.is_published ? '' : ' is-draft'}`}
                key={item.id}
              >
                <div className="ad-gal-card__media">
                  {/* The poster covers both kinds — the serialiser falls back
                      to the image for a film with no poster set. */}
                  {item.poster_url || item.image_url ? (
                    <img src={assetUrl(item.poster_url || item.image_url)} alt="" />
                  ) : (
                    <span className="ad-gal-card__blank">No media</span>
                  )}
                  {item.kind === 'video' && (
                    <span className="ad-gal-card__kind">Film</span>
                  )}
                  {item.is_featured && (
                    <span className="ad-gal-card__flag">Featured</span>
                  )}
                </div>

                <div className="ad-gal-card__body">
                  <p className="ad-table__title">{item.title}</p>
                  <p className="ad-table__sub">
                    {item.category
                      ? categories.find((c) => c.id === item.category)?.name || 'Uncategorised'
                      : 'Uncategorised'}
                    {item.system ? ` · ${item.system}` : ''}
                    {item.is_published ? '' : ' · Draft'}
                  </p>

                  <div className="ad-gal-card__actions">
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--ghost"
                      disabled={busy || index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Move ${item.title} up`}
                    >
                      <Icon name="arrowUp" size={13} />
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--ghost"
                      disabled={busy || index === items.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Move ${item.title} down`}
                    >
                      <Icon name="arrowDown" size={13} />
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--ghost"
                      disabled={busy}
                      onClick={() => toggle(item, 'is_published')}
                      aria-label={item.is_published
                        ? `Unpublish ${item.title}`
                        : `Publish ${item.title}`}
                      title={item.is_published ? 'Published' : 'Draft'}
                    >
                      <Icon name={item.is_published ? 'eye' : 'lock'} size={13} />
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--ghost"
                      disabled={busy}
                      onClick={() => toggle(item, 'is_featured')}
                      aria-label={item.is_featured
                        ? `Unfeature ${item.title}`
                        : `Feature ${item.title}`}
                      title="Featured tiles are double width"
                    >
                      <Icon name={item.is_featured ? 'check' : 'plus'} size={13} />
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--ghost"
                      onClick={() => edit(item)}
                      aria-label={`Edit ${item.title}`}
                    >
                      <Icon name="edit" size={13} />
                    </button>
                    <button
                      type="button"
                      className="ad-btn ad-btn--sm ad-btn--danger"
                      onClick={() => remove(item)}
                      aria-label={`Delete ${item.title}`}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Card
        title={editingId ? 'Edit item' : 'Add a photograph or film'}
        hint="An uploaded file always wins over a typed path."
        actions={editingId && (
          <button type="button" className="ad-btn ad-btn--sm ad-btn--ghost" onClick={reset}>
            Cancel
          </button>
        )}
      >
        <form onSubmit={save}>
          <SelectField
            label="Kind"
            value={draft.kind}
            onChange={(v) => setDraft((p) => ({ ...p, kind: v }))}
            options={[
              { value: 'image', label: 'Photograph' },
              { value: 'video', label: 'Film' },
            ]}
          />

          <TextField
            label="Title"
            required
            hint="What this is — “Six-metre sliding elevation, Jubilee Hills”."
            value={draft.title}
            onChange={(v) => setDraft((p) => ({ ...p, title: v }))}
          />

          <TextField
            label="Caption"
            hint="Optional. One line, shown in the lightbox only."
            value={draft.caption}
            onChange={(v) => setDraft((p) => ({ ...p, caption: v }))}
          />

          <TextField
            label="Alt text"
            hint="What somebody who cannot see the picture needs to know. Left empty, the title is used."
            value={draft.alt_text}
            onChange={(v) => setDraft((p) => ({ ...p, alt_text: v }))}
          />

          <SelectField
            label="Category"
            value={String(draft.category ?? '')}
            onChange={(v) => setDraft((p) => ({ ...p, category: v }))}
            options={categoryOptions}
          />

          <SelectField
            label="System in the picture"
            hint="Optional. Becomes a link from the gallery into that system’s page."
            value={draft.system ?? ''}
            onChange={(v) => setDraft((p) => ({ ...p, system: v }))}
            options={systemOptions}
          />

          {/* ── Media ────────────────────────────────────────────
              Only the fields the chosen kind actually uses. Showing a video
              upload on a photograph is three inputs an editor has to decide
              to ignore. */}
          {draft.kind === 'image' ? (
            <>
              <ImageUpload
                label="Photograph"
                hint="JPEG, WebP or PNG. Landscape crops best in the grid."
                value={draft.image_file}
                previewUrl={assetUrl(draft.image_url || draft.image)}
                onChange={(file) => setDraft((p) => ({ ...p, image_file: file }))}
                onClear={() => setDraft((p) => ({ ...p, image_file: null }))}
              />
              <TextField
                label="…or an image path"
                hint="A path under client/public, or an absolute URL."
                value={draft.image}
                onChange={(v) => setDraft((p) => ({ ...p, image: v }))}
              />
            </>
          ) : (
            <>
              <FileField
                label="Film"
                hint="MP4, H.264. Keep it short — this plays on hover in the grid."
                accept="video/*"
                value={draft.video_file}
                currentUrl={draft.video_url || draft.video}
                onChange={(file) => setDraft((p) => ({ ...p, video_file: file }))}
              />
              <TextField
                label="…or a video path"
                value={draft.video}
                onChange={(v) => setDraft((p) => ({ ...p, video: v }))}
              />
              <ImageUpload
                label="Poster"
                hint="The still shown before the film plays. Without one the tile is a black rectangle until it decodes."
                value={draft.poster_file}
                previewUrl={assetUrl(draft.poster_url || draft.poster)}
                onChange={(file) => setDraft((p) => ({ ...p, poster_file: file }))}
                onClear={() => setDraft((p) => ({ ...p, poster_file: null }))}
              />
            </>
          )}

          <TextField
            label="Shot on"
            type="date"
            hint="Optional. Not shown on the page — it orders the grid when nobody has arranged it by hand."
            value={draft.shot_on || ''}
            onChange={(v) => setDraft((p) => ({ ...p, shot_on: v }))}
          />

          <Toggle
            label="Featured"
            hint="A double-width tile. Use it sparingly — a grid where everything is featured is a grid."
            checked={draft.is_featured}
            onChange={(v) => setDraft((p) => ({ ...p, is_featured: v }))}
          />

          <Toggle
            label="Published"
            hint="Off keeps the row and takes it off the site."
            checked={draft.is_published}
            onChange={(v) => setDraft((p) => ({ ...p, is_published: v }))}
          />

          <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>
            <Icon name="save" size={14} />
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to gallery'}
          </button>
        </form>
      </Card>
    </div>
  )
}

/**
 * A plain file input, for the one asset that is not an image.
 *
 * `ImageUpload` in components/admin/ui.jsx rejects anything whose MIME type
 * is not `image/*` — correct for every other upload on this site, and wrong
 * for a film. Rather than loosen a shared component that four screens depend
 * on, the video field is its own small input here.
 */
function FileField({ label, hint, accept, value, currentUrl, onChange }) {
  return (
    <div className="ad-field">
      <label className="ad-field__label">{label}</label>
      <input
        type="file"
        className="ad-input"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      {value && <p className="ad-field__hint">Selected: {value.name}</p>}
      {!value && currentUrl && (
        <p className="ad-field__hint">
          Current:{' '}
          <a href={assetUrl(currentUrl)} target="_blank" rel="noopener">{currentUrl}</a>
        </p>
      )}
      {hint && <p className="ad-field__hint">{hint}</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Categories
   ═══════════════════════════════════════════════════════════════ */

const EMPTY_CATEGORY = { name: '', slug: '', order: 0, is_published: true }

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
      .listGalleryCategories(signal)
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
      const body = {
        ...draft,
        // The slug is what a shared /gallery?filter=… link carries, so it is
        // derived rather than left to whoever is typing — but only when the
        // field is empty, because renaming a category must not silently
        // break links that already point at it.
        slug: draft.slug || slugify(draft.name),
      }
      if (editingId) {
        await adminApi.updateGalleryCategory(editingId, body)
        toast.success('Category updated.')
      } else {
        await adminApi.createGalleryCategory(body)
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
      `${item.item_count} item(s) will become uncategorised and appear under ` +
      '“All”. They are NOT deleted.',
    )) return
    try {
      await adminApi.deleteGalleryCategory(item.id)
      toast.success('Category deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="ad-grid ad-grid--2">
      <div>
        {state === 'loading' && <Loading rows={3} />}
        {state === 'failed' && <Empty title="Could not load categories" />}
        {state === 'ready' && items.length === 0 && (
          <Empty title="No categories yet">
            Create the first one on the right. Items with no category still
            show on the site, under “All”.
          </Empty>
        )}
        {state === 'ready' && items.length > 0 && (
          <div className="ad-table-wrap">
            <table className="ad-table" style={{ minWidth: 'auto' }}>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  <th scope="col" className="ad-table__num">Items</th>
                  <th scope="col"><span className="ad-table__actions">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="ad-table__title">{item.name}</span>
                      <p className="ad-table__sub">
                        /{item.slug}{item.is_published ? '' : ' · Hidden'}
                      </p>
                    </td>
                    <td className="ad-table__num">{item.item_count}</td>
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

      <Card
        title={editingId ? 'Edit category' : 'New category'}
        actions={editingId && (
          <button type="button" className="ad-btn ad-btn--sm ad-btn--ghost" onClick={reset}>
            Cancel
          </button>
        )}
      >
        <form onSubmit={save}>
          <TextField
            label="Name"
            required
            hint="The filter tab’s label — “Villas”, “Apartments”, “Commercial”."
            value={draft.name}
            onChange={(v) => setDraft((p) => ({ ...p, name: v }))}
          />
          <TextField
            label="Slug"
            hint="Left empty it is made from the name. Changing it breaks any shared filter link."
            value={draft.slug}
            onChange={(v) => setDraft((p) => ({ ...p, slug: v }))}
          />
          <TextField
            label="Order"
            type="number"
            hint="Position in the filter bar. Lower shows first."
            value={String(draft.order ?? 0)}
            onChange={(v) => setDraft((p) => ({ ...p, order: Number(v) || 0 }))}
          />
          <Toggle
            label="Published"
            hint="Off hides the tab. Its items stay on the site, under “All”."
            checked={draft.is_published}
            onChange={(v) => setDraft((p) => ({ ...p, is_published: v }))}
          />

          <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>
            <Icon name="save" size={14} />
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
          </button>
        </form>
      </Card>
    </div>
  )
}
