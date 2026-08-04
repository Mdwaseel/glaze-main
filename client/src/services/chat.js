/**
 * Site assistant API.
 *
 * There is deliberately NO provider key anywhere in this file, or anywhere
 * else in client/. The browser talks to our own /chat/ endpoint and Django
 * talks to Groq. A key reachable from the bundle is a key anyone can lift out
 * of the network tab and spend — which is also why it is not a VITE_ variable,
 * since those are compiled into the shipped JavaScript.
 */

import { api } from './api'

/** sessionStorage, not localStorage: the thread should end with the tab. */
const SESSION_KEY = 'glz-chat-session'

export function readSessionKey() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || ''
  } catch {
    // Safari in private mode throws on any storage access. The chat still
    // works, it just starts a fresh thread on each message.
    return ''
  }
}

function writeSessionKey(key) {
  try {
    if (key) sessionStorage.setItem(SESSION_KEY, key)
  } catch {
    /* see above */
  }
}

/**
 * Ask a question.
 *
 * `history` is trimmed to the last few turns here rather than server-side so
 * the request stays small; the backend trims again, because a client is not
 * something to trust about payload size.
 */
export async function ask({ question, history = [], path = '' }) {
  const data = await api.post('/chat/', {
    question,
    session: readSessionKey(),
    path,
    history: history.slice(-6).map(({ role, content }) => ({ role, content })),
  })

  writeSessionKey(data.session)
  return data
}

export function fetchSuggestions() {
  return api.get('/chat/suggestions/')
}

/**
 * Forget the thread.
 *
 * Drops the session key so the NEXT question opens a new server-side
 * conversation. The old one is left in the database on purpose — it is what
 * the admin panel reads to find questions the site could not answer, and
 * deleting it because a visitor pressed "start over" would throw away the most
 * useful signal the assistant produces.
 */
export function resetSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem('glz-chat-thread')
  } catch {
    /* private mode — nothing was stored to begin with */
  }
}
