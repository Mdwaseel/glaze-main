import { useEffect, useRef } from 'react'
import { SYSTEM_CARD_MEDIA } from '@/data/systems'
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

  /* ⚠ THE POSTER USED TO BE `/products/glass/clear.webp` — HARD-CODED,
     AND THE SAME ON ALL SIX PAGES. That file is the Glass Switcher's
     "Clear" sample: a close-up of a pane, which is not a frame of any
     hero clip and not even a picture of a window. It is what the visitor
     saw for the whole of the metadata fetch, and for good on any browser
     that refused autoplay — a sheet of glass where the system should be.
     `preload="metadata"` makes that window longer than it looks: nothing
     of the clip itself is fetched until playback is attempted.

     The first frame of each clip already exists — the cross-link cards
     use it, extracted once at 6–13 KB apiece — so the hero now shows the
     system it is the hero of. `hero.poster` first, so a system whose clip
     is replaced through the admin panel can carry its own; the card still
     for that slug next; and nothing at all rather than a wrong picture if
     neither is there, which for a `<video>` means the element's own black
     rather than an unrelated photograph. */
  const poster = hero.poster || SYSTEM_CARD_MEDIA[system.slug]?.poster || undefined

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
            poster={poster}
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
