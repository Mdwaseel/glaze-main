import './scrollIndicator.css'

/**
 * ScrollIndicator — port of the scroll cue in hero.html (lines 1497-1500).
 *
 *   <div class="hero__scroll" id="heroScrollCue">
 *     <div class="hero__scroll-mouse"></div>
 *     <span class="hero__scroll-label">Scroll</span>
 *   </div>
 *
 * Both animations are pure CSS keyframes declared globally in
 * styles/global.css and applied in scrollIndicator.css:
 *   • .hero__scroll-mouse::before → scroll-wheel  1.8s ease-in-out infinite
 *   • .hero__scroll-label         → scroll-pulse  2.4s ease-in-out infinite
 * No JS drives them. The hero's own exit fade (opacity/translate on
 * #heroScrollCue) is driven by the hero sequence controller in Phase 3 —
 * pass a ref through to reach the node.
 */
export default function ScrollIndicator({ id = 'heroScrollCue', ref }) {
  return (
    <div className="hero__scroll" id={id} ref={ref}>
      <div className="hero__scroll-mouse"></div>
      <span className="hero__scroll-label">Scroll</span>
    </div>
  )
}
