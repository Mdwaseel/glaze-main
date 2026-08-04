import { ScrollTrigger } from '@/utils/gsap'

/**
 * Follow a card's link — through the router, not the browser.
 *
 * ⚠ THIS USED TO BE `window.location.href = href`, in both click handlers.
 * Faithful to the static site, where every navigation WAS a document load —
 * but in the SPA it reloads the entire application to move between two pages
 * of the same app: the whole bundle re-downloaded and re-parsed, GSAP and
 * Lenis torn down and re-initialised, every provider re-mounted and every
 * boot fetch re-issued. The visitor watches a white flash the whole time,
 * which is exactly the "white screen while navigating" being reported.
 *
 * `navigate` is React Router's, injected by SystemsSection. It cannot be
 * imported here: useNavigate is a hook and this is a plain controller module.
 *
 * The window.location fallback stays for the case where these controllers are
 * ever driven outside a router — it degrades to the old behaviour rather than
 * silently doing nothing.
 */
function follow(navigate, href) {
  if (!href) return
  if (typeof navigate === 'function') navigate(href)
  else window.location.href = href
}

/**
 * Systems — scroll-morph category carousel.
 *
 * Verbatim port of <script id="sysm-script"> in hero.html
 * (lines 5122-5454).
 *
 * Page scroll (not a wheel hijack — Lenis keeps driving) is mapped to two
 * values: `morph` (circle → bottom arc) and `active` (which category sits
 * at the apex). One rAF loop springs every card toward its computed
 * target — position, tilt, scale, greyscale — mirroring the framer-motion
 * springs of the original React component.
 *
 * NOTE: this section deliberately runs its OWN rAF loop rather than the
 * shared ticker in utils/scroll.js. The shared ticker exists for the
 * image sequences, which are stateless per frame; this loop is a spring
 * integrator with its own dt, its own lastT, and start/stop tied to
 * ScrollTrigger enter/leave so it idles when the section is off screen.
 * Folding it into the shared ticker would change both the integration
 * and when it runs.
 *
 * There is also no image sequence here — the 145-frame `frames/layers`
 * sequence belongs to the Performance/Engineering section.
 */

/* ── Scroll mapping ──────────────────────────────────────────
   p ∈ [0, MORPH_END]             circle → arc morph
   p ∈ [ACTIVE_START, ACTIVE_END] arc rotation through N cards */
export const MORPH_END = 0.2
export const ACTIVE_START = 0.26
export const ACTIVE_END = 0.94

/**
 * Lazy media arming: upgrade video preloading only once the section
 * approaches, so the clips never block initial load.
 * @returns {{ armVideos: () => void, destroy: () => void }}
 */
function createVideoArming(section, videos) {
  let armed = false
  let armIO = null

  function armVideos() {
    if (armed) return
    armed = true
    videos.forEach(function (v) {
      if (!v) return
      v.muted = true // belt & braces for autoplay policies
      v.preload = 'auto'
      try {
        v.load()
      } catch { /* ignore */ }
    })
  }

  if ('IntersectionObserver' in window) {
    armIO = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          armVideos()
          armIO.disconnect()
        }
      },
      { rootMargin: '800px' }
    )
    armIO.observe(section)
  } else {
    armVideos()
  }

  return {
    armVideos,
    destroy: function () {
      if (armIO) armIO.disconnect()
    },
  }
}

/**
 * Static fallback: no GSAP or reduced motion → plain row of cards (all in
 * colour) with every category's copy below.
 */
