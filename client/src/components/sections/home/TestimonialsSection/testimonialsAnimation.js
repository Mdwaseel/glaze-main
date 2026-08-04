import { gsap } from '@/utils/gsap'

/**
 * Client Voices — three slow marquee columns.
 *
 * Verbatim port of <script id="tsm-script"> in hero.html
 * (lines 5889-5952).
 *
 * The scroll itself is pure CSS (`@keyframes tsm-scroll` to
 * `translateY(-50%)`, per-column durations 30s / 38s / 34s). All this
 * controller does is clone each column's card set so the loop lands
 * seamlessly on the copy, flip on `tsm--marquee`, park the animation
 * while the section is offscreen, and run the two entrance reveals.
 *
 * @param {HTMLElement} section  #testimonials
 * @param {boolean} reduceMotion
 * @returns {() => void} cleanup
 */
export function buildTestimonialsAnimation(section, reduceMotion) {
  const clones = []
  let io = null

  /* Static fallback: default CSS is already the finished state (all
     nine cards in a readable grid), so with reduced motion there is
     nothing to do. Otherwise clone each column's card set and start
     the pure-CSS loop. */
  if (!reduceMotion) {
    ;[].slice.call(section.querySelectorAll('.tsm__track')).forEach(function (track) {
      const set = track.querySelector('.tsm__set')
      if (!set) return
      const copy = set.cloneNode(true)
      copy.setAttribute('aria-hidden', 'true')
      track.appendChild(copy)
      clones.push(copy)
    })
    section.classList.add('tsm--marquee')

    /* Park the animation while the section is offscreen. */
    if ('IntersectionObserver' in window) {
      section.classList.add('tsm--idle')
      io = new IntersectionObserver(
        function (entries) {
          section.classList.toggle('tsm--idle', !entries[0].isIntersecting)
        },
        { rootMargin: '160px 0px' }
      )
      io.observe(section)
    }
  }

  function cleanup() {
    // The original never tears this down — the page simply ends. React
    // remounts (StrictMode in dev, route changes in prod), so the clones
    // MUST be removed or every remount appends another set.
    if (io) io.disconnect()
    clones.forEach(function (c) {
      if (c.parentNode) c.parentNode.removeChild(c)
    })
    section.classList.remove('tsm--marquee', 'tsm--idle')
  }

  /* Entrance reveal — GSAP only, same pattern as the sections above.
     (The original also bailed when GSAP failed to load from the CDN;
     it is bundled here, so only the motion check remains.) */
  if (reduceMotion) return cleanup

  gsap.from(section.querySelectorAll('.tsm__head > *'), {
    y: 36,
    autoAlpha: 0,
    duration: 1,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section.querySelector('.tsm__head'),
      start: 'top 82%',
      once: true,
    },
  })

  gsap.from(section.querySelector('.tsm__cols'), {
    y: 48,
    autoAlpha: 0,
    duration: 1.1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section.querySelector('.tsm__cols'),
      start: 'top 88%',
      once: true,
    },
  })

  return cleanup
}
