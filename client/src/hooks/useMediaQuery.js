import { useEffect, useState } from 'react'

/**
 * Live media-query flag.
 *
 * Unlike useReducedMotion — which reads matchMedia once and never listens,
 * because the static pages did the same — this one SUBSCRIBES. It exists
 * for the portrait frame sequences, and a phone being rotated has to swap
 * the frame set it is painting; a one-shot read would leave a landscape
 * viewport scrubbing 9:16 frames until the next full reload.
 *
 * SSR/no-matchMedia safe: returns false rather than throwing.
 *
 * @param {string} query e.g. '(max-width: 768px) and (orientation: portrait)'
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)

    // Re-read on subscribe: between the initial useState and this effect
    // the viewport may already have changed (a rotation during hydration).
    setMatches(mql.matches)

    const onChange = (e) => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export default useMediaQuery
