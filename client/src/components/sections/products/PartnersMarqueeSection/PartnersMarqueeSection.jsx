import { useLayoutEffect, useRef } from 'react'
import { PARTNER_LOGOS, PARTNER_ROW_ONE, PARTNER_ROW_TWO } from '@/data/partnerLogos'
import { initPartnersMarquee } from './partnersMarquee'
import './partnersMarqueeSection.css'

/**
 * PartnersMarqueeSection — port of products/sliding.html lines 2793-2849.
 *
 * Two rows of marques running in opposite directions at different speeds
 * (58s and 66s, both authored as inline `--ptn-dur`). The scroll itself is
 * a CSS animation; partnersMarquee.js supplies the duplicate run it needs
 * and parks it off screen.
 *
 * ⚠ THE LOGO FILES ARE THE PROJECT'S OWN, not the products folder's.
 * See data/partnerLogos.js for the mapping and for why the alt text is
 * the real marque name rather than the original's "Partner logo".
 *
 * ⚠ This is NOT About's PartnersSection. That one (`.ptr*`) is a static
 * categorised grid from about.html; this one (`.ptn*`) is a running
 * marquee from the system pages. Both exist in the originals.
 *
 * The title and note ride useProductsEntrance like every other heading.
 */
export default function PartnersMarqueeSection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => initPartnersMarquee(sectionRef.current), [])

  const row = (numbers) => numbers.map((n) => (
    <span className="ptn__logo" key={n}>
      <img src={PARTNER_LOGOS[n].src} alt={PARTNER_LOGOS[n].alt} loading="lazy" />
    </span>
  ))

  return (
    <section className="ptn" id="sys-partners" aria-labelledby="ptn-title" ref={sectionRef}>
      <div className="ptn__head">
        <h2 className="sec-title ptn__title" id="ptn-title" data-curtain>
          Built with the <em>best in the trade.</em>
        </h2>
        <p className="ptn__note">
          Profiles, hardware, glass, sealants and machining — every input
          in a Glaze system comes from a named partner we can point to.
        </p>
      </div>

      <div className="ptn__rows">
        <div className="ptn__row" style={{ '--ptn-dur': '58s' }}>
          <div className="ptn__track">
            {row(PARTNER_ROW_ONE)}
          </div>
        </div>

        <div className="ptn__row ptn__row--rev" style={{ '--ptn-dur': '66s' }}>
          <div className="ptn__track">
            {row(PARTNER_ROW_TWO)}
          </div>
        </div>
      </div>
    </section>
  )
}
