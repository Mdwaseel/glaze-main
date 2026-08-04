import { useLayoutEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useCatalogue } from '@/context/CatalogueContext'
import SEO, { ORGANIZATION_ID, absoluteUrl, breadcrumbSchema, graph } from '@/components/common/SEO'
import { productPath, ROUTES } from '@/constants/routes'
import {
  useSystemNavHeight,
  useProductsScrollBridge,
  useProductsEntrance,
  useProductsMagnetic,
} from '@/hooks/products'
import { reset as resetSpec } from '@/utils/glz'
import SystemHeroSection from '@/components/sections/products/SystemHeroSection'
import OverviewSection from '@/components/sections/products/OverviewSection'
import VariantsSection from '@/components/sections/products/VariantsSection'
import SeriesSection from '@/components/sections/products/SeriesSection'
import HardwareSection from '@/components/sections/products/HardwareSection'
import GlassSection from '@/components/sections/products/GlassSection'
import FinishSection from '@/components/sections/products/FinishSection'
import BenefitsSection from '@/components/sections/products/BenefitsSection'
import PartnersMarqueeSection from '@/components/sections/products/PartnersMarqueeSection'
import SystemEnquirySection from '@/components/sections/products/SystemEnquirySection'
import TestimonialsSection from '@/components/sections/home/TestimonialsSection'
import OtherSystemsSection from '@/components/sections/products/OtherSystemsSection'
import '@/styles/products-global.css'

/**
 * SystemPage — port of products/sliding.html, lift-and-slide.html,
 * bi-fold.html, casement.html, pivot.html and fixed.html.
 *
 * ONE component for all six. The files are 3,895 lines each and differ by
 * roughly forty-four — the head tags, the hero, the overview copy and
 * numbers, the order of the series grid, and the five cross-links at the
 * foot. Every one of those differences is data, and it lives in
 * data/systems.js; everything else, including all 2,100 lines of CSS and
 * all thirteen scripts, is identical between them. `products/_system.html`
 * sits in the same folder as the template they were generated from, so
 * this is the authored structure rather than a compression of it.
 *
 * Sections in the originals' DOM order:
 *
 *   01 Hero · 03 Overview · 05 Series · 06 Hardware · 07 Glass ·
 *   08 Finish · 09 Benefits · 10 Partners · 11 Enquiry ·
 *   Testimonials · Other systems
 *
 * (The numbering is the originals' own and is not contiguous — there is
 * no §02, §04 or §12 in the markup.)
 *
 * ⚠ TESTIMONIALS IS HOME'S COMPONENT, imported unchanged. The section's
 * markup, its 120 lines of CSS and its marquee script were all verified
 * identical to hero.html's, which is already migrated — and the original's
 * own comment on the section reads "the homepage component, unchanged".
 *
 * Nav and Footer come from RootLayout. The nav here is hero.html's
 * component with `aria-current` on Systems; the footer is the shared one.
 *
 * ⚠ NO PRELOADER, as on Contact — only about.html runs one.
 *
 * ⚠ `useScrollTriggerRefresh` is NOT mounted. None of the thirteen
 * scripts registers a load refresh; the only `ScrollTrigger.refresh()` on
 * these pages belongs to the series accordion, which calls it when the
 * panel finishes opening and the page has actually changed height.
 */
