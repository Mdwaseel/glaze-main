import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Icon from './Icon'
import { compactNumber } from '@/utils/format'

/**
 * Small form and layout primitives for the admin panel.
 *
 * They exist to make three rules impossible to forget rather than merely
 * conventional:
 *   - every control has a real <label> tied by id (never a placeholder
 *     standing in for one — the placeholder disappears the moment you type,
 *     leaving no way to check what the field was)
 *   - helper text and errors render next to the control they describe, not
 *     collected at the top of the form
 *   - character counters warn before the limit rather than truncating after
 */

/* ── Field ─────────────────────────────────────────────────────────── */

export function Field({ label, required, hint, error, children, htmlFor }) {
  return (
    <div className="ad-field">
      <label className="ad-field__label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ad-field__req" aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="ad-field__hint">{hint}</p>}
      {error && (
        <p className="ad-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function TextField({
  label, value, onChange, required, hint, error, limit, type = 'text', ...rest
}) {
  const id = useId()
  const length = String(value ?? '').length
  const over = limit ? length > limit : false

  return (
    <Field label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <input
        id={id}
        type={type}
        className="ad-input"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error || over ? 'true' : undefined}
        {...rest}
      />
      {limit && (
        <span className={`ad-count${over ? ' ad-count--over' : ''}`}>
          {length} / {limit}
        </span>
      )}
    </Field>
  )
}

export function TextArea({
  label, value, onChange, required, hint, error, limit, code, rows, ...rest
}) {
  const id = useId()
  const text = String(value ?? '')
  const over = limit ? text.length > limit : false

  return (
    <Field label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        className={`ad-textarea${code ? ' ad-textarea--code' : ''}`}
        value={text}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error || over ? 'true' : undefined}
        spellCheck={code ? 'false' : undefined}
        {...rest}
      />
      {limit ? (
        <span className={`ad-count${over ? ' ad-count--over' : ''}`}>
          {text.length} / {limit}
        </span>
      ) : code ? (
        /* Reading-time estimate on the body field, matching what the server
           computes on save (200 wpm) so the two never disagree. */
        <span className="ad-count">
          {text.length.toLocaleString()} chars · ~{Math.max(1, Math.ceil(
            text.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 200,
          ))} min read
        </span>
      ) : null}
    </Field>
  )
}

export function SelectField({ label, value, onChange, options, hint, required, error, placeholder }) {
  const id = useId()

  return (
    <Field label={label} required={required} hint={hint} error={error} htmlFor={id}>
      <select
        id={id}
        className="ad-select"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder ?? '— None —'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/* ── Toggle ────────────────────────────────────────────────────────── */

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="ad-toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="ad-toggle__track">
        <span className="ad-toggle__thumb" />
      </span>
      <span>
        <span className="ad-toggle__text">{label}</span>
        {hint && <span className="ad-toggle__hint" style={{ display: 'block' }}>{hint}</span>}
      </span>
    </label>
  )
}

/* ── Card ──────────────────────────────────────────────────────────── */

export function Card({ title, hint, actions, children, bodyless }) {
  return (
    <section className="ad-card">
      {(title || actions) && (
        <header className="ad-card__head">
          <div>
            {title && <h2 className="ad-card__title">{title}</h2>}
            {hint && <p className="ad-card__hint">{hint}</p>}
          </div>
          {actions && <div className="ad__actions">{actions}</div>}
        </header>
      )}
      {bodyless ? children : <div className="ad-card__body">{children}</div>}
    </section>
  )
}

/* ── Stat tile ─────────────────────────────────────────────────────── */

export function Stat({ label, value, change, suffix }) {
  // null means "no comparable previous window" — a dash is honest where an
  // arrow would invent a trend from a zero baseline.
  const direction = change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return (
    <div className="ad-stat">
      <p className="ad-stat__label">{label}</p>
      <p className="ad-stat__value">
        {typeof value === 'number' ? compactNumber(value) : value}
        {suffix && <span style={{ fontSize: '14px', opacity: 0.6 }}>{suffix}</span>}
      </p>
      <span className={`ad-stat__trend ad-stat__trend--${direction}`}>
        {change == null ? (
          '— no prior data'
        ) : (
          <>
            <Icon name={direction === 'down' ? 'arrowDown' : 'arrowUp'} size={11} />
            {Math.abs(change)}% vs previous
          </>
        )}
      </span>
    </div>
  )
}

/* ── Pill ──────────────────────────────────────────────────────────── */

export function Pill({ status, children }) {
  return <span className={`ad-pill ad-pill--${status}`}>{children ?? status}</span>
}

/* ── Empty state ───────────────────────────────────────────────────── */

export function Empty({ title, children, action }) {
  return (
    <div className="ad-empty">
      <p className="ad-empty__title">{title}</p>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  )
}

export function Loading({ rows = 5 }) {
  return (
    <div style={{ display: 'grid', gap: '12px' }} aria-busy="true" aria-live="polite">
      <span className="ad-skeleton ad-skeleton--tile" />
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} className="ad-skeleton" />
      ))}
    </div>
  )
}

/* ── Image upload ──────────────────────────────────────────────────── */

export function ImageUpload({ label, hint, value, previewUrl, onChange, onClear }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const id = useId()

  // A local File shows via object URL; an already-saved image shows via the
  // server URL. Both paths render the same preview box.
  //
  // Memoised and revoked, not called inline. createObjectURL pins the whole
  // File in memory until something revokes it, and calling it during render
  // would mint a fresh URL on every keystroke elsewhere in the form —
  // leaking a copy of a multi-megabyte image each time.
  const objectUrl = useMemo(
    () => (value instanceof File ? URL.createObjectURL(value) : null),
    [value],
  )

  useEffect(() => {
    if (!objectUrl) return undefined
    return () => URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  const preview = objectUrl || previewUrl

  const accept = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    onChange(file)
  }

  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div
        className={`ad-upload${over ? ' is-over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          accept(event.dataTransfer.files?.[0])
        }}
        /* A div is not focusable or operable by default. Making it a button
           in the accessibility tree, reachable by Tab and activated by
           Enter/Space, is what keeps this usable without a mouse. */
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
      >
        {preview ? (
          <img className="ad-upload__preview" src={preview} alt="" />
        ) : (
          <Icon name="upload" size={22} />
        )}
        <span className="ad-upload__hint">
          {preview ? 'Click or drop to replace' : 'Click or drag to upload'}
        </span>
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept="image/webp,image/jpeg,image/png"
          hidden
          onChange={(event) => accept(event.target.files?.[0])}
        />
      </div>
      {preview && onClear && (
        <button
          type="button"
          className="ad-btn ad-btn--sm ad-btn--ghost"
          style={{ marginTop: '8px' }}
          onClick={onClear}
        >
          <Icon name="x" size={12} /> Remove image
        </button>
      )}
    </Field>
  )
}
