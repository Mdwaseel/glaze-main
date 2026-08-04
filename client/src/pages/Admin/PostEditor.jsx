import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi, toRequestBody } from '@/services/admin'
import { mediaUrl } from '@/services/api'
import { useToast } from '@/components/admin/Toast'
import {
  Card, Field, ImageUpload, Loading, SelectField, TextArea, TextField, Toggle,
} from '@/components/admin/ui'
import Icon from '@/components/admin/Icon'
import { slugify } from '@/utils/format'
import { PageHead } from './AdminLayout'

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', takeaways: '',
  featured_image: null, image_alt: '',
  category: '', author: '', show_author: true, tag_names: [],
  meta_title: '', meta_description: '', focus_keyword: '', canonical_url: '', noindex: false,
  status: 'draft', is_featured: false, comments_enabled: true, published_at: '',
}

/**
 * The article editor — one screen for creating and editing.
 *
 * Layout follows the brief: content in the main column, publishing controls
 * and metadata in a sticky sidebar, so the Publish button is reachable
 * without scrolling back up from the bottom of a long article.
 *
 * Two things worth knowing about the data flow:
 *
 * `featured_image` is either a File (the user just picked one) or a string
 * URL (what the server already has). toRequestBody() only sends it when it is
 * a File — sending the URL string back would make DRF try to parse a path as
 * an upload, and omitting the field entirely is how you say "leave the
 * existing image alone".
 *
 * SEO fields left blank are NOT filled in here. The server derives meta_title
 * from title and meta_description from excerpt in Post.save(). Pre-filling
 * them client-side would freeze the derived value at whatever the title was
 * when the field first rendered, so later title edits would stop propagating.
 */
