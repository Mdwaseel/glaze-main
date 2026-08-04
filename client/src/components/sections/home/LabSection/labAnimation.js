import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * The Performance Lab — test-chamber controller.
 *
 * Verbatim port of <script id="lab-script"> in hero.html
 * (lines 5470-5693). One ScrollTrigger over the tall track drives every
 * beat: which film is live, the iris-open reveal, the character cascade,
 * and the gauge arc filling with the running test.
 *
 * No shared sequence infrastructure applies here — there is no canvas and
 * no frame sequence; the five tests are <video> elements swapped by a
 * GSAP timeline.
 */

/** A scene's outcome resolves in the last stretch of its segment. */
export const RESOLVE_AT = 0.7

/**
 * Static experience: five films in a column, play on view.
 * Note the original creates NO observer at all when motion is reduced —
 * `if ('IntersectionObserver' in window && !reduceMotion)`.
 *
 * @returns {() => void} cleanup
 */
export function initLabStatic(videos, reduceMotion) {
  if (!('IntersectionObserver' in window) || reduceMotion) return () => {}

  const io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const pr = entry.target.play()
          if (pr && pr.catch) pr.catch(function () {})
        } else {
          entry.target.pause()
        }
      })
    },
    { threshold: 0.25 }
  )
  videos.forEach(function (v) {
    if (v) io.observe(v)
  })

  return function () {
    io.disconnect()
  }
}

/**
 * Full animated chamber. Call inside a useGSAP/gsap.context scope — that
 * reverts the ScrollTriggers and tweens; the returned cleanup handles the
 * global `scrollEnd` listener, the swap timeline and the `lab--anim`
 * class, none of which the context tracks.
 *
 * @returns {() => void} cleanup
 */
