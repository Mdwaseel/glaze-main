import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * Process — timeline controller.
 *
 * Verbatim port of <script id="proc-script"> in hero.html
 * (lines 5708-5885): header reveal, scrubbed line draw, the gooey word
 * morph, per-step ignition, per-card slide-in and the coda reveal.
 *
 * Static fallback (reduced motion / no GSAP) is a no-op: the default CSS
 * IS the completed timeline — line drawn, nodes lit, cards visible.
 */

/**
 * Where along the viewport a node "reads" as reached. Shared by the
 * scrub and the per-step triggers so the tip of the drawn line and each
 * ignition coincide.
 */
export const ANCHOR = '62%'

/** Gooey crossfade duration, ms. */
export const MORPH_MS = 900

/**
 * @param {HTMLElement} section  #process
 * @param {{stepsWrap: HTMLElement, fill: HTMLElement, wordWrap: HTMLElement}} refs
 * @returns {() => void} cleanup
 */
export function buildProcessAnimation(section, refs) {
  const { stepsWrap, fill, wordWrap } = refs
  const steps = [].slice.call(section.querySelectorAll('.proc__step'))
  if (!stepsWrap || !steps.length) return () => {}

  section.classList.add('proc--anim')

  /* ── 1 · Header reveal ─────────────────────────────────────── */
  gsap.from(section.querySelectorAll('.proc__head > *'), {
    y: 36,
    autoAlpha: 0,
    duration: 1,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section.querySelector('.proc__head'),
      start: 'top 82%',
      once: true,
    },
  })

  /* ── 2 · Line draw (scrubbed): the fill grows down the rail; its
         gradient keeps the tip dissolving softly at any height ── */
  gsap.fromTo(
    fill,
    { height: '0%' },
    {
      height: '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: stepsWrap,
        start: 'top ' + ANCHOR,
        end: 'bottom ' + ANCHOR,
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
    }
  )

  /* ── 3 · Gooey word morph (vanilla port of the blur-threshold
         text-morph technique: two stacked spans crossfade through
         a blur while an SVG alpha-threshold filter fuses them) ── */
  const words = steps.map(function (s) {
    return s.getAttribute('data-word') || ''
  })
  const wordA = wordWrap && wordWrap.children[0]
  const wordB = wordWrap && wordWrap.children[1]
  const wordHold = section.querySelector('.proc__word-hold')
  const track = section.querySelector('.proc__track')
  let morphRaf = 0

  /* Glide the watermark to the active step's node, so it travels
     down the timeline with the reader instead of parking onscreen. */
  function placeWord(i, instant) {
    if (!wordHold || !track) return
    const node = steps[Math.max(i, 0)].querySelector('.proc__node')
    const rect = node.getBoundingClientRect()
    const y = rect.top - track.getBoundingClientRect().top + rect.height / 2
    if (instant) {
      gsap.killTweensOf(wordHold)
      gsap.set(wordHold, { y: y, yPercent: -50 })
    } else {
      gsap.to(wordHold, {
        y: y,
        yPercent: -50,
        duration: 1.1,
        ease: 'power3.out',
        overwrite: 'auto',
      })
    }
  }

  function morphTo(word) {
    if (!wordA || !wordB) return
    if (!morphRaf && wordA.textContent === word) return
    cancelAnimationFrame(morphRaf)
    morphRaf = 0
    wordB.textContent = word
    const t0 = performance.now()

    function frame(t) {
      const f = Math.max(Math.min((t - t0) / MORPH_MS, 1), 0)
      wordB.style.filter = 'blur(' + Math.min(8 / f - 8, 100) + 'px)'
      wordB.style.opacity = Math.pow(f, 0.4) * 100 + '%'
      const g = 1 - f
      wordA.style.filter = 'blur(' + Math.min(8 / g - 8, 100) + 'px)'
      wordA.style.opacity = Math.pow(g, 0.4) * 100 + '%'
      if (f < 1) {
        morphRaf = requestAnimationFrame(frame)
      } else {
        morphRaf = 0
        wordA.textContent = word
        wordA.style.filter = ''
        wordA.style.opacity = ''
        wordB.textContent = ''
        wordB.style.filter = ''
        wordB.style.opacity = ''
      }
    }
    morphRaf = requestAnimationFrame(frame)
  }

  /* ── 4 · Step ignition ─────────────────────────────────────── */
  let current = -2
  function setCurrent(i) {
    if (i === current) return
    current = i
    steps.forEach(function (s, j) {
      s.classList.toggle('is-lit', j <= i)
    })
    morphTo(words[Math.max(i, 0)])
    placeWord(i)
  }
  setCurrent(-1)
  placeWord(-1, true)

  /* Layout shifts (fonts, resize) move the nodes — re-pin the word. */
  function onRefresh() {
    placeWord(current, true)
  }
  ScrollTrigger.addEventListener('refresh', onRefresh)

  steps.forEach(function (step, i) {
    ScrollTrigger.create({
      trigger: step.querySelector('.proc__node'),
      start: 'center ' + ANCHOR,
      onEnter: function () {
        setCurrent(i)
      },
      onLeaveBack: function () {
        setCurrent(i - 1)
      },
    })

    /* ── 5 · Detail slide-in, from the card's own side ──────── */
    const fromLeft = i % 2 === 0 && window.matchMedia('(min-width: 900px)').matches
    gsap.from(step.querySelector('.proc__card'), {
      x: fromLeft ? -52 : 52,
      y: 24,
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: step,
        start: 'top 78%',
        toggleActions: 'play none none reverse',
      },
    })
  })

  /* Coda reveal */
  gsap.from(section.querySelector('.proc__coda'), {
    y: 28,
    autoAlpha: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section.querySelector('.proc__coda'),
      start: 'top 88%',
      once: true,
    },
  })

  return function cleanup() {
    // Global listener — gsap.context does not own this one.
    ScrollTrigger.removeEventListener('refresh', onRefresh)
    if (morphRaf) cancelAnimationFrame(morphRaf)
    if (wordHold) gsap.killTweensOf(wordHold)
    section.classList.remove('proc--anim')
  }
}