export default function SystemPage() {
  const { slug } = useParams()
  const { systems, bySlug } = useCatalogue()
  const system = bySlug[slug]

  // `page-products` scopes the four base rules in products-global.css and
  // the two `.enq` names this page shares with Contact. A LAYOUT effect,
  // for the same reason as Contact's: several of those rules change how
  // the page is laid out (`[id]`'s scroll-margin, `img/video`'s display),
  // and applying them after the first paint would show a frame of the
  // wrong thing.
  useLayoutEffect(() => {
    if (!system) return
    document.body.classList.add('page-products')
    return () => document.body.classList.remove('page-products')
  }, [system])

  // Each original ships its own copy of the GLZ script with `system:`
  // hard-coded; in an SPA the module is evaluated once and survives every
  // route change, so the store is put back to this system's opening state
  // on mount. Without it, walking Sliding → Casement would carry Sliding's
  // series and glass into a Casement enquiry. LAYOUT effect so the value
  // is right before the enquiry section's own layout effect paints from it.
  useLayoutEffect(() => {
    if (system) resetSpec(system.name)
  }, [system])

  /* The <title>, meta description and Product schema used to be two
     hand-rolled effects here, appending elements to <head> and removing them
     on unmount. They are the <SEO> component below now — same mechanism, one
     implementation, and it also carries the canonical, the Open Graph pair
     and the breadcrumb that this page had none of. */

  // Page-level systems, one per script in the originals.
  useSystemNavHeight()
  useProductsScrollBridge()
  useProductsEntrance()
  useProductsMagnetic()

  // An unknown slug is not a page — /products/anything-else goes to the
  // first system in the catalogue rather than rendering an empty shell.
  // (Was hard-coded to 'sliding'; the first system is now whatever the
  // catalogue's order says it is, and an empty catalogue cannot redirect
  // anywhere, so that case falls through to the 404.)
  if (!system) {
    const first = systems[0]
    return <Navigate to={first ? productPath(first.slug) : ROUTES.HOME} replace />
  }

  return (
    <>
      <SEO
        title={system.title}
        description={system.description}
        path={productPath(system.slug)}
        image={system.card.poster || system.card.image || undefined}
        schema={graph([
          {
            '@type': 'Product',
            '@id': `${absoluteUrl(productPath(system.slug))}#product`,
            name: system.schema.name,
            category: system.schema.category,
            description: system.schema.description,
            brand: { '@type': 'Brand', name: 'Glaze Window Systems' },
            manufacturer: { '@id': ORGANIZATION_ID },
            url: absoluteUrl(productPath(system.slug)),
            image: absoluteUrl(system.card.poster || system.card.image || '/og-default.jpg'),
            /* ⚠ NO Offer AND NO AggregateRating. Both are things the
               checklist asks for on a product page and both would be
               invented here: nothing on this site is priced, and there are
               no collected reviews. Fabricated review markup is a manual
               action, not a ranking boost. `additionalProperty` carries what
               the page ACTUALLY claims — the tested figures — instead. */
            additionalProperty: (system.overview.stats || []).map((stat) => ({
              '@type': 'PropertyValue',
              name: stat.key,
              value: `${stat.to}${stat.unit ? ` ${stat.unit}` : ''}`,
            })),
            /* Each variant is a real, named configuration of this system —
               which is what hasVariant is for, and it is generated from the
               catalogue so a variant added in the panel appears here too. */
            hasVariant: (system.variants || []).map((variant) => ({
              '@type': 'Product',
              name: `${system.name} — ${variant.name}`,
              description: variant.lede,
              image: absoluteUrl(variant.poster || '/og-default.jpg'),
            })),
          },
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Systems', path: ROUTES.SYSTEMS },
            { name: system.name, path: productPath(system.slug) },
          ]),
        ])}
      />
      <SystemHeroSection system={system} />
      <main>
        <OverviewSection system={system} />
        {/* §04 Variants — NEW, not in the originals. Sits between the
            claim and the catalogue on purpose: Overview argues what the
            system is, Variants shows the shapes it comes in, Series says
            which profile carries each one. Renders nothing for a system
            with no clips yet (Lift & Slide) — see data/variants.js. */}
        <VariantsSection system={system} />
        <SeriesSection system={system} />
        <HardwareSection />
        <GlassSection />
        <FinishSection />
        <BenefitsSection />
        <PartnersMarqueeSection />
        <SystemEnquirySection system={system} />
        <TestimonialsSection />
        <OtherSystemsSection system={system} />
      </main>
    </>
  )
}
