import { Navigate, useParams } from 'react-router-dom'
import { useCatalogue } from '@/context/CatalogueContext'
import { productPath } from '@/constants/routes'
import SystemPage from './SystemPage'

/**
 * Route wrapper for the six system pages.
 *
 * Its only job is the `key`. `/products/:slug` is ONE route serving six
 * pages, so moving from Sliding to Casement would otherwise keep the same
 * component mounted and merely re-render it — and every section
 * controller on this page is an imperative port that captured its DOM
 * nodes when it ran. The series accordion would still be bound to the
 * previous system's twelve cards, the glass and finish switchers to
 * layers React had since re-ordered, and the marquee to tracks it had
 * already cloned.
 *
 * Keying on the slug remounts the whole page, which is exactly what the
 * static site did: each system was a separate document and following a
 * cross-link was a full page load.
 */
export default function SystemRoute() {
  const { slug } = useParams()
  const { bySlug } = useCatalogue()

  // ⚠ `/products/pivot.html` MATCHES THIS ROUTE, with slug = "pivot.html".
  //
  // It therefore never reaches the app's catch-all, and the LEGACY_PATHS
  // redirect there never saw it. SYSTEMS["pivot.html"] is undefined, so
  // SystemPage's unknown-slug guard sent it to Sliding — every old
  // `products/<name>.html` link quietly served the WRONG system rather than a
  // blank page, which is the harder version of the bug to notice. Measured:
  // /products/pivot.html rendered "Sliding. Effortless by design."
  //
  // Normalising here rather than in SystemPage keeps the URL canonical (an
  // extensionless path in the address bar and for search engines) and avoids
  // running the page's dozen mount effects for a frame before redirecting.
  const canonical = slug?.replace(/\.html$/i, '')
  if (canonical !== slug && bySlug[canonical]) {
    return <Navigate to={productPath(canonical)} replace />
  }

  return <SystemPage key={slug} />
}