export function initSystemsStatic(section, cards, infos, videos, reduceMotion, navigate) {
  section.classList.add('sysm--static')
  infos.forEach(function (el) {
    el.classList.add('is-active')
  })

  const clickHandlers = []
  cards.forEach(function (c) {
    const onClick = function () {
      follow(navigate, c.getAttribute('data-href'))
    }
    c.addEventListener('click', onClick)
    clickHandlers.push([c, onClick])
  })

  function teardown() {
    clickHandlers.forEach(function (pair) {
      pair[0].removeEventListener('click', pair[1])
    })
    section.classList.remove('sysm--static')
    infos.forEach(function (el) {
      el.classList.remove('is-active')
    })
  }

  if (reduceMotion) {
    videos.forEach(function (v) {
      if (v) v.controls = true
    })
    return teardown
  }

  let playIO = null
  if ('IntersectionObserver' in window) {
    playIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const v = entry.target.querySelector('video')
          if (!v) return
          if (entry.isIntersecting) {
            const pr = v.play()
            if (pr && pr.catch) pr.catch(function () {})
          } else if (!v.paused) {
            v.pause()
          }
        })
      },
      { threshold: 0.4 }
    )
    cards.forEach(function (c) {
      playIO.observe(c)
    })
  }

  return function () {
    if (playIO) playIO.disconnect()
    teardown()
  }
}

/**
 * Full carousel. Call inside a useGSAP/gsap.context scope so the three
 * ScrollTriggers are reverted for you; the returned cleanup handles the
 * rAF loop, the DOM listeners, the refreshInit hook and the injected
 * track height, none of which gsap.context can track.
 */
