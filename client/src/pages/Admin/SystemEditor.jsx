import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi, toCatalogueBody } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Card, Empty, Loading, TextArea, TextField, Toggle } from '@/components/admin/ui'
import { MediaField, RowList, StringList } from '@/components/admin/repeatable'
import Icon from '@/components/admin/Icon'
import { slugify } from '@/utils/format'
import { SERIES, SERIES_OPTION_ORDER } from '@/data/systems'
import { PageHead } from './AdminLayout'
import VariantsPanel from './VariantsPanel'

/**
 * One system, in full — and the screen the brief is really about.
 *
 * It is long because a system page IS long: a hero, an overview with its
 * tested figures and four strengths, a series grid, a carousel card with its
 * own copy, a line for the enquiry form and the head tags. Everything on
 * /products/<slug> that differs between systems is here, grouped in the order
 * the page renders it, so "change the second paragraph of the Sliding
 * overview" is a thing you can find rather than a thing you have to know.
 *
 * WHAT IS NOT EDITABLE HERE, and why:
 *
 *   The twelve PROFILE SERIES. A series is a tested extrusion — U-values and
 *   acoustic ratings with certificates behind them. What this screen offers
 *   is which of them a system is ORDERED and FLAGGED with; the numbers
 *   themselves are not behind a text box, because a typo in one is a claim
 *   the company has to stand behind. They live in data/systems.js.
 *
 *   Everything shared by all seven pages — hardware, glass, finish, benefits,
 *   partners, testimonials. Identical on every system by design; editing them
 *   per system is not a feature, it is a way to make them diverge.
 *
 * THE VARIANTS ARE A SEPARATE PANEL and only appear once the system exists,
 * because a variant needs a system to belong to. Creating one is therefore
 * two steps — save the system, then add its formats — which is stated on the
 * screen rather than left to be discovered.
 */

const EMPTY = {
  slug: '',
  name: '',
  order: 0,
  is_published: false,

  page_title: '',
  meta_description: '',
  schema_name: '',
  schema_category: '',
  schema_description: '',

  hero_video: '',
  hero_video_file: null,
  hero_image: '',
  hero_image_file: null,
  hero_title: '',
  hero_accent: '',
  hero_lede: '',

  overview_title_lead: '',
  overview_title_em: '',
  chips: [],
  overview_body: [],
  stats: [],
  strengths: [],

  series_note: '',
  fits: [],
  series_order: [...SERIES_OPTION_ORDER],

  card_video: '',
  card_video_file: null,
  card_poster: '',
  card_poster_file: null,
  card_image: '',
  card_image_file: null,

  teaser_lead: '',
  teaser_em: '',
  teaser_desc: '',
  teaser_specs: [],
  teaser_cta: '',

  enquiry_note: '',
}

/** The upload halves of the five media pairs. */
const FILE_FIELDS = [
  'hero_video_file', 'hero_image_file',
  'card_video_file', 'card_poster_file', 'card_image_file',
]

/** Columns the server stores as JSON — see toCatalogueBody. */
const JSON_FIELDS = [
  'chips', 'overview_body', 'stats', 'strengths',
  'fits', 'series_order', 'teaser_specs',
]

/** Read-only fields the API sends back; never posted. */
const SERVER_ONLY = [
  'id', 'variants', 'variant_count', 'updated_at',
  'hero_video_url', 'hero_image_url',
  'card_video_url', 'card_poster_url', 'card_image_url',
]

