import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { Field } from './ui'
import { assetUrl } from '@/services/api'

/**
 * The three controls the catalogue editor needs and nothing else in the panel
 * has: a list of strings, a list of rows with fixed columns, and a media slot
 * that is either a path or an upload.
 *
 * They live here rather than in ui.jsx because ui.jsx is the shared form
 * vocabulary — one control, one value — and these are all editors for a
 * COLLECTION. Mixing them in would make "which of these do I reach for" a
 * question with fifteen answers.
 *
 * All three are controlled and stateless: they take a value and an onChange,
 * hold nothing of their own, and never mutate the array they are given. A
 * repeatable field that mutates in place is the classic way to get a form
 * that looks saved and is not.
 */

/* ── A list of plain strings ───────────────────────────────────────── */

/**
 * Chips, paragraphs, spec lines — anything that is an ordered list of text.
 *
 * `multiline` swaps the input for a textarea, which is the difference between
 * editing the four overview chips and the two overview paragraphs.
 */
export function StringList({
  label, hint, value, onChange, placeholder, multiline, rows = 3, addLabel = 'Add', max,
}) {
  const id = useId()
  const items = value || []
  const full = max ? items.length >= max : false

  const set = (index, next) =>
    onChange(items.map((item, i) => (i === index ? next : item)))
  const remove = (index) => onChange(items.filter((_, i) => i !== index))
  const move = (index, by) => {
    const target = index + by
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <Field label={label} hint={hint} htmlFor={`${id}-0`}>
      <div className="ad-rep">
        {items.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div className="ad-rep__row" key={index}>
            {multiline ? (
              <textarea
                id={`${id}-${index}`}
                className="ad-textarea"
                rows={rows}
                value={item}
                placeholder={placeholder}
                onChange={(event) => set(index, event.target.value)}
              />
            ) : (
              <input
                id={`${id}-${index}`}
                className="ad-input"
                value={item}
                placeholder={placeholder}
                onChange={(event) => set(index, event.target.value)}
              />
            )}
            <RowControls
              index={index}
              count={items.length}
              onMove={move}
              onRemove={remove}
              what={label}
            />
          </div>
        ))}

        <button
          type="button"
          className="ad-btn ad-btn--sm ad-btn--ghost"
          onClick={() => onChange([...items, ''])}
          disabled={full}
        >
          <Icon name="plus" size={12} /> {addLabel}
        </button>
        {full && <span className="ad-field__hint">Maximum of {max}.</span>}
      </div>
    </Field>
  )
}

/* ── A list of rows with fixed columns ─────────────────────────────── */

/**
 * `columns` is [{ key, label, placeholder, width, multiline }].
 *
 * Used for the three shapes the catalogue stores as JSON: overview stats
 * ({to, dec, unit, key}), strengths ({title, copy}) and a variant's
 * specification rows ({k, v}). One component rather than three because the
 * only thing that differs between them is the column list — and a row editor
 * written three times is three places for the add button to behave slightly
 * differently.
 */
