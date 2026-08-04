import HeroSection from '@/components/sections/home/HeroSection'
import PhilosophySection from '@/components/sections/home/PhilosophySection'
import DayNightSection from '@/components/sections/home/DayNightSection'
import ArchSection from '@/components/sections/home/ArchSection'
import SystemsSection from '@/components/sections/home/SystemsSection'
import LabSection from '@/components/sections/home/LabSection'
import PerformanceSection from '@/components/sections/home/PerformanceSection'
import ProcessSection from '@/components/sections/home/ProcessSection'
import TestimonialsSection from '@/components/sections/home/TestimonialsSection'
import SEO, { absoluteUrl, graph } from '@/components/common/SEO'
import { useCatalogue } from '@/context/CatalogueContext'
import { productPath, ROUTES } from '@/constants/routes'

/**
 * Home — port of hero.html, complete.
 *
 * The static page has no <main> wrapper: sections are direct children of
 * <body>, between the nav drawer and the footer. RootLayout reproduces
 * that order, so this page renders sections bare.
 */
export default function Home() {
  const { systems } = useCatalogue()

  return (
    <>
      <SEO
        title="Glaze — Premium Aluminium Window & Door Systems"
        description="Aluminium window and door systems engineered to disappear into the architecture — sliding, casement, tilt & turn, lift & slide, bi-fold, pivot and fixed. Designed and installed from Hyderabad."
        path="/"
        schema={graph([
          /* An ItemList of the collection, generated from the catalogue.
             It is the machine-readable form of what this page actually
             shows — the carousel — so a system published in the panel
             enters it with nothing to update here. */
          {
            '@type': 'ItemList',
            name: 'Glaze window and door systems',
            numberOfItems: systems.length,
            itemListElement: systems.map((system, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: system.name,
              url: absoluteUrl(productPath(system.slug)),
            })),
          },
          {
            '@type': 'CollectionPage',
            url: absoluteUrl('/'),
            /* No BreadcrumbList: home is the root, and a one-item trail
               is furniture. Same reason /systems and /about have none. */
            significantLink: absoluteUrl(ROUTES.SYSTEMS),
          },
        ])}
      />
      <HeroSection />
      <PhilosophySection />
      <DayNightSection />
      <ArchSection />
      <SystemsSection />
      <LabSection />
      <PerformanceSection />
      <ProcessSection />
      <TestimonialsSection />
    </>
  )
}