export default function PostEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState(EMPTY)
  const [taxonomy, setTaxonomy] = useState({ categories: [], authors: [] })
  const [state, setState] = useState(isNew ? 'ready' : 'loading')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [slugTaken, setSlugTaken] = useState(false)
  const [tagDraft, setTagDraft] = useState('')

  const set = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      adminApi.listCategories(controller.signal).catch(() => []),
      adminApi.listAuthors(controller.signal).catch(() => []),
    ]).then(([categories, authors]) => setTaxonomy({ categories, authors }))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (isNew) return undefined
    const controller = new AbortController()

    adminApi
      .getPost(id, controller.signal)
      .then((post) => {
        setForm({
          ...EMPTY,
          ...post,
          category: post.category ?? '',
          author: post.author ?? '',
          tag_names: (post.tags || []).map((tag) => tag.name),
          // <input type="datetime-local"> wants 'YYYY-MM-DDTHH:mm' and
          // rejects the ISO string's seconds and timezone suffix.
          published_at: post.published_at ? post.published_at.slice(0, 16) : '',
        })
        setState('ready')
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setState('failed')
      })

    return () => controller.abort()
  }, [id, isNew])

  // Live slug clash check. Debounced, and only meaningful once there is a
  // title to derive a slug from.
  const effectiveSlug = form.slug || slugify(form.title)
  useEffect(() => {
    if (!effectiveSlug) {
      setSlugTaken(false)
      return undefined
    }
    const timer = setTimeout(() => {
      adminApi
        .checkSlug(effectiveSlug, isNew ? undefined : id)
        .then((result) => setSlugTaken(!result.available))
        .catch(() => setSlugTaken(false))
    }, 400)
    return () => clearTimeout(timer)
  }, [effectiveSlug, id, isNew])

  const categoryOptions = useMemo(
    () => taxonomy.categories.map((c) => ({ value: String(c.id), label: c.name })),
    [taxonomy.categories],
  )
  const authorOptions = useMemo(
    () => taxonomy.authors.map((a) => ({
      value: String(a.id),
      label: a.role ? `${a.name} — ${a.role}` : a.name,
    })),
    [taxonomy.authors],
  )

  const addTag = (raw) => {
    const name = raw.trim().replace(/,$/, '')
    if (!name) return
    // Case-insensitive dedupe here as well as server-side, so the chip does
    // not appear twice before the save round-trips.
    if (!form.tag_names.some((t) => t.toLowerCase() === name.toLowerCase())) {
      set('tag_names', [...form.tag_names, name])
    }
    setTagDraft('')
  }

  const save = async (overrides = {}) => {
    setSaving(true)
    setErrors({})

    const payload = {
      ...form,
      ...overrides,
      // Empty string is not a valid FK id; null clears the relation.
      category: (overrides.category ?? form.category) || null,
      author: (overrides.author ?? form.author) || null,
      published_at: (overrides.published_at ?? form.published_at) || null,
      slug: undefined,   // server owns the slug
    }
    delete payload.tags
    delete payload.category_detail
    delete payload.author_detail
    delete payload.takeaway_list
    delete payload.is_live
    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    delete payload.reading_time
    delete payload.view_count

    const body = toRequestBody(payload, ['featured_image'])

    try {
      const saved = isNew
        ? await adminApi.createPost(body)
        : await adminApi.updatePost(id, body)

      toast.success(isNew ? 'Article created.' : 'Article saved.')

      if (isNew) {
        navigate(`/admin/posts/${saved.id}`, { replace: true })
      } else {
        // Re-sync from the response so server-derived values (slug, reading
        // time, auto-filled SEO) appear immediately rather than after a
        // manual reload.
        setForm((prev) => ({
          ...prev,
          ...saved,
          category: saved.category ?? '',
          author: saved.author ?? '',
          tag_names: (saved.tags || []).map((tag) => tag.name),
          featured_image: null,
          published_at: saved.published_at ? saved.published_at.slice(0, 16) : '',
        }))
      }
      return saved
    } catch (error) {
      if (error.fields) {
        setErrors(error.fields)
        toast.error('Please check the highlighted fields.')
      } else {
        toast.error(error.message)
      }
      return null
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (name) => {
    const value = errors[name]
    return Array.isArray(value) ? value[0] : value
  }

  if (state === 'loading') return <Loading rows={8} />
  if (state === 'failed') {
    return (
      <>
        <PageHead title="Article" />
        <div className="ad-empty">
          <p className="ad-empty__title">Could not load this article</p>
          <Link to="/admin/posts" className="ad-btn">Back to articles</Link>
        </div>
      </>
    )
  }

  const savedImage = typeof form.featured_image === 'string' ? form.featured_image : null

  return (
    <>
      <PageHead
        title={isNew ? 'New article' : 'Edit article'}
        subtitle={isNew ? 'Draft it here, publish when you are ready' : `/blog/${form.slug}`}
      >
        <Link to="/admin/posts" className="ad-btn ad-btn--ghost">
          <Icon name="arrowLeft" size={14} /> Articles
        </Link>
        {!isNew && form.status === 'published' && (
          <Link to={`/blog/${form.slug}`} className="ad-btn">
            <Icon name="external" size={14} /> View
          </Link>
        )}
        <button type="button" className="ad-btn" disabled={saving} onClick={() => save()}>
          <Icon name="save" size={14} /> {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="ad-btn ad-btn--primary"
          disabled={saving}
          onClick={() => save({ status: 'published' })}
        >
          {form.status === 'published' ? 'Update live article' : 'Publish article'}
        </button>
      </PageHead>

      <form className="ad-editor" onSubmit={(event) => { event.preventDefault(); save() }}>
        {/* ── Main column ─────────────────────────────────────────── */}
        <div style={{ display: 'grid', gap: '24px' }}>
          <Card title="Content" hint="Title, excerpt and full article body">
            <TextField
              label="Title"
              required
              value={form.title}
              onChange={(v) => set('title', v)}
              placeholder="Article headline…"
              error={fieldError('title')}
              hint={
                effectiveSlug
                  ? slugTaken
                    ? `⚠ /blog/${effectiveSlug} is already taken — the server will add a suffix.`
                    : `URL: /blog/${effectiveSlug}`
                  : undefined
              }
            />

            <TextArea
              label="Excerpt"
              required
              limit={400}
              rows={3}
              value={form.excerpt}
              onChange={(v) => set('excerpt', v)}
              placeholder="Short 1–2 sentence summary used in listings and meta description…"
              error={fieldError('excerpt')}
            />

            <TextArea
              label="Article content"
              required
              code
              value={form.content}
              onChange={(v) => set('content', v)}
              placeholder="Write your article content here…"
              error={fieldError('content')}
              hint={
                'HTML is accepted. Use <h2>, <h3>, <p>, <ul>, <ol>, <table>, <blockquote>. ' +
                'Content components: wrap in <div class="bl-tip">, bl-expert, bl-insight, bl-note, bl-warning. ' +
                'Anything outside that allowlist is stripped when you save.'
              }
            />

            <TextArea
              label="Key takeaways"
              rows={5}
              value={form.takeaways}
              onChange={(v) => set('takeaways', v)}
              placeholder="One takeaway per line…"
              hint="Shown as a bulleted summary box at the top of the article. Leave blank to hide the box."
            />
          </Card>

          <Card title="Featured image" hint="Recommended 1200 × 630px">
            <ImageUpload
              label="Image file"
              hint="WebP, JPG or PNG, under 5 MB."
              value={form.featured_image}
              previewUrl={mediaUrl(savedImage)}
              onChange={(file) => set('featured_image', file)}
              onClear={() => set('featured_image', null)}
            />
            <TextField
              label="Image alt text"
              value={form.image_alt}
              onChange={(v) => set('image_alt', v)}
              placeholder="Describe the image for SEO and accessibility…"
              limit={250}
              hint="Left blank, the article title is used — accurate for a decorative hero, worth writing properly for a diagram."
            />
          </Card>

          <Card title="SEO" hint="Leave blank to auto-generate from the title and excerpt">
            <TextField
              label="Meta title"
              limit={70}
              value={form.meta_title}
              onChange={(v) => set('meta_title', v)}
              placeholder="Auto-generated from title if blank…"
            />
            <TextArea
              label="Meta description"
              limit={160}
              rows={2}
              value={form.meta_description}
              onChange={(v) => set('meta_description', v)}
              placeholder="Auto-generated from excerpt if blank…"
            />
            <TextField
              label="Focus keyword"
              value={form.focus_keyword}
              onChange={(v) => set('focus_keyword', v)}
              placeholder="thermal break aluminium window"
              hint="The phrase this article should rank for. Used for your own tracking — it is not injected into the page."
            />
            <TextField
              label="Canonical URL"
              type="url"
              value={form.canonical_url}
              onChange={(v) => set('canonical_url', v)}
              placeholder="https://…"
              hint="Set only when this article also lives on another site."
            />
            <Toggle
              checked={form.noindex}
              onChange={(v) => set('noindex', v)}
              label="Hide from search engines"
              hint="Adds noindex. The article stays publicly reachable by its URL."
            />
          </Card>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="ad-editor__side">
          <Card title="Publishing">
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => set('status', v)}
              placeholder="Draft"
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'published', label: 'Published' },
                { value: 'archived', label: 'Archived' },
              ]}
            />

            <Field label="Publish date" htmlFor="ad-published-at">
              <input
                id="ad-published-at"
                className="ad-input"
                type="datetime-local"
                value={form.published_at}
                onChange={(event) => set('published_at', event.target.value)}
              />
              <p className="ad-field__hint">
                Leave blank to publish immediately. A future date schedules it —
                the article stays hidden until then, whatever the status says.
              </p>
            </Field>

            <Toggle
              checked={form.is_featured}
              onChange={(v) => set('is_featured', v)}
              label="Featured article"
              hint="Shown prominently at the top of the blog listing."
            />

            <Toggle
              checked={form.comments_enabled}
              onChange={(v) => set('comments_enabled', v)}
              label="Comments enabled"
              hint="Off hides the whole comment section on this article."
            />
          </Card>

          <Card title="Category & author">
            <SelectField
              label="Category"
              value={form.category ? String(form.category) : ''}
              onChange={(v) => set('category', v)}
              options={categoryOptions}
            />
            <SelectField
              label="Author"
              value={form.author ? String(form.author) : ''}
              onChange={(v) => set('author', v)}
              options={authorOptions}
            />
            <Toggle
              checked={form.show_author}
              onChange={(v) => set('show_author', v)}
              label="Show the byline"
              hint="Off keeps the author on record but hides them from the article."
            />
            {(categoryOptions.length === 0 || authorOptions.length === 0) && (
              <p className="ad-field__hint">
                <Link to="/admin/taxonomy">Create categories and authors →</Link>
              </p>
            )}
          </Card>

          <Card title="Tags">
            <Field label="Add a tag" htmlFor="ad-tag-input">
              <input
                id="ad-tag-input"
                className="ad-input"
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Enter must not submit the form — in a single-input row
                  // the browser would treat it as a submit.
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault()
                    addTag(tagDraft)
                  }
                }}
                onBlur={() => addTag(tagDraft)}
                placeholder="Type and press Enter…"
              />
              <p className="ad-field__hint">New tags are created automatically.</p>
            </Field>

            {form.tag_names.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {form.tag_names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="ad-pill ad-pill--draft"
                    style={{ cursor: 'pointer' }}
                    onClick={() => set('tag_names', form.tag_names.filter((t) => t !== name))}
                    aria-label={`Remove tag ${name}`}
                  >
                    {name} <Icon name="x" size={10} />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {!isNew && (
            <Card title="Stats">
              <div className="ad-bars">
                <div className="ad-bar__head" style={{ marginBottom: 0 }}>
                  <span className="ad-bar__label">Views</span>
                  <span className="ad-bar__value">{(form.view_count || 0).toLocaleString()}</span>
                </div>
                <div className="ad-bar__head" style={{ marginBottom: 0 }}>
                  <span className="ad-bar__label">Reading time</span>
                  <span className="ad-bar__value">{form.reading_time} min</span>
                </div>
              </div>
            </Card>
          )}
        </aside>
      </form>
    </>
  )
}