export function buildLabAnimation(section, scrollEl, refs) {
  const { panels, videos, dialBox, ticks, gauge, meterFill, panelsWrap } = refs

  section.classList.add('lab--anim')

  /* Split every title into characters for the cascade. */
  panels.forEach(function (p) {
    const title = p.querySelector('.lab__panel-title')
    const text = title.textContent
    title.textContent = ''
    text.split('').forEach(function (c) {
      const s = document.createElement('span')
      s.className = 'lab__ch'
      // ⚠ The second quoted character is U+00A0, a NON-BREAKING space —
      // byte-for-byte what hero.html line 5514 substitutes, and easy to
      // lose to an editor that normalises whitespace. It is load-bearing:
      // .lab__ch is inline-block, so a plain U+0020 alone in its own span
      // collapses to zero width and "Driving rain" renders "Drivingrain".
      s.textContent = c === ' ' ? ' ' : c
      title.appendChild(s)
    })
  })

  let stageLive = false

  /* ── One scene component per test. Every panel is an instance of
     the same template — same refs, same resolve timeline, same
     count-up — so the five tests stay structurally identical. The
     final stat value lives in the markup (single source of truth;
     it is also the no-JS/reduced-motion state) and the count-up
     animates toward it only when its scene resolves in view. ── */
  const scenes = panels.map(function (p) {
    const valueEl = p.querySelector('.lab__result-value')
    const finalText = valueEl ? valueEl.textContent : ''
    const finalVal = parseFloat(finalText) || 0
    const decimals = finalText.indexOf('.') > -1 ? finalText.split('.')[1].length : 0
    const proxy = { v: 0 }
    const resolveTl = gsap.timeline({ paused: true })
    if (valueEl) {
      resolveTl
        .fromTo(
          p.querySelector('.lab__result'),
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out' },
          0
        )
        .fromTo(
          proxy,
          { v: 0 },
          {
            v: finalVal,
            duration: 1.1,
            ease: 'power2.out',
            onUpdate: function () {
              valueEl.textContent = proxy.v.toFixed(decimals)
            },
          },
          0.05
        )
    }
    return {
      el: p,
      frame: p.querySelector('.lab__frame'),
      num: p.querySelector('.lab__num'),
      copy: p.querySelector('.lab__info p'),
      chars: p.querySelectorAll('.lab__ch'),
      resolveTl: resolveTl,
      resolved: false,
    }
  })

  /* A scene's outcome resolves in the last stretch of its segment
     and un-resolves (reversed count, dimmed dot) on scroll-back. */
  function setResolved(scene, on) {
    if (scene.resolved === on) return
    scene.resolved = on
    scene.el.classList.toggle('is-resolved', on)
    if (on) scene.resolveTl.play()
    else scene.resolveTl.reverse()
  }

  function playOnly(active) {
    videos.forEach(function (v, i) {
      if (!v) return
      if (stageLive && i === active) {
        const pr = v.play()
        if (pr && pr.catch) pr.catch(function () {})
      } else {
        v.pause()
      }
    })
  }

  /* ── Panel swap: iris-open film + cascading type ── */
  let current = -1
  let swapTl = null

  function activate(i, dir) {
    if (i === current) return
    const oldS = current >= 0 ? scenes[current] : null
    current = i
    const s = scenes[i]
    playOnly(i)

    if (swapTl) swapTl.kill()
    swapTl = gsap.timeline({ defaults: { overwrite: 'auto' } })

    if (oldS) {
      swapTl
        .to(oldS.frame, { scale: 1.06, duration: 0.45, ease: 'power2.in' }, 0)
        .to(oldS.el, { autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0)
    }

    const frame = s.frame
    const chars = s.chars
    const at = oldS ? 0.3 : 0

    swapTl
      .fromTo(s.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, at)
      .fromTo(
        frame,
        {
          clipPath: 'inset(46% 46% 46% 46% round 300px)',
          scale: 0.94,
          rotate: dir >= 0 ? 2.5 : -2.5,
        },
        {
          clipPath: 'inset(0% 0% 0% 0% round 20px)',
          scale: 1,
          rotate: 0,
          duration: 0.95,
          ease: 'power3.out',
        },
        at
      )
      .fromTo(
        s.num,
        { yPercent: 60, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' },
        at + 0.08
      )
      .fromTo(
        chars,
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 0.75,
          ease: 'power3.out',
          stagger: dir >= 0 ? 0.022 : -0.022,
        },
        at + 0.1
      )
      .fromTo(
        s.copy,
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out' },
        at + 0.28
      )
  }

  /* ── One driver for the whole chamber ── */
  const clampSkew = gsap.utils.clamp(-3.5, 3.5)
  const skewSetter = gsap.quickTo(panelsWrap, 'skewY', { duration: 0.5, ease: 'power3' })

  ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top top',
    end: 'bottom bottom',
    onToggle: function (self) {
      stageLive = self.isActive
      playOnly(current)
    },
    onUpdate: function (self) {
      const seg = self.progress * panels.length
      const i = Math.max(0, Math.min(panels.length - 1, Math.floor(seg)))
      const frac = Math.min(seg - i, 1) /* progress within this test */
      activate(i, self.direction)

      /* The gauge arc IS the test: it fills across the segment and
         locks gold once the scene resolves near its end. */
      if (gauge) gsap.set(gauge, { strokeDashoffset: 1 - frac })
      if (dialBox) dialBox.classList.toggle('lab__dial--locked', frac >= RESOLVE_AT)
      setResolved(scenes[i], frac >= RESOLVE_AT)

      if (meterFill) gsap.set(meterFill, { scaleY: self.progress })
      if (ticks) gsap.set(ticks, { rotation: self.progress * 240, transformOrigin: '50% 50%' })
      skewSetter(clampSkew(self.getVelocity() / -350))
    },
  })

  function onScrollEnd() {
    skewSetter(0)
  }
  ScrollTrigger.addEventListener('scrollEnd', onScrollEnd)

  /* Stage ready before it scrolls into view. */
  activate(0, 1)

  /* Header reveal */
  gsap.from(section.querySelectorAll('.lab__head > *'), {
    y: 34,
    autoAlpha: 0,
    duration: 1,
    stagger: 0.12,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section.querySelector('.lab__head'),
      start: 'top 82%',
      once: true,
    },
  })

  return function cleanup() {
    // Global listener — gsap.context does not own this one.
    ScrollTrigger.removeEventListener('scrollEnd', onScrollEnd)
    if (swapTl) swapTl.kill()
    scenes.forEach(function (s) {
      s.resolveTl.kill()
    })
    videos.forEach(function (v) {
      if (v && !v.paused) v.pause()
    })
    section.classList.remove('lab--anim')
  }
}
