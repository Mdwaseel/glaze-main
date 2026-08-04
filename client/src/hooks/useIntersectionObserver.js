import { useEffect, useState, useRef } from 'react'

/**
 * Custom hook to detect when an element enters the viewport.
 * Useful for scroll-triggered animations (replacing IntersectionObserver boilerplate).
 *
 * @param {Object} options - IntersectionObserver options
 * @returns {[React.RefObject, boolean]} - [ref to attach, isIntersecting flag]
 */
export const useIntersectionObserver = (options = {}) => {
  const ref = useRef(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, { threshold: 0.1, ...options })

    observer.observe(element)
    return () => observer.disconnect()
  }, [options])

  return [ref, isIntersecting]
}

export default useIntersectionObserver
