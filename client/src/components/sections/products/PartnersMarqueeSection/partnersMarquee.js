import { prefersReducedMotion } from '@/utils/motion'

/**
 * Products §10 — the partner marquee.
 *
 * Port of the tenth script in products/sliding.html (lines 3923-3946).
 *
 * The CSS scrolls each `.ptn__track` by exactly -50%, which only reads as
 * a seamless loop if the track holds the run TWICE. This clones it, marks
 * the copy `aria-hidden` so the marques are announced once, then arms the
 * `ptn--run` class and parks the animation whenever the section is off
 * screen.
 *
 * With reduced motion it returns immediately and the rows stay a static
 * grid — the original's own comment on that early return.
 *
 * ⚠ THE CLONES MUST BE REMOVED ON CLEANUP. The original never tears down;
 * here StrictMode runs mount → cleanup → mount against the SAME DOM
 * nodes, so a clone left behind would be cloned again and the row would
 * end up with three copies of every logo. Cleanup removes exactly the
 * nodes this function appended.
 */
export function initPartnersMarquee(section) {
  if (!section || prefersReducedMotion()) return      /* static grid otherwise */

  const added = []

  ;[].slice.call(section.querySelectorAll('.ptn__track')).forEach(function (track) {
    /* Duplicate the run so translateX(-50%) lands on the clone. */
    const copy = track.cloneNode(true)
    ;[].slice.call(copy.children).forEach(function (child) {
      child.setAttribute('aria-hidden', 'true')
      track.appendChild(child)
      added.push(child)
    })
  })
  section.classList.add('ptn--run')

  let observer = null
  if ('IntersectionObserver' in window) {
    section.classList.add('ptn--idle')
    observer = new IntersectionObserver(function (entries) {
      section.classList.toggle('ptn--idle', !entries[0].isIntersecting)
    }, { rootMargin: '160px 0px' })
    observer.observe(section)
  }

  return function cleanup() {
    if (observer) observer.disconnect()
    added.forEach(function (child) { child.remove() })
    section.classList.remove('ptn--run', 'ptn--idle')
  }
}

export default initPartnersMarquee
