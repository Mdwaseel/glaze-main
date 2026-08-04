import { useState } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * One-shot reduced-motion flag, read on first render and never updated —
 * matching the static pages, which read matchMedia once per script and
 * never subscribed to changes.
 */
export function useReducedMotion() {
  const [reduceMotion] = useState(prefersReducedMotion)
  return reduceMotion
}

export default useReducedMotion
