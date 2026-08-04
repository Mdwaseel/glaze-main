import { gsap } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About §07 Values — the stacked card deck.
 *
 * Verbatim port of <script id="about-values-script"> in about.html
 * (lines 5852-5915).
 *
 * Four dark cards become a deck: each sticks just below the nav and the
 * next slides over it while the one beneath settles back behind a dimming
 * veil; the photographs drift slowly inside their frames.
 *
 * NOT a scrub-pin. The deck flows at native scroll speed on CSS sticky,
 * which is what lets the page keep its two genuinely pinned moments
 * (Origin and Two Worlds). No GSAP pin, no pin-spacer, no injected track
 * height — the only thing the controller changes about layout is the
 * `values--anim` class that turns `position: sticky` on.
 *
 * With reduced motion (or no GSAP) this is a no-op: the default CSS is
 * already the finished static state — all four cards stacked in normal
 * flow, fully readable, with no veils.
 *
 * Nothing here generalises and nothing is extracted. The per-card
 * parallax looks superficially like Home's Arch image drift
 * (`xPercent -6 → 6` at `scale 1.14` on a `containerAnimation` trigger),
 * but this one is vertical, at a different scale and scrub, on a plain
 * viewport trigger. The only shared imports are utils/gsap (the single
 * registerPlugin point) and prefersReducedMotion — the same two the
 * Origin, Process, Two Worlds, Factory and Manifesto ports use.
 *
 * `useScrollTriggerRefresh` is deliberately NOT wired in: the original
 * values script registers no load refresh.
 *
 * Every value below is copied from the original.
 *
 * @param {HTMLElement} section  #about-values
 * @param {HTMLElement} deck     #valuesDeck
 * @returns {(() => void) | undefined} cleanup
 */
export function buildValuesDeck(section, deck) {
  if (!section || !deck) return
  const cards = [].slice.call(deck.querySelectorAll('.vcard'))
  if (!cards.length) return

  if (prefersReducedMotion()) return
  // (static stack stays: all four cards in normal flow)

  section.classList.add('values--anim')

  // The veils are DOM the controller creates, exactly as the original
  // does — an animation artefact, so static pages carry no trace of one.
  // They are tracked here because gsap.context does not own appended
  // nodes, and they are appended into React-owned <li> elements: without
  // the sweep in cleanup, StrictMode's double invoke and every return to
  // /about would stack another set inside the same cards.
  const veils = []

  const ctx = gsap.context(() => {
    cards.forEach(function (card, i) {
      // slow drift inside the frame
      const img = card.querySelector('.vcard__media img')
      if (img) {
        gsap.set(img, { scale: 1.12 })
        gsap.fromTo(img, { yPercent: -4 }, {
          yPercent: 4,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.4,
          },
        })
      }

      // as the next card slides over, this one settles back and
      // dims behind a veil (script-created — an anim artefact,
      // so static pages carry no trace of it)
      const next = cards[i + 1]
      if (!next) return

      const veil = document.createElement('div')
      veil.className = 'vcard__veil'
      veil.setAttribute('aria-hidden', 'true')
      card.appendChild(veil)
      veils.push(veil)

      gsap.timeline({
        scrollTrigger: {
          trigger: next,
          start: 'top bottom',
          end: 'top 25%',
          scrub: 0.4,
        },
      })
        .to(card, {
          scale: 0.95,
          transformOrigin: 'center top',
          ease: 'none',
        }, 0)
        .to(veil, { opacity: 0.55, ease: 'none' }, 0)
    })
  }, section)

  return function cleanup() {
    // revert() first, while `values--anim` is still applied and the veils
    // are still in the document, so the triggers unwind against the
    // geometry they measured and the inline styles gsap wrote (the cards'
    // scale, the images' scale/yPercent, the veils' opacity) are restored.
    ctx.revert()
    section.classList.remove('values--anim')
    veils.forEach(function (v) {
      if (v.parentNode) v.parentNode.removeChild(v)
    })
    veils.length = 0
  }
}

export default buildValuesDeck
