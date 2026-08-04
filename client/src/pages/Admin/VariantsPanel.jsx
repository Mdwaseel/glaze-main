import { useCallback, useEffect, useState } from 'react'
import { adminApi, toCatalogueBody } from '@/services/admin'
import { useToast } from '@/components/admin/Toast'
import { Card, Empty, Loading, TextArea, TextField, Toggle } from '@/components/admin/ui'
import { MediaField, RowList } from '@/components/admin/repeatable'
import Icon from '@/components/admin/Icon'
import { slugify } from '@/utils/format'

/**
 * The variants of one system — §04 on its page, and the variant list in both
 * enquiry forms.
 *
 * This is the screen the brief asked for in as many words: "the page stays
 * the same as it is now in the product page, only the variants will be added
 * over there". Adding a row here puts the format on the system page's rail
 * and into both forms, published, with nothing rebuilt and nothing deployed.
 *
 * The list is on the left and the editor on the right, the same shape as
 * Categories & authors, because it is the same job: a short reference list
 * where you spend more time scanning than typing.
 *
 * ⚠ ORDER IS THE RAIL. These are not rows in a table that happen to have a
 * sequence — the section is scrolled through one variant at a time, in this
 * order, and the numbers 01, 02, 03 down the rail are these positions. Moving
 * one saves immediately (one request for the whole list, so a move cannot
 * interleave with another into an order nobody chose) rather than waiting for
 * a Save on the form beside it, which would be editing two different things
 * with one button.
 */

const EMPTY = {
  key: '',
  name: '',
  kind: '',
  lede: '',
  specs: [],
  video: '',
  video_file: null,
  poster: '',
  poster_file: null,
  is_published: true,
}

const FILE_FIELDS = ['video_file', 'poster_file']
const JSON_FIELDS = ['specs']
const SERVER_ONLY = ['id', 'system', 'system_slug', 'order', 'updated_at', 'video_url', 'poster_url']

