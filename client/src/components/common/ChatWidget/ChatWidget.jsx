import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ask, fetchSuggestions, resetSession } from '@/services/chat'
import './chatWidget.css'

/**
 * The site assistant.
 *
 * Answers only from what is published on this site. When retrieval finds
 * nothing solid the backend returns `deflected`, and this renders the contact
 * card instead of prose — the route out is a first-class UI state, not an
 * apology buried in a paragraph.
 *
 * ACCESSIBILITY — the two decisions worth knowing about:
 *
 * 1. NON-MODAL, AND THEREFORE NO FOCUS TRAP. An earlier version declared
 *    aria-modal="false" and trapped Tab inside the panel anyway. Those
 *    contradict: a non-modal dialog is one you can leave, and trapping focus
 *    inside a panel that overlays a page people still want to read makes the
 *    page unreachable by keyboard while it is open. Escape closes and returns
 *    focus to the launcher; Tab behaves normally. The panel is last in the DOM
 *    so forward-tabbing out of it exits the page rather than walking the whole
 *    site.
 *
 * 2. The transcript is a polite live region, so answers are announced as they
 *    arrive rather than being something to go hunting for.
 *
 * It is NOT rendered on admin routes; RootLayout decides that.
 */

const STORE_KEY = 'glz-chat-thread'
/** Distance from the bottom, in px, still treated as "following the thread". */
const FOLLOW_THRESHOLD = 90
/** Composer ceiling. Past this the field stops growing and starts scrolling. */
const COMPOSER_MAX = 132

function Icon({ name }) {
  const paths = {
    chat: 'M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-4-.9L3 20l1.2-4.4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 11.5 3 8.4 8.4 0 0 1 21 11.5Z',
    close: 'M18 6 6 18 M6 6l12 12',
    send: 'M4 12h15 M13 6l6 6-6 6',
    down: 'M12 5v14 M6 13l6 6 6-6',
    refresh: 'M3 12a9 9 0 0 1 15.5-6.2L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-15.5 6.2L3 16 M3 21v-5h5',
    retry: 'M3 12a9 9 0 1 0 3-6.7 M3 4v5h5',
    spark: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.6 5.6l2.8 2.8 M15.6 15.6l2.8 2.8 M18.4 5.6l-2.8 2.8 M8.4 15.6l-2.8 2.8',
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name].split(' M').map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  )
}

const GREETING = {
  role: 'assistant',
  intro: true,
  content:
    "Ask me anything about our systems — sizes, performance figures, glass, finishes. I answer from what's published on this site, and I'll point you to the team for anything I can't cover.",
}

/**
 * Restore the thread on mount.
 *
 * The session key already survives a refresh in sessionStorage, so the SERVER
 * still has the conversation. Without this the panel came back empty while the
 * backend kept answering with full context — the visitor would see a blank
 * thread reply to something it appeared never to have been told.
 */
function loadThread() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) && parsed.length ? parsed : [GREETING]
  } catch {
    return [GREETING]
  }
}