export function buildSystemsCarousel(section, scrollEl, refs) {
  const { stage, cards, medias, videos, infos, hint, content, fill, navigate } = refs
  const N = cards.length
  if (!N) return function () {}

  const arming = createVideoArming(section, videos)

  // ── Active-category bookkeeping: the apex card plays its video
  //    (looped) and drops its greyscale; everything else pauses.
  let current = -1
  function setActive(idx) {
    if (idx === current) return
    current = idx
    videos.forEach(function (v, i) {
      if (!v) return
      if (i === idx) {
        const pr = v.play()
        if (pr && pr.catch) pr.catch(function () { /* autoplay blocked — first frame shows */ })
      } else if (!v.paused) {
        v.pause()
      }
    })
    cards.forEach(function (c, i) {
      c.classList.toggle('is-active', i === idx)
    })
    infos.forEach(function (el, i) {
      el.classList.toggle('is-active', i === idx)
    })
  }
  function pauseAll() {
    videos.forEach(function (v) {
      if (v && !v.paused) v.pause()
    })
  }
  function resumeCurrent() {
    const v = current >= 0 ? videos[current] : null
    if (v) {
      const pr = v.play()
      if (pr && pr.catch) pr.catch(function () {})
    }
  }

  let morphT = 0, activeT = 0, parT = 0 // targets (set by scroll/mouse)
  let morphS = 0, activeS = 0, parS = 0 // smoothed (spring-ish)

  /* ── Intro phases (time-based, like the framer original) ── */
  let phase = 'scatter'
  let introStarted = false
  const introTimers = []
  const scatter = cards.map(function () {
    return {
      x: (Math.random() - 0.5) * 1.4, // × stage width
      y: (Math.random() - 0.5) * 1.1, // × stage height
      r: (Math.random() - 0.5) * 160,
    }
  })
  function startIntro() {
    if (introStarted) return
    introStarted = true
    introTimers.push(setTimeout(function () { if (phase === 'scatter') phase = 'line' }, 350))
    introTimers.push(setTimeout(function () { if (phase === 'line') phase = 'circle' }, 1900))
  }

  /* ── Per-card smoothed state ── */
  const state = cards.map(function () {
    return { x: 0, y: 0, r: 0, s: 0.6, o: 0, g: 0 }
  })
  let inited = false

  function lerp(a, b, t) { return a + (b - a) * t }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi) }

  /* ── Render loop ─────────────────────────────────────────── */
  let running = false, rafId = 0, lastT = 0

  function frame(now) {
    if (!running) return
    const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05)
    lastT = now
    const k = 1 - Math.pow(0.0001, dt) // card spring (snappy)
    const kv = 1 - Math.pow(0.002, dt) // value spring (softer)
    const kp = 1 - Math.pow(0.01, dt) // parallax spring (lazy)

    morphS += (morphT - morphS) * kv
    activeS += (activeT - activeS) * kv
    parS += (parT - parS) * kp

    const w = stage.clientWidth, h = stage.clientHeight

    /* ── Entry offset ────────────────────────────────────────────
       The stage is sticky, so on the way in it is still in flow: its
       top sits some way DOWN the viewport while the intro scrolls out,
       and the card field — which centres on the stage — is centred
       below the fold. That put a band of empty white under the intro
       and cut the bottom off the circle.

       Lifting the field by half the distance still to go centres it in
       the part of the stage that is on screen, and the correction
       decays to exactly 0 the moment the stage pins, so nothing about
       the pinned composition changes. Clamped at 0 for the far end of
       the track, where the stage releases and its top goes negative. */
    const stageTop = stage.getBoundingClientRect().top
    stage.style.setProperty('--sysm-entry', (stageTop > 0 ? -stageTop / 2 : 0).toFixed(1) + 'px')
    const isMobile = w < 768
    const cardW = isMobile ? 140 : 230

    /* Arc geometry — convex-up "rainbow"; the apex card is active */
    /* wide enough that neighbouring square cards keep a generous gap */
    const spread = isMobile ? 116 : 128
    const step = spread / (N - 1)
    const arcR = Math.min(w, h * 1.5) * (isMobile ? 1.35 : 0.75)
    /* apex card hangs just above the content block */
    const apexY = h * ((isMobile ? 0.36 : 0.34) - 0.5)
    const arcCY = apexY + arcR
    const rotOff = spread / 2 - activeS * step

    const circleR = Math.min(Math.min(w, h) * 0.32, 310)

    for (let i = 0; i < N; i++) {
      let t
      if (phase === 'scatter') {
        t = { x: scatter[i].x * w, y: scatter[i].y * h, r: scatter[i].r, s: 0.6, o: 0, g: 0 }
      } else if (phase === 'line') {
        const spacing = cardW * 0.85 + 20
        t = { x: (i - (N - 1) / 2) * spacing, y: 0, r: 0, s: 0.85, o: 1, g: 0 }
      } else {
        /* circle slot */
        const ca = (i / N) * 360 - 90
        const cRad = ca * Math.PI / 180
        const cx = Math.cos(cRad) * circleR
        const cy = Math.sin(cRad) * circleR

        /* arc slot (rotated so activeS sits at the apex, -90°) */
        const aa = -90 - spread / 2 + i * step + rotOff
        const aRad = aa * Math.PI / 180
        const ax = Math.cos(aRad) * arcR + parS
        const ay = Math.sin(aRad) * arcR + arcCY

        /* focus: 1 at the apex → 0 one slot away */
        const focus = clamp(1 - Math.abs(aa + 90) / step, 0, 1)
        const arcScale = (isMobile ? 1.0 : 1.02) + focus * (isMobile ? 0.24 : 0.26)

        t = {
          x: lerp(cx, ax, morphS),
          y: lerp(cy, ay, morphS),
          r: lerp(ca + 90, aa + 90, morphS),
          s: lerp(0.9, arcScale, morphS),
          o: 1,
          g: (1 - focus) * morphS,
        }
      }

      const st = state[i]
      if (!inited) { st.x = t.x; st.y = t.y; st.r = t.r }
      st.x += (t.x - st.x) * k
      st.y += (t.y - st.y) * k
      st.r += (t.r - st.r) * k
      st.s += (t.s - st.s) * k
      st.o += (t.o - st.o) * kv
      st.g += (t.g - st.g) * kv

      cards[i].style.transform =
        'translate(calc(-50% + ' + st.x.toFixed(2) + 'px), calc(-50% + ' + st.y.toFixed(2) + 'px)) ' +
        'rotate(' + st.r.toFixed(2) + 'deg) scale(' + st.s.toFixed(3) + ')'
      cards[i].style.opacity = st.o.toFixed(3)
      if (medias[i]) {
        medias[i].style.filter =
          'grayscale(' + st.g.toFixed(3) + ') brightness(' + (1 - 0.12 * st.g).toFixed(3) + ')'
      }
    }
    inited = true

    /* centre hint fades out as the morph begins */
    if (hint) {
      hint.style.opacity = (phase === 'circle'
        ? clamp(1 - morphS * 2.5, 0, 1) : 0).toFixed(3)
    }

    /* copy below the cards fades in once the arc has formed */
    if (content) {
      content.style.opacity = clamp((morphS - 0.7) / 0.3, 0, 1).toFixed(3)
    }

    /* discrete active card (only meaningful once arced) */
    if (morphS > 0.5) setActive(clamp(Math.round(activeS), 0, N - 1))

    rafId = requestAnimationFrame(frame)
  }

  function startLoop() {
    if (running) return
    running = true
    lastT = performance.now()
    rafId = requestAnimationFrame(frame)
  }
  function stopLoop() {
    running = false
    cancelAnimationFrame(rafId)
  }

  /* ── Scroll driver ── */
  ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: function (self) {
      const p = self.progress
      morphT = clamp(p / MORPH_END, 0, 1)
      activeT = clamp((p - ACTIVE_START) / (ACTIVE_END - ACTIVE_START), 0, 1) * (N - 1)
      /* deep-linked or fast scroll: skip the timed intro */
      if (p > 0.02 && phase !== 'circle') { introStarted = true; phase = 'circle' }
      if (fill) fill.style.transform = 'scaleX(' + p + ')'
    },
  })

  /* ── Visibility: run the loop / videos only near the viewport ── */
  ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: function () { startLoop(); resumeCurrent() },
    onEnterBack: function () { startLoop(); resumeCurrent() },
    onLeave: function () { pauseAll(); stopLoop() },
    onLeaveBack: function () { pauseAll(); stopLoop() },
  })

  /* Intro kicks off once the stage is properly on screen */
  ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top 70%',
    once: true,
    onEnter: function () { arming.armVideos(); startIntro() },
  })

  /* ── Mouse parallax (arc drifts ±60px, like the original) ── */
  function onMouseMove(e) {
    const rect = stage.getBoundingClientRect()
    parT = ((e.clientX - rect.left) / rect.width * 2 - 1) * 60
  }
  function onMouseLeave() { parT = 0 }
  stage.addEventListener('mousemove', onMouseMove)
  stage.addEventListener('mouseleave', onMouseLeave)

  /* ── Clicks: side card → scroll it to the apex; active card →
     open its product page (the CTA link does the same). ── */
  function scrollToCard(i) {
    const pTarget = ACTIVE_START + (i / (N - 1)) * (ACTIVE_END - ACTIVE_START)
    const travel = scrollEl.offsetHeight - window.innerHeight
    const top = scrollEl.getBoundingClientRect().top + window.pageYOffset + pTarget * travel
    if (window.__glazeLenis) window.__glazeLenis.scrollTo(top)
    else window.scrollTo({ top: top, behavior: 'smooth' })
  }
  const cardClicks = []
  cards.forEach(function (c, i) {
    const onClick = function () {
      const href = c.getAttribute('data-href')
      if (morphS > 0.6 && i === current && href) {
        follow(navigate, href)
        return
      }
      scrollToCard(i)
    }
    c.addEventListener('click', onClick)
    cardClicks.push([c, onClick])
  })

  /* ── Scroll travel: room for the morph plus one "stop" per card.
     Recomputed on every ScrollTrigger refresh (resize). ── */
  function setHeight() {
    const vh = window.innerHeight
    scrollEl.style.height = Math.round(vh * (2.1 + N * 0.85)) + 'px'
  }
  setHeight()
  ScrollTrigger.addEventListener('refreshInit', setHeight)
  // The original also does an immediate rAF refresh plus a window 'load'
  // refresh here; both are supplied by useScrollTriggerRefresh({ immediate: true })
  // in the component, so the refresh count stays the same.

  return function cleanup() {
    stopLoop()
    introTimers.forEach(clearTimeout)
    arming.destroy()
    pauseAll()
    stage.removeEventListener('mousemove', onMouseMove)
    stage.removeEventListener('mouseleave', onMouseLeave)
    cardClicks.forEach(function (pair) {
      pair[0].removeEventListener('click', pair[1])
    })
    ScrollTrigger.removeEventListener('refreshInit', setHeight)
    scrollEl.style.height = ''
  }
}
