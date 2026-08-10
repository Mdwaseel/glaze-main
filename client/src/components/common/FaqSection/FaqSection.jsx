import { useId } from 'react'
import { Link } from 'react-router-dom'
import './faqSection.css'

/**
 * The FAQ accordion, and the visible half of every FAQPage node on the site.
 *
 * ⚠ IT IS `<details>`/`<summary>`, NOT A JAVASCRIPT ACCORDION, and that is a
 * decision rather than a shortcut. The element brings its own keyboard
 * handling, its own expanded/collapsed state for assistive technology and its
 * own in-page find behaviour: Chrome and Safari open a closed <details> when
 * Ctrl-F matches text inside it, which a div-and-a-click-handler cannot do.
 * On a page whose whole purpose is answering a question somebody is searching
 * for, that is the feature, not a detail.
 *
 * ⚠ THE ANSWER RENDERED HERE IS THE ANSWER IN THE SCHEMA. Both come from the
 * same `faqs` array — this component and `faqSchema()` take the identical
 * one. Do not summarise here and mark up something longer: an FAQPage whose
 * answers are not visible on the page is a structured-data violation. See the
 * note on faqSchema in components/common/SEO/siteOrigin.js.
 *
 * ⚠ ONE FAQ SECTION PER PAGE. Two would mean two FAQPage nodes, which is
 * ambiguous; if a page needs more questions, lengthen the array.
 *
 * Closed by default, except the first, which opens: an accordion where
 * everything is shut reads as an empty section, and an accordion where
 * everything is open is a wall of text with dividers in it.
 *
 * @param {object} props
 * @param {{q: string, a: string, link?: {to: string, label: string}}[]} props.faqs
 * @param {string} [props.eyebrow]
 * @param {{lead: string, em: string}} [props.heading]
 * @param {string} [props.note]     one line under the heading
 * @param {'light'|'dark'} [props.tone]
 * @param {string} [props.id]       section id, for an in-page anchor
 */
export default function FaqSection({
  faqs,
  eyebrow = 'Questions',
  heading = { lead: 'The things people ', em: 'ask first.' },
  note,
  tone = 'light',
  id = 'faq',
}) {
  // Stable across renders and unique per mount, so two sections in one
  // document (a system page and, one day, something else) cannot collide.
  const uid = useId()

  if (!faqs || !faqs.length) return null

  return (
    <section className={`faq faq--${tone}`} id={id} aria-labelledby={`${uid}-title`}>
      <div className="faq__inner">
        <header className="faq__head">
          <p className="faq__eyebrow">{eyebrow}</p>
          <h2 className="faq__title" id={`${uid}-title`}>
            {heading.lead}<em>{heading.em}</em>
          </h2>
          {note && <p className="faq__note">{note}</p>}
        </header>

        <div className="faq__list">
          {faqs.map((item, i) => (
            <details
              className="faq__item"
              key={item.q}
              /* First one open — see the note above. `open` is an initial
                 value here, not controlled state: React does not re-assert it
                 on re-render, so a visitor who closes it stays closed. */
              open={i === 0}
            >
              <summary className="faq__q">
                <span className="faq__q-text">{item.q}</span>
                {/* Two strokes that cross into a plus and rotate into a
                    minus. Decorative — <details> conveys the state. */}
                <span className="faq__mark" aria-hidden="true">
                  <i /><i />
                </span>
              </summary>
              <div className="faq__a">
                <p>{item.a}</p>
                {/* ⚠ AFTER the answer, never inside it. The answer string is
                    what faqSchema() marks up, so it has to stay a plain
                    string that reads whole on its own; this is a supplement
                    to it, not a part of it. It is also where an answer that
                    ends "…our Privacy Policy sets out" gets the link that
                    makes the sentence useful. */}
                {item.link && (
                  <Link className="faq__link" to={item.link.to}>
                    {item.link.label}<span aria-hidden="true"> &rarr;</span>
                  </Link>
                )}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
