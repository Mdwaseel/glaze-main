import { useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { useFadeReveal, useWordReveal, useReducedMotion } from '@/hooks'
import { buildArchAnimation, initArchCursor } from './archAnimation'
import './archSection.css'

/**
 * ArchSection — port of hero.html lines 1587-1717.
 *
 * Three siblings in the original markup, reproduced in the same DOM
 * order: the <section>, the golden #arch-progress bar and the custom
 * .arch-cursor. The last two sit outside the section on purpose —
 * #arch-progress is position:fixed at the bottom of the viewport and the
 * cursor is position:fixed at z-index 9999.
 *
 * All animation lives in archAnimation.js. This component renders and
 * scopes it.
 */

/** Card track content, transcribed from the original markup. */
const ARCH_CARDS = [
  {
    cat: 'Residential',
    num: '01',
    title: 'Luxury Villas',
    src: '/images/contexts/villa.jpg',
    alt: 'Floor-to-ceiling aluminium glazing in a luxury villa',
  },
  {
    cat: 'Urban Living',
    num: '02',
    title: 'Penthouses',
    src: '/images/contexts/penthouse.jpg',
    alt: 'Slim-framed glazing across a penthouse living space',
  },
  {
    cat: 'Leisure',
    num: '03',
    title: 'Resorts',
    src: '/images/contexts/resort.jpg',
    alt: 'Wide sliding doors opening a resort suite to the outdoors',
  },
  {
    cat: 'Workplace',
    num: '04',
    title: 'Commercial Towers',
    src: '/images/contexts/commercial.jpg',
    alt: 'Aluminium curtain glazing on a commercial tower facade',
  },
  {
    cat: 'Civic',
    num: '05',
    title: 'Healthcare',
    src: '/images/contexts/healthcare.jpg',
    alt: 'Daylit healthcare interior behind acoustic glazing',
  },
  {
    cat: 'Hotels & Clubs',
    num: '06',
    title: 'Hospitality',
    src: '/images/contexts/hospitality.jpg',
    alt: 'Hotel lounge framed by full-height glazing',
  },
]

export default function ArchSection() {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const progressRef = useRef(null)
  const ghostRef = useRef(null)
  const countRef = useRef(null)
  const catRef = useRef(null)
  const lineRef = useRef(null)
  const cursorRef = useRef(null)

  const reduceMotion = useReducedMotion()

  // Site-wide reveal system from the base script, scoped to this section —
  // it owns the only .js-word-reveal and .fade-up elements migrated so far.
  // The original observes arch's .fade-up twice: once per element, and once
  // as a group on the section, because the horizontal cards slide in from
  // off-screen. Both are reproduced, in the original's order.
  useWordReveal(sectionRef)
  useFadeReveal(sectionRef)
  useFadeReveal(sectionRef, { group: true })

  useGSAP(
    () => {
      const section = sectionRef.current
      const track = trackRef.current
      if (!section || !track) return

      // No GSAP or reduced motion → plain swipeable gallery, no pinning.
      // (GSAP is bundled here, so only the motion check remains; the
      // .arch--static class is applied in the render below.)
      if (reduceMotion) return

      return buildArchAnimation(section, track, progressRef.current, {
        ghost: ghostRef.current,
        countEl: countRef.current,
        catEl: catRef.current,
        lineEl: lineRef.current,
      })
    },
    { scope: sectionRef }
  )

  useEffect(
    () => initArchCursor(sectionRef.current, cursorRef.current),
    []
  )

  return (
    <>
      <section
        id="arch-section"
        className={reduceMotion ? 'arch arch--static' : 'arch'}
        ref={sectionRef}
      >
        <div className="arch__sticky">

          {/* Header row */}
          <div className="arch__header">
            <div>
              <span className="arch__label fade-up"> Architectural Freedom</span>
              <h2 className="arch__heading js-word-reveal">
                {' '}
                Tailored for
                <br />
                {' '}
                <span className="arch__heading-italic">every context.</span>
                {' '}
              </h2>
            </div>
            <div className="arch__meta" aria-hidden="true">
              <div className="arch__counter">
                <span className="arch__counter-window"><span className="arch__counter-current" id="archCount" ref={countRef}>01</span></span>
                <span className="arch__counter-total">/ 06</span>
              </div>
              <span className="arch__meta-cat" id="archCat" ref={catRef}>Residential</span>
              <div className="arch__meta-line"><div className="arch__meta-line-fill" id="archLine" ref={lineRef}></div></div>
            </div>
          </div>

          {/* Card track */}
          <div id="track-wrapper" className="arch__track-wrapper">
            <div className="arch__ghost" id="archGhost" aria-hidden="true" ref={ghostRef}>every context</div>
            <div id="card-track" className="arch__track" ref={trackRef}>

              {ARCH_CARDS.map((card) => (
                <article className="arch__card" data-cat={card.cat} key={card.num}>
                  <div className="arch__card-media">
                    <img src={card.src} alt={card.alt} width="1200" height="1500" loading="lazy" decoding="async" />
                  </div>
                  <div className="arch__card-gradient"></div>
                  <div className="arch__card-content">
                    <div className="arch__card-meta">
                      <span className="arch__card-num">{card.num}</span>
                      <span className="arch__card-cat">{card.cat}</span>
                    </div>
                    <h3 className="arch__card-title">{card.title}</h3>
                  </div>
                </article>
              ))}

              {/* Trailing spacer so the last card isn't flush to the edge */}
              <div className="arch__spacer" aria-hidden="true"></div>

            </div>
          </div>

        </div>
      </section>

      {/* Golden scroll-progress bar for the section above */}
      <div id="arch-progress" ref={progressRef}></div>

      {/* Custom follow-cursor for the horizontal "every context" section */}
      <div className="arch-cursor" id="archCursor" aria-hidden="true" ref={cursorRef}>
        <div className="arch-cursor__inner">
          <span className="arch-cursor__arrows">&#8592;&nbsp;&nbsp;&#8594;</span>
          <span className="arch-cursor__label">Scroll</span>
        </div>
      </div>
    </>
  )
}