export default function VariantsPanel({ slug, systemName, reloadKey }) {
  const [items, setItems] = useState([])
  const [state, setState] = useState('loading')
  const [draft, setDraft] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState(null)
  const toast = useToast()

  const load = useCallback((signal) => {
    setState('loading')
    return adminApi
      .listVariants(slug, signal)
      .then((data) => {
        setItems(data)
        setState('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setState('failed')
      })
  }, [slug])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load, reloadKey])

  const set = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }))

  const reset = () => {
    setDraft(EMPTY)
    setEditingId(null)
    setErrors(null)
  }

  const edit = (variant) => {
    setDraft({ ...EMPTY, ...variant })
    setEditingId(variant.id)
    setErrors(null)
  }

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setErrors(null)

    const fields = { ...draft }
    SERVER_ONLY.forEach((key) => delete fields[key])
    const body = toCatalogueBody(fields, FILE_FIELDS, JSON_FIELDS)

    try {
      if (editingId) {
        await adminApi.updateVariant(editingId, body)
        toast.success('Variant updated.')
      } else {
        await adminApi.createVariant(slug, body)
        toast.success(`${draft.name} added to ${systemName}.`)
      }
      reset()
      await load()
    } catch (error) {
      setErrors(error.fields || null)
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (variant) => {
    if (!window.confirm(
      `Delete “${variant.name}”?\n\n` +
      'It leaves the system page and both enquiry forms immediately. ' +
      'To take it off the site without losing it, untick Published instead.',
    )) return

    try {
      await adminApi.deleteVariant(variant.id)
      if (editingId === variant.id) reset()
      toast.success('Variant deleted.')
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const move = async (index, by) => {
    const target = index + by
    if (target < 0 || target >= items.length || busy) return

    const keys = items.map((item) => item.key)
    ;[keys[index], keys[target]] = [keys[target], keys[index]]

    setBusy(true)
    // Optimistic: the rail is the point of this control and waiting a round
    // trip to see a row move makes it feel broken. The reload below is what
    // makes the server the authority if the two ever disagree.
    setItems(keys.map((key) => items.find((item) => item.key === key)))
    try {
      const data = await adminApi.reorderVariants(slug, keys)
      setItems(data)
    } catch (error) {
      toast.error(error.message)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const togglePublished = async (variant) => {
    try {
      await adminApi.updateVariant(variant.id, { is_published: !variant.is_published })
      await load()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const fieldError = (key) => {
    const value = errors?.[key]
    return Array.isArray(value) ? value.join(' ') : value
  }

  return (
    <Card
      title={`Variants${items.length ? ` · ${items.length}` : ''}`}
      hint={`The formats ${systemName || 'this system'} is built in. Each one is a full-screen panel on the system page and an option in both enquiry forms.`}
    >
      <div className="ad-grid ad-grid--2">
        {/* ── The rail, in order ─────────────────────────────────── */}
        <div>
          {state === 'loading' && <Loading rows={4} />}
          {state === 'failed' && <Empty title="Could not load the variants" />}
          {state === 'ready' && items.length === 0 && (
            <Empty title="No variants yet">
              The system page renders no §04 at all until there is one — an
              empty section is worse than none. Add the first on the right.
            </Empty>
          )}

          {state === 'ready' && items.length > 0 && (
            <div className="ad-table-wrap">
              <table className="ad-table" style={{ minWidth: 'auto' }}>
                <thead>
                  <tr>
                    <th scope="col" className="ad-table__num">#</th>
                    <th scope="col">Variant</th>
                    <th scope="col"><span className="ad-table__actions">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((variant, index) => (
                    <tr key={variant.id}>
                      <td className="ad-table__num" style={{ fontFamily: 'var(--font-mono)' }}>
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td>
                        <span className="ad-table__title">{variant.name}</span>
                        {!variant.is_published && (
                          <> <span className="ad-pill ad-pill--archived">Hidden</span></>
                        )}
                        <p className="ad-table__sub">
                          {[variant.kind, variant.key].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td>
                        <div className="ad-table__actions">
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            onClick={() => move(index, -1)}
                            disabled={index === 0 || busy}
                            aria-label={`Move ${variant.name} up`}
                          >
                            <Icon name="arrowUp" size={11} />
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            onClick={() => move(index, 1)}
                            disabled={index === items.length - 1 || busy}
                            aria-label={`Move ${variant.name} down`}
                          >
                            <Icon name="arrowDown" size={11} />
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            onClick={() => edit(variant)}
                            aria-label={`Edit ${variant.name}`}
                          >
                            <Icon name="edit" size={12} />
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            onClick={() => togglePublished(variant)}
                            aria-label={variant.is_published
                              ? `Hide ${variant.name}`
                              : `Publish ${variant.name}`}
                          >
                            <Icon name={variant.is_published ? 'x' : 'check'} size={12} />
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--danger"
                            onClick={() => remove(variant)}
                            aria-label={`Delete ${variant.name}`}
                          >
                            <Icon name="trash" size={12} />
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

        {/* ── The editor ─────────────────────────────────────────── */}
        <form onSubmit={save}>
          <p className="ad-card__title" style={{ marginBottom: '12px' }}>
            {editingId ? 'Edit variant' : 'New variant'}
          </p>

          <TextField
            label="Name" required
            value={draft.name}
            onChange={(value) => setDraft((previous) => ({
              ...previous,
              name: value,
              // The key follows the name only while creating: it is the
              // clip's filename and a stable handle, so changing it later
              // has to be deliberate.
              key: editingId ? previous.key : slugify(value),
            }))}
            error={fieldError('name')}
            hint="As a specifier would name it — “3 Track Sliding Door”."
          />
          <TextField
            label="Key" required
            value={draft.key}
            onChange={(v) => set('key', slugify(v))}
            error={fieldError('key')}
            hint="Unique within this system, and the clip's filename."
          />
          <TextField
            label="Kind"
            value={draft.kind}
            onChange={(v) => set('kind', v)}
            error={fieldError('kind')}
            hint="The eyebrow over the name: Window, Door, Door &amp; Screen."
          />
          <TextArea
            label="Lede"
            rows={2}
            limit={200}
            value={draft.lede}
            onChange={(v) => set('lede', v)}
            error={fieldError('lede')}
            hint="ONE sentence, ~55–65 characters. It sits over the clip, and every line of prose in front of the picture is a line of the product hidden."
          />

          <RowList
            label="Specification"
            hint="Four rows, label over value. Architectural — tracks, panels, weights — not prose."
            value={draft.specs}
            onChange={(v) => set('specs', v)}
            addLabel="Add row"
            max={4}
            columns={[
              { key: 'k', label: 'Label', placeholder: 'Tracks', width: 1 },
              { key: 'v', label: 'Value', placeholder: '2', width: 1 },
            ]}
          />

          <MediaField
            label="Clip"
            hint="1600px wide, CRF 26 — a full-bleed background loop does not need the 9 Mbps a camera gives you, and eleven of them at that rate is forty megabytes of page."
            kind="video"
            path={draft.video}
            onPath={(v) => set('video', v)}
            file={draft.video_file}
            onFile={(f) => set('video_file', f)}
            resolved={draft.video_url}
          />
          <MediaField
            label="Poster"
            hint="The clip's first frame. The panels are preload=none and stay paused until they are reached, so without a poster the stage is black until then."
            kind="image"
            accept="image/webp,image/jpeg,image/png"
            path={draft.poster}
            onPath={(v) => set('poster', v)}
            file={draft.poster_file}
            onFile={(f) => set('poster_file', f)}
            resolved={draft.poster_url}
          />

          <Toggle
            checked={draft.is_published}
            onChange={(v) => set('is_published', v)}
            label="Published"
            hint="Off removes it from the system page and both enquiry forms, and keeps the record."
          />

          <div className="ad__actions">
            <button
              type="submit"
              className="ad-btn ad-btn--primary"
              disabled={saving || !draft.name.trim() || !draft.key.trim()}
            >
              {saving ? 'Saving…' : editingId ? 'Update variant' : 'Add variant'}
            </button>
            {editingId && (
              <button type="button" className="ad-btn ad-btn--ghost" onClick={reset}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </Card>
  )
}
