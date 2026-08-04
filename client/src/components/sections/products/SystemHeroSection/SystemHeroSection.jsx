import { useEffect, useRef } from 'react'
import './systemHeroSection.css'

/**
 * SystemHeroSection — port of products/sliding.html lines 2188-2217.
 *
 * Full-bleed system clip under a heavy foot-weighted scrim, with the
 * glass pill, the huge Playfair title over its Bodoni accent, the lede
 * and the magnetic scroll cue. The slow 34-second push-in and the pill /
 * cue pulses are CSS animations in systemHeroSection.css — nothing here
 * drives them.
 *
 * ⚠ FIXED IS A STILL. Five of the six pages open on a clip; fixed.html
 * ships an `<img>` in the same slot, because there is no footage of a
 * window that does not move. The branch below is the only structural
 * difference between the six heroes, and it is authored, not inferred —
 * see `hero.image` in data/systems.js.
 *
 * The autoplay guard is the first half of the hero script (lines
 * 3590-3596). If the browser refuses autoplay the poster stays up, which
 * the original calls "exactly the documented fallback, so nothing to
 * recover from" — hence the swallowed rejection.
 *
 * Everything else the page mounts applies with no wiring here:
 *   [data-curtain] on the title  → useProductsEntrance  (page-level)
 *   [data-magnetic] on the cue   → useProductsMagnetic  (page-level)
 *   the .shero__media parallax   → useProductsEntrance  (page-level)
 */
export default function SystemHeroSection({ system }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const p = vid.play()
    /* If the browser refuses autoplay the poster stays up — which is
       exactly the documented fallback, so nothing to recover from. */
    if (p && p.catch) p.catch(function () {})
  }, [])

  const { hero } = system

  return (
    <header className="shero" id="sys-hero">
      <div className="shero__media">
        {hero.image ? (
          <img src={hero.image} alt="" fetchPriority="high" decoding="async" />
        ) : (
          <video
            id="sheroVideo"
            ref={videoRef}
            src={hero.video}
            poster="/products/glass/clear.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          ></video>
        )}
      </div>
      <div className="shero__scrim" aria-hidden="true"></div>

      <div className="shero__inner">
        <p className="shero__pill"><i aria-hidden="true"></i> Window Systems</p>

        <h1 className="shero__title" data-curtain>
          {hero.title}
          <span className="accent">{hero.accent}</span>
        </h1>

        <div className="shero__foot">
          <p className="shero__lede">
            {hero.lede}
          </p>

          <a href="#sys-overview" className="shero__cue" id="sheroCue" data-magnetic>
            <span className="shero__cue-well" aria-hidden="true"><span className="shero__cue-dot"></span></span>
            Scroll
          </a>
        </div>
      </div>
    </header>
  )
}
