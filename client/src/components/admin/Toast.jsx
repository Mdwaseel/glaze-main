import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

/**
 * Toast notifications for the admin panel.
 *
 * The container is an aria-live region so a screen reader announces "Settings
 * saved" without moving focus. `polite`, not `assertive` — these confirm what
 * the user just did; interrupting them mid-sentence to say so would be worse
 * than waiting for a pause.
 *
 * Errors do NOT auto-dismiss. A success message that vanishes is fine because
 * the result is visible on screen anyway; an error that vanishes before it is
 * read leaves someone stuck with no idea what failed.
 */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback((message, tone = 'ok') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    if (tone !== 'error') {
      setTimeout(() => dismiss(id), 4000)
    }
    return id
  }, [dismiss])

  const value = useMemo(() => ({
    toast: push,
    success: (message) => push(message, 'ok'),
    error: (message) => push(message, 'error'),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ad-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`ad-toast ad-toast--${toast.tone}`}>
            <Icon name={toast.tone === 'error' ? 'x' : 'check'} size={15} />
            <span>{toast.message}</span>
            <button
              type="button"
              className="ad-toast__close"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