export function RowList({ label, hint, value, onChange, columns, addLabel = 'Add row', max }) {
  const items = value || []
  const full = max ? items.length >= max : false

  const blank = useMemo(
    () => Object.fromEntries(columns.map((column) => [column.key, ''])),
    [columns],
  )

  const set = (index, key, next) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: next } : item)))
  const remove = (index) => onChange(items.filter((_, i) => i !== index))
  const move = (index, by) => {
    const target = index + by
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <Field label={label} hint={hint}>
      <div className="ad-rep">
        {items.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <div className="ad-rep__row ad-rep__row--cols" key={index}>
            <div className="ad-rep__cols">
              {columns.map((column) => (
                <label className="ad-rep__col" key={column.key} style={{ flex: column.width || 1 }}>
                  <span className="ad-rep__col-label">{column.label}</span>
                  {column.multiline ? (
                    <textarea
                      className="ad-textarea"
                      rows={2}
                      value={item[column.key] ?? ''}
                      placeholder={column.placeholder}
                      onChange={(event) => set(index, column.key, event.target.value)}
                    />
                  ) : (
                    <input
                      className="ad-input"
                      value={item[column.key] ?? ''}
                      placeholder={column.placeholder}
                      onChange={(event) => set(index, column.key, event.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
            <RowControls
              index={index}
              count={items.length}
              onMove={move}
              onRemove={remove}
              what={label}
            />
          </div>
        ))}

        <button
          type="button"
          className="ad-btn ad-btn--sm ad-btn--ghost"
          onClick={() => onChange([...items, { ...blank }])}
          disabled={full}
        >
          <Icon name="plus" size={12} /> {addLabel}
        </button>
        {full && <span className="ad-field__hint">Maximum of {max}.</span>}
      </div>
    </Field>
  )
}

/** Move up / move down / remove, shared by both list editors. */
function RowControls({ index, count, onMove, onRemove, what }) {
  return (
    <div className="ad-rep__controls">
      <button
        type="button"
        className="ad-btn ad-btn--sm ad-btn--ghost"
        onClick={() => onMove(index, -1)}
        disabled={index === 0}
        aria-label={`Move ${what} ${index + 1} up`}
      >
        <Icon name="arrowUp" size={11} />
      </button>
      <button
        type="button"
        className="ad-btn ad-btn--sm ad-btn--ghost"
        onClick={() => onMove(index, 1)}
        disabled={index === count - 1}
        aria-label={`Move ${what} ${index + 1} down`}
      >
        <Icon name="arrowDown" size={11} />
      </button>
      <button
        type="button"
        className="ad-btn ad-btn--sm ad-btn--danger"
        onClick={() => onRemove(index)}
        aria-label={`Remove ${what} ${index + 1}`}
      >
        <Icon name="trash" size={11} />
      </button>
    </div>
  )
}

/* ── One media slot: a path OR an upload ───────────────────────────── */

/**
 * Every clip, still and poster in the catalogue is two fields — see the note
 * at the top of catalogue/models.py. This is the one control for both.
 *
 * The two ways of getting a file onto this site are both legitimate and
 * neither covers the other: the clips that shipped with the migration are
 * build assets under version control and referencing them by path costs
 * nothing, while someone adding a variant at 11pm has no way to put a file in
 * client/public and should not need one. The upload wins when both are set,
 * which is what makes "replace this clip" a thing you can do from here.
 */
export function MediaField({
  label, hint, path, onPath, file, onFile, resolved, accept = 'video/mp4,video/webm', kind = 'video',
}) {
  const inputRef = useRef(null)
  const id = useId()
  const [over, setOver] = useState(false)

  // Memoised and revoked: createObjectURL pins the whole File in memory until
  // something revokes it, and a fresh URL per render would leak a copy of a
  // 20MB clip on every keystroke elsewhere in the form.
  const objectUrl = useMemo(
    () => (file instanceof File ? URL.createObjectURL(file) : null),
    [file],
  )

  useEffect(() => {
    if (!objectUrl) return undefined
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const uploaded = typeof file === 'string' ? file : ''
  const preview = objectUrl || assetUrl(uploaded) || assetUrl(resolved) || assetUrl(path)

  const accepted = (picked) => {
    if (picked) onFile(picked)
  }

  return (
    <div className="ad-media">
      <Field label={label} hint={hint} htmlFor={id}>
        <input
          id={id}
          className="ad-input"
          value={path ?? ''}
          placeholder="/videos/variants/casement/single.mp4"
          onChange={(event) => onPath(event.target.value)}
        />
      </Field>

      <div
        className={`ad-upload ad-upload--slim${over ? ' is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          accepted(event.dataTransfer.files?.[0])
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        <Icon name="upload" size={16} />
        <span className="ad-upload__hint">
          {file instanceof File
            ? file.name
            : uploaded
              ? 'Uploaded — click to replace'
              : 'or upload a file'}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          onChange={(event) => accepted(event.target.files?.[0])}
        />
      </div>

      {preview && (
        <div className="ad-media__preview">
          {kind === 'video' ? (
            <video src={preview} muted loop playsInline preload="metadata" />
          ) : (
            <img src={preview} alt="" />
          )}
        </div>
      )}

      {(file instanceof File || uploaded) && (
        <button
          type="button"
          className="ad-btn ad-btn--sm ad-btn--ghost"
          onClick={() => onFile(null)}
        >
          <Icon name="x" size={11} /> Remove upload
        </button>
      )}
    </div>
  )
}
