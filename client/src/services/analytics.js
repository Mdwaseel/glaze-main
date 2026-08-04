/**
 * The public analytics beacon.
 *
 * Deliberately fire-and-forget: every call swallows its own errors. Analytics
 * is the least important thing on the page and must never be able to surface
 * an error to a visitor or block a render.
 *
 * Nothing identifying is sent. The server derives a daily-rotating
 * pseudonymous hash from the request itself (see analytics/models.py); the
 * only thing this module contributes is a per-tab session id, held in
 * sessionStorage so it dies with the tab and is never a tracking cookie.
 */

import { BASE_URL } from './api'

const SESSION_KEY = 'glz_session'

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    // Safari in private mode throws on sessionStorage. A missing session id
    // costs a little grouping accuracy and nothing else.
    return ''
  }
}

/** Admin routes are staff working, not site traffic — counting them would
 *  pollute the very numbers the admin is looking at. */
function isTrackable(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('/admin')
}

export function trackPageView(path, title) {
  if (!isTrackable(path)) return

  const payload = JSON.stringify({
    path,
    title: title || document.title,
    // Same-origin referrers are noise: they describe internal navigation,
    // which the path series already shows. Only external sources are useful.
    referrer: document.referrer && !document.referrer.includes(location.host)
      ? document.referrer
      : '',
    session: sessionId(),
  })

  fetch(`${BASE_URL}/analytics/track/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    // No credentials: the beacon is anonymous and sending auth cookies to it
    // would be gratuitous.
    keepalive: true,
  }).catch(() => {})
}

/**
 * Report how long a page was open.
 *
 * sendBeacon rather than fetch: it is the only request browsers guarantee to
 * flush during pagehide. A normal fetch is cancelled when the document goes
 * away, so this measurement would be lost precisely when it is taken.
 */
export function trackDuration(path, durationMs) {
  if (!isTrackable(path) || !durationMs || durationMs < 1000) return

  const body = JSON.stringify({ path, duration_ms: Math.round(durationMs) })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon?.(`${BASE_URL}/analytics/duration/`, blob)) return
  } catch {
    // fall through to fetch
  }
  fetch(`${BASE_URL}/analytics/duration/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}
