import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackDuration, trackPageView } from '@/services/analytics'

/**
 * Records a page view on every route change, and the dwell time on the way out.
 *
 * Mounted once, in App. A passive effect rather than a layout effect on
 * purpose — this must never sit between the router and paint.
 *
 * The `lastPath` ref is what makes the duration correct: by the time the
 * effect cleanup runs, `pathname` already holds the NEW route, so reporting
 * against it would attribute every visit's dwell time to the page the visitor
 * moved to rather than the one they just left.
 */
export function usePageTracking() {
  const { pathname } = useLocation()
  const enteredAt = useRef(Date.now())
  const lastPath = useRef(pathname)

  useEffect(() => {
    trackPageView(pathname)
    enteredAt.current = Date.now()
    lastPath.current = pathname

    // pagehide, not beforeunload: beforeunload is ignored by the back/forward
    // cache and is unreliable on mobile Safari, which is where a tab is most
    // likely to be closed rather than navigated away from.
    const report = () => trackDuration(lastPath.current, Date.now() - enteredAt.current)
    window.addEventListener('pagehide', report)

    return () => {
      window.removeEventListener('pagehide', report)
      report()
    }
  }, [pathname])
}
