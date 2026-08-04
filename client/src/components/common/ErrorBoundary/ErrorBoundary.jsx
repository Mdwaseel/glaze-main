import { Component } from 'react'
import './errorBoundary.css'

/**
 * The safety net under the whole app.
 *
 * There was none. React unmounts the entire tree when a render throws and
 * nothing catches it, so a single bad component anywhere in the site produced
 * exactly the same symptom as the missing catch-all route: a white screen with
 * no message, no navigation and no way back. Two different causes, one
 * indistinguishable failure — which is what made this hard to describe.
 *
 * The missing route is fixed in App.jsx. This covers the other cause: a throw
 * now renders something a visitor can act on, and — in dev only — the actual
 * error, so the next one takes minutes to diagnose rather than a bisect.
 *
 * WHY A CLASS. Error boundaries have no hook equivalent; getDerivedStateFromError
 * and componentDidCatch are class-only APIs. This is the one component in the
 * codebase that has to be one.
 *
 * WHAT IT DOES NOT CATCH, so nobody trusts it too far: event handlers, async
 * code (a rejected fetch inside a .then), and anything thrown during SSR.
 * Those need their own try/catch — the services layer already handles its own.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Kept deliberately: without it the stack is lost the moment the fallback
    // renders, and a production white screen leaves nothing to go on.
    console.error('[glaze] render error', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="eb" role="alert">
        <div className="eb__inner">
          <p className="eb__eyebrow">Something broke</p>
          <h1 className="eb__title">This page didn’t load.</h1>
          <p className="eb__body">
            An error on our side stopped it rendering. Reloading usually clears
            it — if it doesn’t, the team would like to know.
          </p>

          <div className="eb__actions">
            {/* A full reload, not a router navigation: the React tree is in an
                unknown state and re-rendering it is what just failed. */}
            <button
              type="button"
              className="eb__cta"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            <a className="eb__link" href="/">Back to home</a>
          </div>

          {/* Dev only. A stack trace on a production marketing site tells a
              visitor nothing and an attacker something. */}
          {import.meta.env.DEV && (
            <pre className="eb__trace">{String(error?.stack || error)}</pre>
          )}
        </div>
      </div>
    )
  }
}
