import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/services/admin'
import { primeCsrf } from '@/services/api'
import Icon from '@/components/admin/Icon'
import '@/styles/admin.css'

/**
 * Admin sign-in.
 *
 * The brief asked for the submit button to stay disabled until the captcha is
 * solved. That is done here as a UI affordance ONLY — it tells the user what
 * is still missing. It is not a security control and is not treated as one:
 * a disabled button is a DOM attribute anyone can flip from the console, so
 * the server verifies the captcha independently on every request and refuses
 * without it. Client-side gating that the server trusts is not a gate.
 *
 * What actually protects this form lives on the backend (account/captcha.py,
 * account/security.py, AdminLoginView):
 *
 *   - HMAC-signed, single-use, expiring captcha; the answer never leaves the
 *     server, only a keyed MAC of it
 *   - per-account and per-IP lockout with exponential backoff
 *   - per-IP rate limit in front of both
 *   - Argon2id password verification
 *   - one identical error for a wrong password and a valid non-staff account,
 *     so neither confirms anything to an attacker
 *
 * Note what this component does NOT do: it never sees, stores or forwards a
 * token. The session arrives as HttpOnly cookies that this code cannot read.
 */
export default function AdminLogin() {
  const { isAuthed, status, login } = useAuth()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '', answer: '' })
  const [challenge, setChallenge] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [lockedFor, setLockedFor] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef(null)

  const loadChallenge = useCallback(async () => {
    setForm((prev) => ({ ...prev, answer: '' }))
    try {
      setChallenge(await authApi.captcha())
    } catch {
      setChallenge({ error: true })
    }
  }, [])

  useEffect(() => {
    // Prime the CSRF cookie before the first POST rather than during it, so
    // the sign-in click is one round trip instead of two.
    primeCsrf()
    loadChallenge()
  }, [loadChallenge])

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  // Live countdown while locked out, so the wait is visible rather than the
  // form silently refusing.
  useEffect(() => {
    if (lockedFor <= 0) return undefined
    const timer = setInterval(() => setLockedFor((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(timer)
  }, [lockedFor])

  if (status === 'checking') {
    return <div className="ad-login"><div className="ad-login__card" aria-busy="true" /></div>
  }

  if (isAuthed) {
    return <Navigate to={location.state?.from || '/admin'} replace />
  }

  const internal = challenge?.provider === 'internal'
  const solved = internal ? form.answer.trim().length > 0 : true
  const ready = form.email.trim() && form.password && solved && !busy && lockedFor === 0

  const submit = async (event) => {
    event.preventDefault()
    if (!ready) return

    setBusy(true)
    setError('')

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
        captcha_token: challenge?.token,
        captcha_answer: form.answer,
      })
      // On success the AuthProvider flips to 'authed' and the <Navigate>
      // above takes over — nothing to do here.
    } catch (err) {
      setError(err.message || 'Sign-in failed.')
      if (err.status === 429 && err.body?.retry_after) {
        setLockedFor(err.body.retry_after)
      }
      // Always a fresh challenge after a failure: the previous one is either
      // burned (correct answer, wrong password) or wrong. Reusing it would
      // guarantee a second failure and look like the form was broken.
      loadChallenge()
      setForm((prev) => ({ ...prev, password: '' }))
      setBusy(false)
    }
  }

  return (
    <div className="ad-login">
      <div className="ad-login__card">
        <div className="ad-login__brand">
          <p className="ad-login__mark">Glaze</p>
          <p className="ad-login__sub">Studio · Administrator access</p>
        </div>

        {error && (
          <div className="ad-login__error" role="alert">
            {error}
            {lockedFor > 0 && (
              <> Try again in {Math.floor(lockedFor / 60)}m {lockedFor % 60}s.</>
            )}
          </div>
        )}

        <form onSubmit={submit} noValidate>
          <div className="ad-field">
            <label className="ad-field__label" htmlFor="ad-email">Email address</label>
            <input
              id="ad-email"
              ref={emailRef}
              className="ad-input"
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="ad-field">
            <label className="ad-field__label" htmlFor="ad-password">Password</label>
            <div className="ad-input-wrap">
              <input
                id="ad-password"
                className="ad-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              {/* A reveal, not a "show password" checkbox below the field.
                  Typing a long password blind into a form that locks the
                  account after five tries is how people get locked out.
                  aria-pressed carries the state to a screen reader, which
                  the visible label alone would not. */}
              <button
                type="button"
                className="ad-input-wrap__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {internal && (
            <div className="ad-field">
              <label className="ad-field__label" htmlFor="ad-captcha">
                Type the characters shown
              </label>
              <div className="ad-captcha">
                <div
                  className="ad-captcha__image"
                  /* The SVG comes from our own server, freshly generated per
                     request, and contains only <rect>/<path>/<text>/<circle>
                     built from a fixed alphabet — see account/captcha.py
                     render_svg. No user input reaches it. */
                  dangerouslySetInnerHTML={{ __html: challenge.image }}
                />
                <button
                  type="button"
                  className="ad-captcha__reload"
                  onClick={loadChallenge}
                  aria-label="Get a new captcha image"
                  title="New image"
                >
                  <Icon name="refresh" />
                </button>
              </div>
              <input
                id="ad-captcha"
                className="ad-input"
                style={{ marginTop: '12px' }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck="false"
                required
                value={form.answer}
                onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))}
              />
              <p className="ad-field__hint">
                Not case sensitive. The image expires after five minutes.
              </p>
            </div>
          )}

          {challenge?.error && (
            <div className="ad-login__error" role="alert">
              Could not load the captcha. The server may be unreachable.{' '}
              <button
                type="button"
                className="ad-btn ad-btn--sm ad-btn--ghost"
                onClick={loadChallenge}
              >
                Retry
              </button>
            </div>
          )}

          <button
            type="submit"
            className="ad-btn ad-btn--primary ad-login__submit"
            disabled={!ready}
          >
            <Icon name="lock" size={14} />
            {busy ? 'Signing in…' : lockedFor > 0 ? 'Locked' : 'Sign in'}
          </button>

          {/* Says WHY the button is disabled. A dead button with no
              explanation is the most common form dead end there is. */}
          {!ready && !busy && lockedFor === 0 && (
            <p className="ad-field__hint" style={{ textAlign: 'center', marginTop: '12px' }}>
              {!form.email.trim() || !form.password
                ? 'Enter your email and password to continue.'
                : 'Solve the captcha to enable sign-in.'}
            </p>
          )}
        </form>

        <p className="ad-login__foot">
          Authorised personnel only. Every attempt is logged.
        </p>
      </div>
    </div>
  )
}
