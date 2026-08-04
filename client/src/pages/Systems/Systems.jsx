import SystemsSection from '@/components/sections/home/SystemsSection'
import SEO, { absoluteUrl, graph } from '@/components/common/SEO'
import { useCatalogue } from '@/context/CatalogueContext'
import { productPath, ROUTES } from '@/constants/routes'
import './systemsPage.css'

/**
 * /systems — the collection.
 *
 * NO STATIC ORIGINAL. This is hero.html's §Systems carousel given a page of
 * its own, rendered by the SAME component: the section is imported from
 * `sections/home/`, unchanged, rather than copied. It still renders on the
 * homepage too — this page is a second mount of one component, not a second
 * copy of it, so a card added in the admin panel appears in both places at
 * once and there is only ever one thing to keep in step.
 *
 * Why the page exists: "Systems" is the first item in the nav on every page
 * of the site, and as a hash on Home it meant two different things depending
 * on where you were standing — a scroll on the homepage, a navigation-then-
 * scroll from anywhere else, with the whole homepage loading first either
 * way. A route means one thing from everywhere.
 *
 * (Two mounts, never at once: they are separate routes, so the duplicate
 * `id="systems"` and the section's other authored ids are never in the
 * document together.)
 *
 * The head is <SEO>'s, like every other route. The ItemList it carries is
 * generated from the catalogue, so this page's machine-readable description
 * of the collection cannot disagree with the carousel the visitor sees.
 */
const META_DESCRIPTION =
  'Every Glaze aluminium window and door system — sliding, casement, ' +
  'tilt & turn, lift & slide, bi-fold, pivot and fixed — in one place.'

export default function Systems() {
  const { systems } = useCatalogue()

  return (
    <main className="sysp" id="top">
      <SEO
        title="Systems — Glaze | The Collection"
        description={META_DESCRIPTION}
        path={ROUTES.SYSTEMS}
        schema={graph([
          {
            '@type': 'CollectionPage',
            name: 'Glaze window and door systems',
            description: META_DESCRIPTION,
            url: absoluteUrl(ROUTES.SYSTEMS),
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: systems.length,
              itemListElement: systems.map((system, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: system.name,
                url: absoluteUrl(productPath(system.slug)),
              })),
            },
          },
        ])}
      />
      <SystemsSection />
    </main>
  )
}