export default function ChatWidget({ pathname = '' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadThread)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [following, setFollowing] = useState(true)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const logRef = useRef(null)
  const titleId = useId()

  const empty = messages.length === 1 && messages[0].intro

  // ── Persist the thread ───────────────────────────────────────────
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)))
    } catch {
      /* private mode — the panel still works, it just will not survive a refresh */
    }
  }, [messages])

  // ── Suggestions, fetched on first open only ──────────────────────
  // Not on mount: that would cost every visitor a request for a panel most of
  // them never open.
  useEffect(() => {
    if (!open || suggestions.length) return undefined
    let cancelled = false
    fetchSuggestions()
      .then((data) => { if (!cancelled) setSuggestions(data.suggestions || []) })
      .catch(() => { /* the panel is fine without them */ })
    return () => { cancelled = true }
  }, [open, suggestions.length])

  // ── Focus in on open, back to the launcher on close ──────────────
  useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
    launcherRef.current?.focus()
    return undefined
  }, [open])

  // ── Escape closes. No focus trap — see the note at the top. ──────
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  // ── Lock the page behind the mobile sheet ────────────────────────
  // The sheet covers the viewport, so letting the page scroll underneath means
  // closing it drops the visitor somewhere they never navigated to. Matched to
  // the 640px breakpoint in the stylesheet.
  useEffect(() => {
    if (!open || !window.matchMedia('(max-width: 640px)').matches) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [open])

  // ── Auto-scroll, but only while the reader is following ──────────
  // Yanking someone to the bottom while they are scrolled up re-reading an
  // earlier answer is hostile. useLayoutEffect so it lands before paint and
  // never shows a frame at the old offset.
  useLayoutEffect(() => {
    const log = logRef.current
    if (log && following) log.scrollTop = log.scrollHeight
  }, [messages, busy, following])

  // ── Grow the composer with its content ───────────────────────────
  // Reset to auto first: scrollHeight only ever reports the content height
  // when the element is not already stretched to fit it, so without the reset
  // the box grows and never shrinks back.
  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    const full = el.scrollHeight
    el.style.height = `${Math.min(full, COMPOSER_MAX)}px`
    // ⚠ A textarea defaults to overflow:auto, and the field is sized to its
    // own content — so the box is permanently a sub-pixel short of what it
    // holds and Chrome paints a scrollbar (with arrows, on Windows) inside an
    // empty one-line composer. Overflow is therefore driven from the measured
    // height: hidden while the field is still growing, auto only once it has
    // hit the ceiling and there is genuinely something to scroll to. Doing
    // this in CSS alone is not possible — the condition is a measurement.
    el.style.overflowY = full > COMPOSER_MAX ? 'auto' : 'hidden'
  }, [draft, open])

  const onLogScroll = useCallback(() => {
    const log = logRef.current
    if (!log) return
    const distance = log.scrollHeight - log.scrollTop - log.clientHeight
    setFollowing(distance < FOLLOW_THRESHOLD)
  }, [])

  const jumpToLatest = () => {
    const log = logRef.current
    if (!log) return
    setFollowing(true)
    // scrollTo does not honour prefers-reduced-motion on its own, so the
    // preference is read here rather than assumed.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }

  // ── Send ─────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const question = text.trim()
    if (!question || busy) return

    setDraft('')
    setFollowing(true)
    setBusy(true)
    setMessages((prev) => [...prev, { role: 'user', content: question }])

    try {
      const data = await ask({
        question,
        // The greeting is ours, not a real turn — sending it would waste
        // context and invite the model to treat it as precedent.
        history: messages.filter((m) => !m.intro && !m.failed),
        path: pathname,
      })
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
        deflected: data.deflected,
        contact: data.contact,
      }])
    } catch (error) {
      // Never surface the raw error. A visitor cannot act on "429" or on a
      // provider's billing state; they can act on "try again" or "contact us".
      const rateLimited = error?.status === 429
      setMessages((prev) => [...prev, {
        role: 'assistant',
        failed: true,
        retry: question,
        content: rateLimited
          ? "That's a few questions in quick succession — give me a moment, then try again."
          : 'Something went wrong at my end. Try again, or reach the team directly.',
      }])
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }, [busy, messages, pathname])

  const startOver = () => {
    resetSession()
    setMessages([GREETING])
    setDraft('')
    setFollowing(true)
    inputRef.current?.focus()
  }

  // Enter sends, Shift+Enter breaks the line. The composer is a textarea so a
  // three-line question is typable — a single-line input hides everything the
  // visitor has already written past its own width.
  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send(draft)
    }
  }

  const remaining = 500 - draft.length

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={`glz-chat__launcher${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close the assistant' : 'Ask the Glaze assistant'}
      >
        <span className="glz-chat__launcher-icon">
          <Icon name={open ? 'close' : 'chat'} />
        </span>
        <span className="glz-chat__launcher-text">Ask Glaze</span>
      </button>

      {open && (
        <div
          className="glz-chat__panel"
          role="dialog"
          aria-labelledby={titleId}
          /* ⚠ THE REASON THE TRANSCRIPT WOULD NOT SCROLL.
             Lenis runs site-wide (App.jsx → useLenis) and swallows wheel
             events for the whole document, translating them into its own
             animated window scroll. Any nested scroller is therefore dead
             under the mouse: the panel's overflow was correct all along, it
             just never received a wheel event. `data-lenis-prevent` is
             Lenis's own opt-out — it checks target.closest() for it and
             leaves the event alone, so native scrolling resumes.
             It sits on the PANEL, not only the log, so a wheel over the
             header or composer does not scroll the page away behind an open
             overlay either. The matching `overscroll-behavior: contain` for
             this attribute already exists in global.css. */
          data-lenis-prevent
        >
          <header className="glz-chat__head">
            <div className="glz-chat__head-text">
              <p className="glz-chat__eyebrow">
                <Icon name="spark" /> Site assistant
              </p>
              <h2 id={titleId} className="glz-chat__title">Ask Glaze</h2>
            </div>

            <div className="glz-chat__head-actions">
              {!empty && (
                <button
                  type="button"
                  className="glz-chat__icon-btn"
                  onClick={startOver}
                  title="Start a new conversation"
                  aria-label="Start a new conversation"
                >
                  <Icon name="refresh" />
                </button>
              )}
              <button
                type="button"
                className="glz-chat__icon-btn"
                onClick={() => setOpen(false)}
                aria-label="Close the assistant"
              >
                <Icon name="close" />
              </button>
            </div>
          </header>

          <div className="glz-chat__body">
            <div
              ref={logRef}
              className="glz-chat__log"
              onScroll={onLogScroll}
              role="log"
              aria-live="polite"
              aria-atomic="false"
              tabIndex={0}
              /* Also marked directly: this is the element that actually
                 scrolls, and the attribute should survive someone later
                 moving the log out of the panel wrapper. */
              data-lenis-prevent
            >
              {messages.map((message, index) => (
                <Bubble
                  key={index}
                  message={message}
                  onClose={() => setOpen(false)}
                  onRetry={() => send(message.retry)}
                />
              ))}

              {busy && (
                <div className="glz-chat__msg glz-chat__msg--assistant">
                  <span className="glz-chat__mark" aria-hidden="true">G</span>
                  <div className="glz-chat__bubble glz-chat__bubble--thinking">
                    <span className="glz-chat__dot" />
                    <span className="glz-chat__dot" />
                    <span className="glz-chat__dot" />
                    <span className="glz-chat__sr">Finding an answer</span>
                  </div>
                </div>
              )}

              {!busy && empty && suggestions.length > 0 && (
                <div className="glz-chat__suggestions">
                  <p className="glz-chat__suggestions-label">Try asking</p>
                  {suggestions.map((text) => (
                    <button
                      key={text}
                      type="button"
                      className="glz-chat__suggestion"
                      onClick={() => send(text)}
                    >
                      <span>{text}</span>
                      <Icon name="send" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Only while scrolled away from the newest message. Without it,
                someone reading back has no idea an answer has arrived. */}
            {!following && (
              <button
                type="button"
                className="glz-chat__jump"
                onClick={jumpToLatest}
                aria-label="Jump to the latest message"
              >
                <Icon name="down" />
              </button>
            )}
          </div>

          <form
            className="glz-chat__form"
            onSubmit={(event) => { event.preventDefault(); send(draft) }}
          >
            <label className="glz-chat__sr" htmlFor="glz-chat-input">Your question</label>

            {/* One bordered field containing the textarea, the counter and the
                send button, rather than a boxed input sitting next to a boxed
                button. Two adjacent borders read as two controls; this reads
                as the thing you type into. Focus is styled on the wrapper so
                the whole field lights up. */}
            <div className="glz-chat__composer">
              <textarea
                ref={inputRef}
                id="glz-chat-input"
                className="glz-chat__input"
                rows={1}
                value={draft}
                maxLength={500}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about a system, a size, a figure…"
                autoComplete="off"
                disabled={busy}
              />

              {/* Only near the ceiling. A counter sitting at 500 from the
                  first keystroke is noise. */}
              {remaining <= 80 && (
                <span className="glz-chat__count" aria-live="polite">
                  {remaining}
                </span>
              )}

              <button
                type="submit"
                className="glz-chat__send"
                disabled={busy || !draft.trim()}
                aria-label="Send question"
              >
                <Icon name="send" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

function Bubble({ message, onClose, onRetry }) {
  const mine = message.role === 'user'

  return (
    <div className={`glz-chat__msg glz-chat__msg--${mine ? 'user' : 'assistant'}`}>
      {/* A monogram, not an avatar image — it costs no request and gives the
          eye something to anchor on when scanning back through a long thread. */}
      {!mine && <span className="glz-chat__mark" aria-hidden="true">G</span>}

      <div className={`glz-chat__bubble${message.failed ? ' is-failed' : ''}`}>
        {message.content}

        {message.failed && message.retry && (
          <button type="button" className="glz-chat__retry" onClick={onRetry}>
            <Icon name="retry" /> Try again
          </button>
        )}

        {/* The deflection is a card with a real route out, not a sentence that
            mentions the contact page and leaves them to find it. */}
        {message.deflected && message.contact && (
          <div className="glz-chat__contact">
            <Link to="/contact" className="glz-chat__contact-cta" onClick={onClose}>
              Send an enquiry
            </Link>
            <div className="glz-chat__contact-direct">
              {message.contact.phone && (
                <a href={`tel:${message.contact.phone.replace(/\s/g, '')}`}>
                  {message.contact.phone}
                </a>
              )}
              {message.contact.email && (
                <a href={`mailto:${message.contact.email}`}>{message.contact.email}</a>
              )}
            </div>
          </div>
        )}

        {message.sources?.length > 0 && (
          <div className="glz-chat__sources">
            <span className="glz-chat__sources-label">From</span>
            {message.sources.map((source) => (
              <Link
                key={source.path}
                to={source.path}
                className="glz-chat__source"
                onClick={onClose}
              >
                {source.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
