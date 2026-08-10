import SEO, { ORGANIZATION_ID, absoluteUrl, breadcrumbSchema, graph } from '@/components/common/SEO'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import GallerySection from '@/components/sections/gallery/GallerySection'
import { ROUTES } from '@/constants/routes'
import './galleryPage.css'

/**
 * /gallery — completed work, photographed and filmed.
 *
 * The page is a shell: the breadcrumb, the head tags, and <GallerySection>,
 * which owns the fetch, the filters, the grid and the lightbox. Same split as
 * every other route on this site — the page decides what is on it, the
 * section decides how it behaves.
 *
 * ⚠ NO ImageGallery / ImageObject SCHEMA, and that is deliberate rather than
 * an omission. Marking up images requires the URLs to be in the markup at
 * crawl time, and this list is fetched client-side from an editable table
 * that is empty on a fresh install: a graph node built from it would be
 * either absent, stale, or a promise about pictures the crawler cannot see.
 * The page carries a CollectionPage that describes what it IS; when the
 * gallery is populated and worth marking up image by image, that belongs in
 * the server's own rendering, not here.
 *
 * ⚠ IT IS UNDER "ABOUT" IN THE NAV, not at the top level. The bar is five
 * items and stays five; the gallery answers "can these people actually do
 * it", which is what About is for.
 */
const META_DESCRIPTION =
  'Glaze aluminium window and door systems in finished buildings — photography ' +
  'and film of completed villas, apartments and commercial projects across India.'

export default function Gallery() {
  const trail = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About', path: ROUTES.ABOUT },
    { name: 'Gallery', path: ROUTES.GALLERY },
  ]

  return (
    <main className="galp" id="top">
      <SEO
        title="Gallery — Glaze | Completed Projects"
        description={META_DESCRIPTION}
        path={ROUTES.GALLERY}
        schema={graph([
          {
            '@type': 'CollectionPage',
            '@id': `${absoluteUrl(ROUTES.GALLERY)}#webpage`,
            name: 'Glaze — project gallery',
            description: META_DESCRIPTION,
            url: absoluteUrl(ROUTES.GALLERY),
            about: { '@id': ORGANIZATION_ID },
            publisher: { '@id': ORGANIZATION_ID },
          },
          breadcrumbSchema(trail),
        ])}
      />

      <div className="galp__top">
        <Breadcrumbs trail={trail} />
      </div>

      <GallerySection />
    </main>
  )
}
