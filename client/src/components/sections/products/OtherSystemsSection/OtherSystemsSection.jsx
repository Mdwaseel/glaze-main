import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useOtherSystems } from '@/context/CatalogueContext'
import { productPath } from '@/constants/routes'
import { countWord } from '@/utils/format'
import './otherSystemsSection.css'

/**
 * OtherSystemsSection — port of products/sliding.html lines 3234-3264.
 *
 * The lateral cross-links: every system except the one being read. Five
 * in the originals, six since Tilt & Turn — the heading, the column count
 * and the list all read the length rather than repeating the number.
 * Each card holds that system's clip, paused, and plays it only while the
 * pointer is over the card — the thirteenth and last script (lines
 * 4185-4198).
 *
 * ⚠ Fixed's card is a STILL, for the same reason its hero is: there is no
 * clip of a window that does not move. The branch is authored.
 *
 * ⚠ THE CARDS ARE <Link>s, not <a href="casement.html">. This is the one
 * section whose hrefs all point at other pages of this migration, so they
 * route client-side; the whole point of the section is lateral movement
 * and a full reload would throw away the smooth-scroll instance and the
 * shared spec for no reason.
 *
 * The grid rides `[data-stagger]` and the title `[data-curtain]`, both
 * from useProductsEntrance.
 */
/* The heading counts the list. It read "Five more ways" while there were six
   systems and "Six" once Tilt & Turn arrived; now that the collection is
   editable, hard-coding the word would be wrong by the next afternoon.
   countWord() lives in utils/format.js and is shared with the two other
   headings that count an editable list. */

export default function OtherSystemsSection({ system }) {
  const gridRef = useRef(null)
  const others = useOtherSystems(system.slug)

  useEffect(() => {
    const cards = [].slice.call(gridRef.current?.querySelectorAll('.oth__card') || [])
    const ac = new AbortController()
    const { signal } = ac

    cards.forEach(function (card) {
      const v = card.querySelector('video')
      if (!v) return
      card.addEventListener('mouseenter', function () {
        if (v.preload === 'none') { v.preload = 'auto'; v.load() }
        const p = v.play()
        if (p && p.catch) p.catch(function () {})
      }, { signal })
      card.addEventListener('mouseleave', function () { v.pause() }, { signal })
    })

    return () => {
      ac.abort()
      cards.forEach(function (card) {
        const v = card.querySelector('video')
        if (v) v.pause()
      })
    }
    // `others` rather than the slug alone: the provider swaps the shipped
    // catalogue for the live one mid-session, and a card added by that swap
    // needs its own hover handlers.
  }, [system.slug, others])

  return (
    <section className="oth" id="other-systems" aria-labelledby="oth-title">
      <div className="oth__inner">
        <p className="eyebrow">Keep Looking</p>
        <h2 className="sec-title oth__title" id="oth-title" data-curtain>
          {countWord(others.length)} more ways to <em>open a wall.</em>
        </h2>

        <div className="oth__grid" data-stagger ref={gridRef} style={{ '--oth-cols': others.length }}>
          {others.map((other) => {
            const media = other.card
            return (
              <Link className="oth__card" to={productPath(other.slug)} key={other.slug}>
                <span className="oth__media">
                  {media.video ? (
                    <video src={media.video} poster={media.poster || undefined} muted loop playsInline preload="metadata" aria-hidden="true"></video>
                  ) : (
                    <img src={media.image || media.poster} alt="" loading="lazy" />
                  )}
                </span>
                <span className="oth__body"><span className="oth__name">{other.name}</span><span className="oth__arrow">&rarr;</span></span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
