import { useEffect, useRef } from 'react'

/**
 * Element-level resize observation.
 *
 * General-purpose infrastructure for sections whose layout depends on
 * their own box rather than the viewport (the Systems rail and the
 * Contact map card are the expected consumers).
 *
 * ⚠ Deliberately NOT used by useScrollSequence. The original sequence
 * controller listens to `window.resize`, which fires on viewport changes
 * only. A ResizeObserver additionally fires on layout-driven size
 * changes and delivers an extra callback right after observe() — that
 * would re-run setHeight/resize/draw at different moments than the
 * static site does. Parity beats tidiness there.
 *
 * @param {React.RefObject<Element>} ref element to observe
 * @param {(entry: ResizeObserverEntry) => void} callback
 */
export function useResizeObserver(ref, callback) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const el = ref?.current
    if (!el || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(function (entries) {
      for (const entry of entries) callbackRef.current(entry)
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [ref])
}

export default useResizeObserver
