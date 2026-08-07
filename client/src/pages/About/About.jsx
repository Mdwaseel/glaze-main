import { useEffect } from 'react'
import AboutHeroSection from '@/components/sections/about/AboutHeroSection'
import OriginSection from '@/components/sections/about/OriginSection'

import ProcessSection from '@/components/sections/about/ProcessSection'
import PartnersSection from '@/components/sections/about/PartnersSection'
import FactorySection from '@/components/sections/about/FactorySection'
import ManifestoSection from '@/components/sections/about/ManifestoSection'
import PeopleSection from '@/components/sections/about/PeopleSection'
import ValuesSection from '@/components/sections/about/ValuesSection'
import EcosystemSection from '@/components/sections/about/EcosystemSection'
import NumbersSection from '@/components/sections/about/NumbersSection'
import CodaSection from '@/components/sections/about/CodaSection'
import ContactSection from '@/components/sections/about/ContactSection'
import SEO, { ORGANIZATION_ID, graph } from '@/components/common/SEO'
import { useScrollTriggerRefresh } from '@/hooks'
import {
  useAboutWordReveal,
  useAboutCountUp,
  useAboutFadeReveal,
  useMagneticButtons,
  useCursorCompanion,
} from '@/hooks/about'
import '@/styles/about-global.css'

/**
 * About — port of about.html.
 *
 * This is the page SHELL: the `page-about` scope and the page-level
 * systems from <script id="about-base-script">. (The preloader used to be
 * here too — it is now site-wide, in RootLayout.) Content
 * sections land here one phase at a time, in the original DOM order:
 *
 *   01 AboutHero · 02 Origin · 02b Process · 03b Partners
 *   04 Factory · 05 Manifesto · 06 People (ships hidden) · 07 Values
 *   08 Numbers · 10 Coda · 11 Contact
 *
 * §03 TwoWorlds is absent — removed at the client's request, not missed in
 * the port. See the note at its former mount point.
 *
 * ⚠ ONE SECTION IS NOT FROM about.html: AssemblySection, mounted between
 * Origin and Process. It is original content, not a port — see the note
 * at its mount point below and in docs/migration-log.md.
 *
 * Nav and Footer come from RootLayout, which selects the inner-page
 * variant by route. Lenis and the load-time ScrollTrigger refresh are the
 * shared implementations — about.html's are byte-identical to hero.html's.
 *
 * `page-about` goes on <body> rather than a wrapper element for two
 * reasons: two of the scoped rules target the body itself (about.html's
 * body ground is --arch-black where Home's is --arch-white), and
 * about.html has no wrapper around its sections — adding one would put a
 * div in the DOM that the original does not have. See
 * styles/about-global.css for the full list of scoped selectors.
 *
 * The base-script systems query `document`, exactly as the original does;
 * they are mounted only by this page, so they are inert everywhere else.
 */
export default function About() {
  // Applied on mount and removed on unmount, so a route change back to
  // Home cannot inherit About's ground colour or its scoped base rules.
  useEffect(() => {
    document.body.classList.add('page-about')
    return () => document.body.classList.remove('page-about')
  }, [])

  // Shared with Home — identical implementations in about.html.
  useScrollTriggerRefresh()

  // About-only base-script systems.
  useAboutWordReveal()
  useAboutFadeReveal()
  useAboutCountUp()
  useMagneticButtons()
  useCursorCompanion()

  return (
    <>
      <SEO
        title="About — Glaze | Designed to Disappear"
        description="Who Glaze is: the factory, the people and the process behind aluminium window and door systems engineered to disappear into the architecture."
        path="/about"
        schema={graph([
          {
            '@type': 'AboutPage',
            name: 'About Glaze Window Systems',
            mainEntity: { '@id': ORGANIZATION_ID },
          },
        ])}
      />
      {/* ⚠ THE PRELOADER MOVED TO RootLayout. about.html was the only
          original that ran one, so it was mounted here; it is now the
          animated GLAZE mark and opens the whole site, once per session,
          on whichever public page is landed on first. This hero still
          waits on 'glaze:reveal-hero', which the Loader announces from
          the layout whether it plays or is gated off. */}
      <AboutHeroSection />
      <OriginSection />

      <ProcessSection />
      {/* §03 TwoWorlds (the Europe / India split panel) REMOVED at the
          client's request. The component, its animation and its stylesheet
          are still in components/sections/about/TwoWorldsSection/ — unmounted
          rather than deleted, so putting it back is one line.

          Its images stay in /images/about/ regardless: worlds-europe.webp is
          also used by the Contact page's enquiry section, so deleting them
          would break a page that has nothing to do with this change. */}
      <PartnersSection />
      <FactorySection />
      <ManifestoSection />
      {/* Ships parked behind the `hidden` attribute, as in about.html. */}
      <PeopleSection />
      <ValuesSection />
      {/* §07b The Brio Ecosystem — NOT from about.html. New content, and
          the second section on this page that is not a port (see
          AssemblySection above). It sits here because this is where the
          page stops describing how Glaze builds and starts describing who
          Glaze belongs to — the last thing said before the figures. */}
      <EcosystemSection />
      <NumbersSection />
      <CodaSection />
      {/* §11 Contact is the last section. The FOOTER that follows it in
          about.html comes from RootLayout (Phase 2), not from here. */}
      <ContactSection />
    </>
  )
}
