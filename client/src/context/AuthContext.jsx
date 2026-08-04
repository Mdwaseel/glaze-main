import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError } from '@/services/api'
import { authApi } from '@/services/admin'

/**
 * Admin session state.
 *
 * There is no token in here, and there cannot be: the JWT pair lives in
 * HttpOnly cookies that page JavaScript is not permitted to read. "Am I
 * logged in?" is therefore not a question this app can answer locally — it is
 * answered by calling /auth/me/ and seeing whether the cookies the browser
 * attached were accepted.
 *
 * That is the right shape. A `localStorage.getItem('token')` check is a claim
 * the client makes about itself; this is the server's answer. It also means a
 * revoked or expired session is discovered on the next request rather than
 * being trusted until some client-side expiry timer says otherwise.
 *
 * `status` is a three-state, not a boolean:
 *   'checking'  the initial /auth/me/ is in flight — render nothing decisive
 *   'authed'    confirmed staff session
 *   'anon'      confirmed no session
 * Collapsing this to `user === null` would flash the login screen on every
 * refresh before the check completed.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('checking')

  const check = useCallback(async () => {
    try {
      const me = await authApi.me()
      // A valid non-staff account must not reach the panel. The API refuses
      // it on every endpoint anyway; this stops the shell rendering first and
      // erroring on each panel afterwards.
      if (!me?.is_staff) {
        setUser(null)
        setStatus('anon')
        return
      }
      setUser(me)
      setStatus('authed')
    } catch {
      setUser(null)
      setStatus('anon')
    }
  }, [])

  useEffect(() => {
    check()
  }, [check])

  const login = useCallback(async (payload) => {
    const data = await authApi.adminLogin(payload)
    setUser(data.user)
    setStatus('authed')
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // A failed logout call still means the user intends to be logged out.
      // Clearing locally is the honest response; the refresh cookie expires
      // on its own and the server blacklists it when it is next presented.
    }
    setUser(null)
    setStatus('anon')
  }, [])

  const value = useMemo(
    () => ({ user, status, isAuthed: status === 'authed', login, logout, refresh: check }),
    [user, status, login, logout, check],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

export { ApiError }
