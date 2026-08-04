/**
 * The single fetch wrapper every API call goes through.
 *
 * Four things it owns, so that no call site has to think about them:
 *
 *   credentials  Auth is a pair of HttpOnly cookies. Page JavaScript cannot
 *                read them by design, so every request sends `credentials:
 *                'include'` and the browser attaches them. Nothing here ever
 *                touches a token.
 *
 *   CSRF         Cookie-borne credentials are attached by the browser to
 *                cross-origin requests too, so the backend enforces CSRF. We
 *                prime the `csrftoken` cookie once and echo it back as the
 *                X-CSRFToken header on every unsafe method.
 *
 *   refresh      The access token lives 15 minutes. On a 401 we call
 *                /auth/refresh/ ONCE and replay the original request. All
 *                concurrent 401s share one refresh promise — five parallel
 *                admin panels each firing their own refresh would rotate the
 *                token five times and blacklist four of them, logging the
 *                user out mid-session.
 *
 *   errors       A non-2xx becomes a thrown ApiError carrying `status` and
 *                the parsed DRF body, so components can branch on
 *                `err.fields` for per-field messages instead of parsing
 *                strings.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

/** Methods the backend considers state-changing, and therefore CSRF-protected. */
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  constructor(status, body) {
    // DRF puts a single message in `detail` and per-field errors at the top
    // level; take whichever is present so `err.message` is always readable.
    const message =
      body?.detail ||
      (typeof body === 'string' ? body : null) ||
      `Request failed (${status})`
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body ?? null
    this.fields = body && typeof body === 'object' && !body.detail ? body : null
  }
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[2]) : null
}

/**
 * Ask the server to set the csrftoken cookie.
 *
 * Deduped through a module-level promise: the admin shell mounts several
 * panels at once and they would otherwise each prime the token.
 */
let csrfPrimer = null
export function primeCsrf() {
  if (readCookie('csrftoken')) return Promise.resolve()
  if (!csrfPrimer) {
    csrfPrimer = fetch(`${BASE_URL}/auth/csrf/`, { credentials: 'include' })
      .catch(() => {})
      .finally(() => { csrfPrimer = null })
  }
  return csrfPrimer
}

/** Shared across concurrent 401s — see the `refresh` note above. */
let refreshPromise = null
function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': readCookie('csrftoken') || '' },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

async function parse(response) {
  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) return response.text()
  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * @param {string} path      e.g. '/blog/posts/' — always leading-slashed
 * @param {object} options
 * @param {FormData|object} options.body  FormData is passed through untouched
 *                                        so the browser can set the multipart
 *                                        boundary; anything else is JSON.
 * @param {boolean} options.auth  false skips the refresh-and-retry dance for
 *                                genuinely public endpoints, so an anonymous
 *                                visitor never triggers a pointless refresh.
 */
export async function request(path, { method = 'GET', body, params, auth = true, signal } = {}) {
  let url = `${BASE_URL}${path}`

  if (params) {
    const query = new URLSearchParams(
      // Drop empty filters so `?category=` never reaches the backend as a
      // filter on the empty string.
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString()
    if (query) url += `?${query}`
  }

  const isFormData = body instanceof FormData
  const headers = {}
  if (body && !isFormData) headers['Content-Type'] = 'application/json'

  if (UNSAFE.has(method)) {
    await primeCsrf()
    headers['X-CSRFToken'] = readCookie('csrftoken') || ''
  }

  const init = {
    method,
    credentials: 'include',
    headers,
    signal,
    ...(body !== undefined && { body: isFormData ? body : JSON.stringify(body) }),
  }

  let response = await fetch(url, init)

  if (response.status === 401 && auth) {
    const refreshed = await refreshSession()
    if (refreshed) {
      // The CSRF cookie may have been rotated by the refresh, so re-read it
      // rather than replaying the stale header.
      if (UNSAFE.has(method)) init.headers['X-CSRFToken'] = readCookie('csrftoken') || ''
      response = await fetch(url, init)
    }
  }

  const payload = await parse(response)
  if (!response.ok) throw new ApiError(response.status, payload)
  return payload
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

/**
 * Absolute URL for a media path the API returned.
 *
 * DRF serialises ImageField as `/media/…` when no request is in the
 * serializer context. The SPA runs on a different origin in development, so a
 * bare `/media/…` would resolve against :5173 and 404.
 */
export function mediaUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${BASE_URL.replace(/\/api\/v1$/, '')}${path}`
}

/**
 * Absolute URL for any asset path the catalogue returns.
 *
 * The catalogue holds two kinds of path and they resolve against different
 * origins, which is why this is not just mediaUrl():
 *
 *   /videos/sliding.mp4   a BUILD asset, shipped in client/public. It belongs
 *                         to the site's own origin and must be left alone —
 *                         sent through mediaUrl() it would be fetched from
 *                         the Django server, which has never heard of it.
 *   /media/catalogue/…    an UPLOAD, served by Django from MEDIA_ROOT. On a
 *                         separate dev origin a bare path would resolve
 *                         against :5173 and 404.
 *
 * Anything already absolute is returned untouched.
 */
export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return path.startsWith('/media/') ? mediaUrl(path) : path
}

export { BASE_URL }