export default function SystemEditor() {
  const { slug } = useParams()
  const isNew = !slug
  const navigate = useNavigate()
  const toast = useToast()

  const [draft, setDraft] = useState(EMPTY)
  const [state, setState] = useState(isNew ? 'ready' : 'loading')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState(null)
  // Bumped after a save so the variants panel reloads with the server's copy.
  const [savedAt, setSavedAt] = useState(0)

  const set = useCallback((key, value) => {
    setDraft((previous) => ({ ...previous, [key]: value }))
  }, [])

  useEffect(() => {
    if (isNew) return undefined
    const controller = new AbortController()

    adminApi
      .getSystem(slug, controller.signal)
      .then((data) => {
        setDraft({ ...EMPTY, ...data })
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })

    return () => controller.abort()
  }, [slug, isNew])

  // The slug follows the name only while creating: changing it afterwards
  // breaks /products/<slug> and every link anyone has to it, so an edit has
  // to be deliberate.
  const onName = (value) => {
    setDraft((previous) => ({
      ...previous,
      name: value,
      slug: isNew ? slugify(value) : previous.slug,
    }))
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors(null)

    const fields = { ...draft }
    SERVER_ONLY.forEach((key) => delete fields[key])
    const body = toCatalogueBody(fields, FILE_FIELDS, JSON_FIELDS)

    try {
      if (isNew) {
        const created = await adminApi.createSystem(body)
        toast.success(`${created.name} created. Add its variants below.`)
        navigate(`/admin/systems/${created.slug}`, { replace: true })
      } else {
        const updated = await adminApi.updateSystem(slug, body)
        setDraft({ ...EMPTY, ...updated })
        setSavedAt(Date.now())
        toast.success('Saved.')
      }
    } catch (error) {
      setErrors(error.fields || null)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const fieldError = (key) => {
    const value = errors?.[key]
    return Array.isArray(value) ? value.join(' ') : value
  }

  const seriesOptions = useMemo(
    () => SERIES_OPTION_ORDER.map((id) => ({ id, name: SERIES[id].name })),
    [],
  )

  if (state === 'loading') return <Loading rows={8} />
  if (state === 'failed') {
    return (
      <Empty title="Could not load this system" action={
        <Link className="ad-btn ad-btn--ghost" to="/admin/systems">Back to the catalogue</Link>
      } />
    )
  }

  return (
    <>
      <form onSubmit={save}>
      <PageHead
        title={isNew ? 'New system' : draft.name || draft.slug}
        subtitle={isNew
          ? 'Everything the system page, the carousel card and the enquiry forms need'
          : `/products/${draft.slug}`}
      >
        <Link className="ad-btn ad-btn--ghost" to="/admin/systems">
          <Icon name="arrowLeft" size={13} /> Catalogue
        </Link>
        {!isNew && (
          <a
            className="ad-btn ad-btn--ghost"
            href={`/products/${draft.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="external" size={13} /> View page
          </a>
        )}
        <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>
          <Icon name="save" size={13} /> {saving ? 'Saving…' : isNew ? 'Create system' : 'Save'}
        </button>
      </PageHead>

      <div className="ad-grid ad-grid--2">
        {/* ── Identity ───────────────────────────────────────────── */}
        <Card title="Identity" hint="What the system is called, and where it lives.">
          <TextField
            label="Name" required
            value={draft.name}
            onChange={onName}
            error={fieldError('name')}
            hint="Used on every card, cross-link and enquiry chip. e.g. “Lift & Slide”."
          />
          <TextField
            label="URL slug" required
            value={draft.slug}
            onChange={(v) => set('slug', slugify(v))}
            error={fieldError('slug')}
            hint={isNew
              ? 'Follows the name while you type. The page will be /products/<slug>.'
              : '⚠ Changing this breaks every existing link to /products/' + draft.slug + '.'}
          />
          <Toggle
            checked={draft.is_published}
            onChange={(v) => set('is_published', v)}
            label="Published"
            hint="Off keeps the record and its variants but takes the system off the site entirely — carousel, footer, cross-links and both enquiry forms."
          />
        </Card>

        {/* ── The enquiry forms ──────────────────────────────────── */}
        <Card
          title="Enquiry forms"
          hint="This system appears as a chip on the contact form and an option on the system-page form automatically. This is the one line that is not derived."
        >
          <TextArea
            label="Note under the chips"
            rows={3}
            limit={300}
            value={draft.enquiry_note}
            onChange={(v) => set('enquiry_note', v)}
            hint="Shown on the contact form when someone picks this system. A plain description of the window type, not a spec."
          />
        </Card>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <Card
        title="§01 Hero"
        hint="The full-bleed opening. A clip if there is one, a still if there is not — whichever is set is what renders."
      >
        <div className="ad-grid ad-grid--2">
          <MediaField
            label="Hero clip"
            hint="Path under client/public, or upload. Leave empty for a still-only hero."
            kind="video"
            path={draft.hero_video}
            onPath={(v) => set('hero_video', v)}
            file={draft.hero_video_file}
            onFile={(f) => set('hero_video_file', f)}
            resolved={draft.hero_video_url}
          />
          <MediaField
            label="Hero still"
            hint="Used when there is no clip. Fixed ships one — there is no footage of a window that does not move."
            kind="image"
            accept="image/webp,image/jpeg,image/png"
            path={draft.hero_image}
            onPath={(v) => set('hero_image', v)}
            file={draft.hero_image_file}
            onFile={(f) => set('hero_image_file', f)}
            resolved={draft.hero_image_url}
          />
        </div>
        <div className="ad-grid ad-grid--2">
          <TextField
            label="Title"
            value={draft.hero_title}
            onChange={(v) => set('hero_title', v)}
            placeholder="Sliding."
          />
          <TextField
            label="Accent line"
            value={draft.hero_accent}
            onChange={(v) => set('hero_accent', v)}
            placeholder="Effortless by design."
          />
        </div>
        <TextArea
          label="Lede"
          rows={2}
          limit={400}
          value={draft.hero_lede}
          onChange={(v) => set('hero_lede', v)}
        />
      </Card>

      {/* ── Overview ─────────────────────────────────────────────── */}
      <Card title="§03 Overview" hint="The argument for the system, and the figures behind it.">
        <div className="ad-grid ad-grid--2">
          <TextField
            label="Heading — lead"
            value={draft.overview_title_lead}
            onChange={(v) => set('overview_title_lead', v)}
            placeholder="A window that "
            hint="Trailing space matters: the emphasis follows it directly."
          />
          <TextField
            label="Heading — emphasis"
            value={draft.overview_title_em}
            onChange={(v) => set('overview_title_em', v)}
            placeholder="glides open."
          />
        </div>

        <StringList
          label="Chips"
          hint="Four short use-cases under the heading."
          value={draft.chips}
          onChange={(v) => set('chips', v)}
          placeholder="Panoramic"
          addLabel="Add chip"
          max={6}
        />

        <StringList
          label="Body"
          hint="Two paragraphs. Each is one <p> on the page."
          value={draft.overview_body}
          onChange={(v) => set('overview_body', v)}
          multiline
          rows={4}
          addLabel="Add paragraph"
        />

        <RowList
          label="Statistics"
          hint={
            'The counters. “To” is the number it runs to and “Decimals” how many it keeps — ' +
            '2.087 with 3 decimals animates to 2.087, with 1 it would land on 2.1. ' +
            'Four is the usual count; Pivot ships three and Fixed two, and the section renders what it is given.'
          }
          value={draft.stats}
          onChange={(v) => set('stats', v)}
          addLabel="Add statistic"
          max={4}
          columns={[
            { key: 'to', label: 'To', placeholder: '300', width: 1 },
            { key: 'dec', label: 'Decimals', placeholder: '0', width: 1 },
            { key: 'unit', label: 'Unit', placeholder: 'kg', width: 1 },
            { key: 'key', label: 'Label', placeholder: 'Max sash weight', width: 3 },
          ]}
        />

        <RowList
          label="Strengths"
          hint="Four claims, each with a sentence or two behind it."
          value={draft.strengths}
          onChange={(v) => set('strengths', v)}
          addLabel="Add strength"
          max={4}
          columns={[
            { key: 'title', label: 'Title', placeholder: 'Fingertip glide', width: 1 },
            { key: 'copy', label: 'Copy', placeholder: 'Twin stainless rollers…', width: 3, multiline: true },
          ]}
        />
      </Card>

      {/* ── Series ───────────────────────────────────────────────── */}
      <Card
        title="§05 Profile series"
        hint="Which of the twelve tested profiles this system is shown with, and in what order. The series and their figures are not editable — they carry test certificates."
      >
        <TextField
          label="Section note"
          value={draft.series_note}
          onChange={(v) => set('series_note', v)}
          placeholder="The full Glaze catalogue, with the series that suit Sliding listed first."
        />

        <fieldset className="ad-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="ad-field__label">Flagged as a fit</legend>
          <p className="ad-field__hint" style={{ marginBottom: '8px' }}>
            These carry a “· For {draft.name || 'this system'}” badge on the card.
            Pivot and Fixed flag none, and their note drops the “listed first” clause.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {seriesOptions.map((option) => {
              const on = draft.fits.includes(option.id)
              return (
                <button
                  type="button"
                  key={option.id}
                  className={`ad-btn ad-btn--sm ${on ? 'ad-btn--primary' : 'ad-btn--ghost'}`}
                  onClick={() => set(
                    'fits',
                    on
                      ? draft.fits.filter((id) => id !== option.id)
                      : [...draft.fits, option.id],
                  )}
                  aria-pressed={on}
                >
                  {option.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <SeriesOrder
          value={draft.series_order}
          onChange={(v) => set('series_order', v)}
        />
      </Card>

      {/* ── The collection card ──────────────────────────────────── */}
      <Card
        title="Collection card"
        hint="How this system appears in the carousel on the homepage and /systems, and in the cross-links at the foot of every other system page."
      >
        <div className="ad-grid ad-grid--2">
          <MediaField
            label="Card clip"
            kind="video"
            path={draft.card_video}
            onPath={(v) => set('card_video', v)}
            file={draft.card_video_file}
            onFile={(f) => set('card_video_file', f)}
            resolved={draft.card_video_url}
          />
          <MediaField
            label="Card poster"
            hint="The clip's first frame. Without it the card is a black rectangle until the pointer arrives — these are preload=metadata and stay paused."
            kind="image"
            accept="image/webp,image/jpeg,image/png"
            path={draft.card_poster}
            onPath={(v) => set('card_poster', v)}
            file={draft.card_poster_file}
            onFile={(f) => set('card_poster_file', f)}
            resolved={draft.card_poster_url}
          />
        </div>
        <MediaField
          label="Card still"
          hint="Used instead of a clip when there is none."
          kind="image"
          accept="image/webp,image/jpeg,image/png"
          path={draft.card_image}
          onPath={(v) => set('card_image', v)}
          file={draft.card_image_file}
          onFile={(f) => set('card_image_file', f)}
          resolved={draft.card_image_url}
        />

        <div className="ad-grid ad-grid--2">
          <TextField
            label="Copy heading — lead"
            value={draft.teaser_lead}
            onChange={(v) => set('teaser_lead', v)}
            placeholder="Sliding "
          />
          <TextField
            label="Copy heading — emphasis"
            value={draft.teaser_em}
            onChange={(v) => set('teaser_em', v)}
            placeholder="Systems"
          />
        </div>
        <TextArea
          label="Copy"
          rows={3}
          limit={400}
          value={draft.teaser_desc}
          onChange={(v) => set('teaser_desc', v)}
        />
        <StringList
          label="Highlights"
          hint="Three short lines under the copy."
          value={draft.teaser_specs}
          onChange={(v) => set('teaser_specs', v)}
          placeholder="20 mm sightlines"
          addLabel="Add highlight"
          max={4}
        />
        <TextField
          label="Call to action"
          value={draft.teaser_cta}
          onChange={(v) => set('teaser_cta', v)}
          placeholder="Explore Sliding"
        />
      </Card>

      {/* ── Head ─────────────────────────────────────────────────── */}
      <Card title="Search and sharing" hint="The page's own head tags and its Product schema.">
        <TextField
          label="Page title"
          limit={140}
          value={draft.page_title}
          onChange={(v) => set('page_title', v)}
          placeholder="Sliding Systems — Glaze Window Systems"
        />
        <TextArea
          label="Meta description"
          rows={2}
          limit={300}
          value={draft.meta_description}
          onChange={(v) => set('meta_description', v)}
        />
        <div className="ad-grid ad-grid--2">
          <TextField
            label="Schema name"
            value={draft.schema_name}
            onChange={(v) => set('schema_name', v)}
            placeholder="Glaze Sliding Systems"
          />
          <TextField
            label="Schema category"
            value={draft.schema_category}
            onChange={(v) => set('schema_category', v)}
            placeholder="Aluminium sliding windows and doors"
          />
        </div>
        <TextArea
          label="Schema description"
          rows={2}
          limit={400}
          value={draft.schema_description}
          onChange={(v) => set('schema_description', v)}
        />
      </Card>

      <div className="ad__actions" style={{ marginBottom: '32px' }}>
        <button type="submit" className="ad-btn ad-btn--primary" disabled={saving}>
          <Icon name="save" size={13} /> {saving ? 'Saving…' : isNew ? 'Create system' : 'Save'}
        </button>
      </div>
      </form>

      {/* ── Variants ─────────────────────────────────────────────────
          OUTSIDE the form above, and it has to be: the panel has a form
          of its own, HTML has no nested forms, and every one of its
          buttons would otherwise submit the system. */}
      {isNew ? (
        <Card title="Variants" hint="The formats this system is built in.">
          <Empty title="Save the system first">
            A variant belongs to a system, so there is nothing for one to
            belong to until this is created. Create it and this panel becomes
            the place to add formats.
          </Empty>
        </Card>
      ) : (
        <VariantsPanel slug={slug} systemName={draft.name} reloadKey={savedAt} />
      )}
    </>
  )
}

/**
 * The order the twelve series appear in this system's grid.
 *
 * Arrows rather than drag-and-drop: twelve rows that each need to move one or
 * two places is exactly the case where clicking twice beats dragging once,
 * and it works from a keyboard without a second implementation.
 *
 * It repairs itself rather than trusting what it is given — a series added to
 * data/systems.js after this record was saved would otherwise never appear on
 * any existing system's page, and one removed would leave a hole the grid
 * renders as `undefined`.
 */
function SeriesOrder({ value, onChange }) {
  const known = SERIES_OPTION_ORDER
  const order = useMemo(() => {
    const valid = (value || []).filter((id) => known.includes(id))
    const missing = known.filter((id) => !valid.includes(id))
    return [...valid, ...missing]
  }, [value, known])

  const move = (index, by) => {
    const target = index + by
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="ad-field">
      <span className="ad-field__label">Grid order</span>
      <p className="ad-field__hint" style={{ marginBottom: '8px' }}>
        All twelve, in the order this page lists them — the ones that suit the
        system usually come first.
      </p>
      <div className="ad-rep">
        {order.map((id, index) => (
          <div className="ad-rep__row" key={id}>
            <span
              className="ad-input"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span style={{ color: 'var(--ad-faint)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              {SERIES[id].name}
            </span>
            <div className="ad-rep__controls">
              <button
                type="button"
                className="ad-btn ad-btn--sm ad-btn--ghost"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${SERIES[id].name} up`}
              >
                <Icon name="arrowUp" size={11} />
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--sm ad-btn--ghost"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move ${SERIES[id].name} down`}
              >
                <Icon name="arrowDown" size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
