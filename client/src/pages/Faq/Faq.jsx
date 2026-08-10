import SEO, { ORGANIZATION_ID, absoluteUrl, breadcrumbSchema, faqSchema, graph } from '@/components/common/SEO'
import Breadcrumbs from '@/components/common/Breadcrumbs'
import FaqSection from '@/components/common/FaqSection'
import { ALL_FAQS, FAQ_GROUPS } from '@/data/faqs'
import { ROUTES } from '@/constants/routes'
import './faqPage.css'

/**
 * /faq — the hub.
 *
 * ⚠ IT IS NOT A FOURTH COPY OF THE QUESTIONS. The FAQ sections on /systems,
 * /contact and each system page render subsets of the SAME arrays in
 * data/faqs.js, because those are the questions being asked at those
 * moments. This page renders all three groups, because somebody who
 * navigated to a page called FAQs wants the list rather than a slice of it.
 * The strings are shared, not duplicated, so a corrected answer is corrected
 * on every surface at once.
 *
 * ⚠ ONE FAQPage NODE, NOT THREE. Google resolves multiple FAQPage nodes in a
 * document by picking one, so the three groups are flattened into a single
 * `mainEntity` (ALL_FAQS) rather than each <FaqSection> carrying its own.
 * That is also why the sections here are rendered by the same component with
 * schema deliberately left off — the page owns the markup, the sections own
 * the display.
 *
 * Reached from the About submenu in the nav, from the footer, and from the
 * contextual links inside the answers themselves.
 */
const META_DESCRIPTION =
  'Answers on choosing a Glaze aluminium system, the sizes and standards behind ' +
  'the figures, how a project runs from survey to handover, and what happens to ' +
  'an enquiry once you send it.'

export default function Faq() {
  const trail = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About', path: ROUTES.ABOUT },
    { name: 'FAQs', path: ROUTES.FAQ },
  ]

  return (
    <main className="faqp" id="top">
      <SEO
        title="FAQs — Glaze | Aluminium Window & Door Systems"
        description={META_DESCRIPTION}
        path={ROUTES.FAQ}
        schema={graph([
          {
            '@type': 'WebPage',
            '@id': `${absoluteUrl(ROUTES.FAQ)}#webpage`,
            name: 'Glaze — frequently asked questions',
            description: META_DESCRIPTION,
            url: absoluteUrl(ROUTES.FAQ),
            publisher: { '@id': ORGANIZATION_ID },
          },
          faqSchema(ALL_FAQS),
          breadcrumbSchema(trail),
        ])}
      />

      <div className="faqp__inner">
        <Breadcrumbs trail={trail} className="faqp__crumbs" />

        <header className="faqp__head">
          <p className="faqp__eyebrow">Frequently asked</p>
          <h1 className="faqp__title">
            The questions<br /><em>that come first.</em>
          </h1>
          <p className="faqp__lede">
            Sizes, tested figures, how a project actually runs, and what
            happens to an enquiry once you send it. If yours is not here, ask
            it — someone who knows the systems will answer.
          </p>
        </header>

        {/* Jump list. Three groups of six to eight is a long page, and the
            reader arriving from a search has one of the three in mind. */}
        <nav className="faqp__jump" aria-label="Question groups">
          {FAQ_GROUPS.map((group) => (
            <a className="faqp__jump-link" href={`#faq-${group.id}`} key={group.id}>
              <span className="faqp__jump-label">{group.label}</span>
              <span className="faqp__jump-count">{group.faqs.length}</span>
            </a>
          ))}
        </nav>
      </div>

      {FAQ_GROUPS.map((group, i) => (
        <FaqSection
          key={group.id}
          id={`faq-${group.id}`}
          faqs={group.faqs}
          /* Alternating ground, so three long lists do not read as one. */
          tone={i % 2 === 1 ? 'dark' : 'light'}
          eyebrow={`0${i + 1} — ${group.label}`}
          heading={group.heading}
          note={group.note}
        />
      ))}
    </main>
  )
}
