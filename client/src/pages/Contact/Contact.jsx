import { useLayoutEffect } from 'react'
import {
  useContactWordReveal,
  useContactFadeReveal,
  useContactMagneticButtons,
  useContactCursorCompanion,
  useContactParallax,
} from '@/hooks/contact'
import HeaderSection from '@/components/sections/contact/HeaderSection'
import EnquirySection from '@/components/sections/contact/EnquirySection'
import TrustSection from '@/components/sections/contact/TrustSection'
import VisitSection from '@/components/sections/contact/VisitSection'
import MapSection from '@/components/sections/contact/MapSection'
import SEO, { ORGANIZATION_ID, faqSchema, graph } from '@/components/common/SEO'
import FaqSection from '@/components/common/FaqSection'
import { CONTACT_FAQS } from '@/data/faqs'
import '@/styles/contact-global.css'

/**
 * Contact — port of contact.html.
 *
 * This is the page SHELL: the `page-contact` scope and the page-level
 * systems from <script id="contact-base-script"> and
 * <script id="contact-parallax-script">. All five sections are mounted
 * below, in the original DOM order:
 *
 *   01 Header · 02 Form + image split · 03 Trust signals ·
 *   04 Visit CTA · 05 Map
 *
 * Nav and Footer come from RootLayout, which already selects the
 * inner-page variant for this route (aria-current on Contact, the
 * `sheen` / `data-magnetic` CTAs, and the inner Explore column).
 * Lenis is the shared implementation — contact.html's Lenis block is
 * byte-identical to hero.html's and about.html's.
 *
 * ⚠ NO PRELOADER. Unlike about.html, contact.html ships no loader, so
 * none is mounted here.
 *
 * ⚠ NO COUNT-UPS. contact.html carries zero [data-count-to] elements, so
 * there is no Contact equivalent of useAboutCountUp.
 *
 * `page-contact` goes on <body> rather than a wrapper element for the
 * same two reasons as About: several scoped rules target the body itself
 * (Contact's ground is --arch-bone where Home's is --arch-white and
 * About's is --arch-black), and contact.html has no wrapper around its
 * sections — adding one would put a div in the DOM the original does not
 * have. See styles/contact-global.css for the full list of scoped
 * selectors.
 *
 * The base-script systems query `document`, exactly as the original does;
 * they are mounted only by this page, so they are inert everywhere else.
 *
 * ⚠ `useScrollTriggerRefresh` is deliberately NOT mounted. contact.html's
 * base script registers no load refresh — the only `load → refresh` on
 * this page belongs to <script id="contact-parallax-script">, and it sits
 * INSIDE that script's reduced-motion guard. useContactParallax carries
 * it for exactly that reason; the shared hook is unconditional and would
 * add a refresh a reduced-motion visitor never gets on the static page.
 */
export default function Contact() {
  // Applied on mount and removed on unmount, so a route change away
  // cannot inherit Contact's ground colour or its scoped base rules.
  //
  // ⚠ LAYOUT effect, not a passive one (About's `page-about` is passive
  // and can afford to be). `.nav` carries `transition: background-color
  // 0.4s ease`, and `:where(.page-contact) .nav` is what turns the bar
  // solid. From a passive effect the nav paints once with navbar.css's
  // transparent-to-dark gradient and then *transitions* to the solid
  // colour over 400 ms — a fade-in on every page load that contact.html,
  // where the rule is intrinsic to the document, never shows. A layout
  // effect applies the class before first paint, so the solid bar is the
  // element's initial computed value and no transition is triggered.
  useLayoutEffect(() => {
    document.body.classList.add('page-contact')
    return () => document.body.classList.remove('page-contact')
  }, [])

  // Contact-only base-script systems.
  useContactWordReveal()
  useContactFadeReveal()
  useContactMagneticButtons()
  useContactCursorCompanion()
  // <script id="contact-parallax-script"> — one query over §02 and §04.
  useContactParallax()

  return (
    <>
      <SEO
        title="Contact — Glaze | Designed to Disappear"
        description="Talk to Glaze about a project. Request a consultation, visit the Jubilee Hills showroom in Hyderabad, or call +91 76750 23939. We reply within one working day."
        path="/contact"
        schema={graph([
          {
            '@type': 'ContactPage',
            name: 'Contact Glaze Window Systems',
            mainEntity: { '@id': ORGANIZATION_ID },
          },
          /* Same array <FaqSection> renders below — see faqSchema(). */
          faqSchema(CONTACT_FAQS),
        ])}
      />
      <HeaderSection />
      <EnquirySection />
      <TrustSection />
      <VisitSection />
      {/* NEW — not in contact.html. It sits after Visit and before the map
          because it answers the two things that stop somebody sending the
          form: how long the reply takes, and what happens to what they send.
          The last answer links to the Privacy Policy, which is also the only
          contextual link into it on the site — the footer's is site-wide
          furniture, this one is where the question is being asked. */}
      <FaqSection
        faqs={CONTACT_FAQS}
        id="contact-faq"
        heading={{ lead: 'Before you ', em: 'send it.' }}
        note="How quickly we reply, what to send with an enquiry, and what happens to it afterwards."
      />
      {/* §05 Map is the last section. The FOOTER that follows it in
          contact.html comes from RootLayout, not from here. */}
      <MapSection />
    </>
  )
}
