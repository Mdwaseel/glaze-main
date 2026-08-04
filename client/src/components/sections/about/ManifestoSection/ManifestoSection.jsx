import { useLayoutEffect, useRef } from 'react'
import { buildManifestoScrub } from './manifestoAnimation'
import './manifestoSection.css'

/**
 * ManifestoSection — port of about.html lines 3166-3191.
 *
 * "The clearer the window, the deeper the life." — set huge on a dark
 * viewport, each word lifting from 24% to full strength as the block
 * travels up the screen.
 *
 * The words are authored as spans, so this markup IS the finished static
 * state: no JS and reduced motion both read the quote at full colour.
 * The only thing the controller adds is `mfs--anim` (which dims the
 * words) and the scrubbed inline opacity — both reverted on cleanup.
 *
 * ⚠ LAYOUT effect, matching ProcessSection, TwoWorldsSection and
 * FactorySection. about.html adds `mfs--anim` at parse time, so the words
 * are already dimmed to 0.24 before the section is first painted. From a
 * passive effect React would paint all eight words at full strength and
 * only then dim them — a visible flash of the finished state.
 *
 * ⚠ The single spaces between the word spans are LOAD-BEARING and are
 * written as explicit `{' '}` separators. `.mfs__w` is
 * `display: inline-block`, so the gaps between words are pure inter-
 * element whitespace; in about.html that is the newline + indent between
 * the spans, which HTML collapses to one space. JSX strips whitespace
 * that contains a newline, so writing the spans on their own lines
 * without `{' '}` would render "Theclearerthewindow,". See the
 * whitespace note in the migration log.
 *
 * The two supporting lines' `.fade-up` reveals are handled by the
 * page-level useAboutFadeReveal mounted in About.jsx.
 */
export default function ManifestoSection() {
  const sectionRef = useRef(null)
  const quoteRef = useRef(null)

  useLayoutEffect(
    () => buildManifestoScrub(sectionRef.current, quoteRef.current),
    []
  )

  return (
    <section id="about-manifesto" className="mfs" aria-label="Our manifesto" ref={sectionRef}>
      <blockquote className="mfs__quote" id="mfsQuote" ref={quoteRef}>
        <span className="mfs__w">The</span>{' '}
        <span className="mfs__w">clearer</span>{' '}
        <span className="mfs__w">the</span>{' '}
        <span className="mfs__w">window,</span>{' '}
        <span className="mfs__w">the</span>{' '}
        <span className="mfs__w"><em>deeper</em></span>{' '}
        <span className="mfs__w">the</span>{' '}
        <span className="mfs__w"><em>life.</em></span>
      </blockquote>

      {/* TODO(brochure): swap these two supporting lines for the exact
          wording from the brand brochure. Placeholders below stick to
          known facts only. */}
      <div className="mfs__support">
        {/* Was "Sagar Asia's three decades…". The parent-company framing is
            gone at the client's request; the claim itself (since 1989, so
            three decades) is unchanged and now attributed to Glaze. */}
        <p className="fade-up">
          <strong>Three decades</strong> of aluminium mastery stand behind
          every frame we make.
        </p>
        <p className="fade-up" style={{ '--reveal-delay': '0.15s' }}>
          Engineered in Hyderabad for Indian light, Indian weather,
          Indian life.
        </p>
      </div>
    </section>
  )
}
