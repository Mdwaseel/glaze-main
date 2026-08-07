import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * Origin — pinned depth flight, 1989 → 2026.
 *
 * Verbatim port of <script id="about-origin-script"> in about.html
 * (lines 5021-5467) — the largest controller in the project.
 *
 * A camera flies down a line of planes (the intro text block, then one
 * per era figure), each projected at `PERSPECTIVE / (PERSPECTIVE − z)`.
 * A damped "thread" ribbon rides the camera between the planes' inner
 * edges, and a full-bleed wash lerps between the per-era palettes.
 *
 * NOT reusing any shared hook here, deliberately:
 *  • the flight has its own gsap.ticker loop with a settle/sleep state —
 *    it is not the shared rAF ticker (that one is for the Home image
 *    sequences and has no idea about settling)
 *  • it strips the page reveal primitives off the era figures so the fog
 *    fades own every reveal inside the flight
 * Both are single-use. The only shared import is utils/gsap.
 *
 * Every numeric constant below is copied from the original; they are the
 * pacing and cannot be "tidied".
 */

/* ── PACING ─────────────────────────────────────────
   ORIGIN_TRACK_VH — extra viewport-heights the flight
   lasts. ~70 ≈ one unhurried wheel-length per plane, so
   the intro text + four eras want 350. (It was 420 when
   there were five eras; leaving it there would not have
   slowed the flight — HOLD and the camera target are both
   fractions of the track, so the same scrub would simply
   have been stretched over a longer pin, adding a
   viewport-height of dead scrolling at the same speed.) */
export const ORIGIN_TRACK_VH = 350

/* ── PROJECTION (after codrops-depth-gallery) ───────
   GAP         — px of camera travel between planes
                 (the source's planeGap).
   PERSPECTIVE — projection strength; a plane at depth z
                 renders at scale P / (P − z).
   HOLD        — fraction of the scrub the camera waits
                 on the intro text before lifting off.
   CAM_LERP    — per-frame smoothing towards the scroll
                 target (the source's scrollSmoothing). */
const GAP = 620
const PERSPECTIVE = 900
const HOLD = 0.06
const CAM_LERP = 0.11

/* Scatter of the era planes off the camera line, in
   viewport units (vw / vh) at focus — the source's
   basePosition spread. The last era lands dead-centre so
   the flight settles before the pin releases. On small
   screens the x-spread collapses like the source's
   mobileXSpreadFactor. */
const SCATTER = [
  { x: 11, y: -4 },
  { x: -12, y: 5 },
  { x: 10, y: 6 },
  { x: 0, y: 0 },
]

/* Colour per plane, intro first — each image defines its own
   palette, as in the source demo. `hex` documents the
   dominant colour sampled from that photograph; `wash` is a
   lifted pastel of the same hue that tints the full-bleed
   backdrop while the era holds focus, at strength `a`.

   Re-sampled from the commissioned photographs, and the arc
   they happen to make is the section's own: warm sepia
   workshop → daylit concrete floor → the near-white CNC hall
   (`a` drops to 0.2 there, since that frame is already bright
   and any heavier wash just greys the page) → travertine and
   garden light at home. Cold in the middle, warm at both
   ends — the metal going out and the room coming back. */
const PALETTE = [
  { name: '', hex: '#F5F5F3', wash: [245, 245, 243], a: 0 },
  { name: 'Umber', hex: '#5A483C', wash: [156, 131, 107], a: 0.32 },
  { name: 'Concrete', hex: '#77787A', wash: [150, 153, 158], a: 0.26 },
  { name: 'Silver', hex: '#A8AEB3', wash: [178, 184, 190], a: 0.2 },
  { name: 'Travertine', hex: '#9C8F76', wash: [186, 176, 150], a: 0.32 },
]

/* Trail tuning — the source demo's numbers, adapted to 2D:
   damping 0.12 · min point spacing · max points (tail
   length) · max trim per frame 4 · teleport reset. */
const TRAIL_DAMP = 0.12
const TRAIL_MIN_DIST = 9
const TRAIL_MAX = 56
const TRAIL_TRIM = 4
const TRAIL_RESET_DIST = 420

const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * @param {HTMLElement} section  #about-origin
 * @param {{scrollEl: HTMLElement, textEl: HTMLElement, erasWrap: HTMLElement}} refs
 * @returns {() => void} cleanup
 */
export function buildOriginFlight(section, refs) {
  const { scrollEl, textEl, erasWrap } = refs
  const eras = [].slice.call(erasWrap ? erasWrap.querySelectorAll('.origin__era') : [])
  if (!section || !scrollEl || !textEl || !erasWrap) return () => {}
  if (eras.length < 2) return () => {}
  const stage = section.querySelector('.origin__stage')
  if (!stage) return () => {}

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) return () => {}
  // (static spread stays: the full archive strip)
  // The original also bailed when GSAP failed to load from the CDN; it is
  // bundled here, so only the motion check remains.

  section.classList.add('origin--anim')
  scrollEl.style.height = 100 + ORIGIN_TRACK_VH + 'vh'

  // The flight owns every reveal in here — strip the base
  // script's first-reveal primitives from the era figures so
  // nothing double-fires against the fog fades.
  const stripped = []
  ;[].forEach.call(erasWrap.querySelectorAll('.wipe-in, .fade-up'), function (el) {
    stripped.push([el, el.className])
    el.classList.remove('wipe-in', 'fade-up', 'is-revealed')
  })

  // ── The planes: the intro text block first, then one per
  // figure, each a GAP further down the camera line.
  const planes = [{ el: textEl, x: 0, y: 0 }].concat(
    eras.map(function (era, i) {
      const s = SCATTER[i % SCATTER.length]
      return { el: era, x: s.x, y: s.y }
    })
  )
  const LAST = planes.length - 1
  planes.forEach(function (p) {
    p.lastO = -1 // last written opacity
    p.lastB = -1 // last written blur
    p.shown = null // last written visibility
  })

  // ── Atmosphere layer (an animated-mode artefact, so it is
  // created here and static pages carry no trace of it).
  const atmo = document.createElement('div')
  atmo.className = 'origin__atmo'
  atmo.setAttribute('aria-hidden', 'true')
  stage.insertBefore(atmo, stage.firstChild)

  // ── The thread — the source demo's trail, translated to SVG.
  // A damped head chases an attractor that rides the camera
  // from each image's inner edge to the next through the
  // centre corridor; the head leaves a history of points that
  // trims away from the tail, and the ribbon renders as a
  // Catmull-Rom-smoothed path: a blurred glow pass under a
  // bright core, above the planes (the source draws its tube
  // with depthTest off). The route hugs image edges, so it
  // never lies across a photograph.
  const thread = document.createElementNS(SVG_NS, 'svg')
  thread.setAttribute('class', 'origin__thread')
  thread.setAttribute('aria-hidden', 'true')
  const threadGlow = document.createElementNS(SVG_NS, 'path')
  threadGlow.setAttribute('class', 'origin__thread-glow')
  const threadCore = document.createElementNS(SVG_NS, 'path')
  threadCore.setAttribute('class', 'origin__thread-core')
  const threadHead = document.createElementNS(SVG_NS, 'circle')
  threadHead.setAttribute('class', 'origin__thread-head')
  threadHead.setAttribute('r', '3.2')
  thread.appendChild(threadGlow)
  thread.appendChild(threadCore)
  thread.appendChild(threadHead)
  stage.appendChild(thread)

  const trailPts = []
  let headX = 0
  let headY = 0
  let headLive = false
  let figW = eras[0].offsetWidth || 0

  // The inner-edge anchor of an era plane, from its live
  // projected position — 16px of air off the frame, on the
  // side facing the centre corridor (the text sits opposite).
  function threadAnchor(idx) {
    const p = planes[idx]
    const cx = vw / 2 + (p.px || 0)
    const cy = vh / 2 + (p.py || 0)
    const sign = cx <= vw / 2 ? 1 : -1
    return {
      x: cx + sign * ((figW * (p.ps || 1)) / 2 + 16),
      y: cy,
    }
  }

  // Catmull-Rom through the trail points, as cubic beziers.
  function threadPath(pts2) {
    let d = 'M' + pts2[0].x.toFixed(1) + ' ' + pts2[0].y.toFixed(1)
    for (let i = 0; i < pts2.length - 1; i++) {
      const p0 = pts2[i - 1] || pts2[i]
      const p1 = pts2[i]
      const p2 = pts2[i + 1]
      const p3 = pts2[i + 2] || p2
      d +=
        'C' + (p1.x + (p2.x - p0.x) / 6).toFixed(1) + ' ' +
        (p1.y + (p2.y - p0.y) / 6).toFixed(1) + ' ' +
        (p2.x - (p3.x - p1.x) / 6).toFixed(1) + ' ' +
        (p2.y - (p3.y - p1.y) / 6).toFixed(1) + ' ' +
        p2.x.toFixed(1) + ' ' + p2.y.toFixed(1)
    }
    return d
  }

  // ── Camera + input state. The camera chases camTarget with
  // a lerp each frame (like the source gallery's scroll
  // smoothing); the pointer and the scroll velocity are
  // smoothed the same way.
  let cam = 0
  let camTarget = 0
  let vel = 0 // smoothed scroll velocity, −1…1
  let pX = 0,
    pY = 0 // smoothed pointer, −1…1
  let pTX = 0,
    pTY = 0
  let vw = window.innerWidth
  let vh = window.innerHeight
  let spread = vw <= 860 ? 0.3 : 1
  let settled = false

  function onResize() {
    vw = window.innerWidth
    vh = window.innerHeight
    spread = vw <= 860 ? 0.3 : 1
    figW = eras[0].offsetWidth || figW
    trailPts.length = 0
    headLive = false
    settled = false
  }
  window.addEventListener('resize', onResize)

  const finePointer = window.matchMedia('(pointer: fine)').matches
  function onMouseMove(e) {
    pTX = (e.clientX / vw) * 2 - 1
    pTY = (e.clientY / vh) * 2 - 1
  }
  function onMouseLeave() {
    pTX = 0
    pTY = 0
  }
  if (finePointer) {
    stage.addEventListener('mousemove', onMouseMove)
    stage.addEventListener('mouseleave', onMouseLeave)
  }

  function smoothstep(a, b, t) {
    t = Math.min(1, Math.max(0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)
  }

  let atmoKey = ''

  function render() {
    // Legibility guard: the era photographs (and the colour
    // wash) hold back until the intro text has begun its pass,
    // so the headline always reads on clean bone before the
    // first photograph blooms in behind it.
    const guard = smoothstep(0.12 * GAP, 0.8 * GAP, cam)

    for (let i = 0; i < planes.length; i++) {
      const p = planes[i]
      // z: this plane's depth relative to the camera —
      // negative = still ahead (far), 0 = in focus,
      // positive = already passed (flying by the lens).
      const z = cam - i * GAP

      if (z < -3.05 * GAP || z > 0.56 * GAP) {
        if (p.shown !== false) {
          p.el.style.visibility = 'hidden'
          p.shown = false
        }
        continue
      }
      if (p.shown !== true) {
        p.el.style.visibility = 'visible'
        p.shown = true
      }

      const s = PERSPECTIVE / (PERSPECTIVE - z)

      // Fade in out of the haze, fade out fast once passed;
      // every plane after the intro obeys the guard.
      const oIn = Math.pow(smoothstep(-2.9 * GAP, -0.35 * GAP, z), 2.2)
      const oOut = 1 - smoothstep(0.08 * GAP, 0.5 * GAP, z)
      const o = oIn * oOut * (i === 0 ? 1 : guard)

      // Lateral scatter is projected (× s) so nearer planes
      // spread wider; the pointer adds a depth-weighted
      // parallax on top.
      const x = (p.x / 100) * vw * spread * s - pX * (8 + 16 * s)
      const y = (p.y / 100) * vh * s - pY * (5 + 9 * s)

      p.el.style.transform =
        'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')'
      p.el.style.zIndex = String(100 + Math.round((z / GAP) * 10))

      // live projected values, read by the thread below
      p.px = x
      p.py = y
      p.ps = s

      if (Math.abs(o - p.lastO) > 0.004) {
        p.el.style.opacity = o.toFixed(3)
        p.lastO = o
      }

      // Atmospheric blur: distance haze, a kiss of defocus as
      // a plane passes the lens, and a breath of motion blur
      // from the scroll velocity.
      let b =
        Math.max(0, -z / GAP - 0.55) * 4 +
        smoothstep(0.16 * GAP, 0.56 * GAP, z) * 3 +
        Math.abs(vel) * 1.6
      b = Math.min(b, 7)
      if (Math.abs(b - p.lastB) > 0.15) {
        p.el.style.filter = b < 0.2 ? 'none' : 'blur(' + b.toFixed(2) + 'px)'
        p.lastB = b
      }
    }

    // ── The thread: the attractor rides the camera from one
    // image's inner edge to the next, arcing through the
    // centre corridor (the arc side alternates per gap); the
    // damped head chases it, laying points behind itself.
    const f = cam / GAP
    const ef = Math.min(planes.length - 2, Math.max(0, f - 1))
    const ia = Math.min(planes.length - 3, Math.floor(ef))
    const tt = ef - ia
    const A = threadAnchor(ia + 1)
    const B = threadAnchor(ia + 2)
    const mx = (A.x + B.x) / 2
    const my = (A.y + B.y) / 2 + (ia % 2 ? -70 : 70)
    const uu = 1 - tt
    const tx = uu * uu * A.x + 2 * uu * tt * mx + tt * tt * B.x
    const ty = uu * uu * A.y + 2 * uu * tt * my + tt * tt * B.y

    // teleport (jump-to-scroll, re-entry) → reset the ribbon
    if (!headLive || Math.abs(tx - headX) + Math.abs(ty - headY) > TRAIL_RESET_DIST) {
      headX = tx
      headY = ty
      trailPts.length = 0
      headLive = true
    } else {
      headX += (tx - headX) * TRAIL_DAMP
      headY += (ty - headY) * TRAIL_DAMP
    }

    const lastPt = trailPts[trailPts.length - 1]
    if (
      !lastPt ||
      Math.abs(headX - lastPt.x) + Math.abs(headY - lastPt.y) > TRAIL_MIN_DIST
    ) {
      trailPts.push({ x: headX, y: headY })
    }

    // trim from the tail — capped per frame; when the scroll
    // rests the ribbon drains away and only the head remains
    const over = trailPts.length - TRAIL_MAX
    const idleTrim = Math.abs(vel) < 0.02 ? 2 : 0
    const trim = Math.min(TRAIL_TRIM, Math.max(over, idleTrim))
    if (trim > 0) trailPts.splice(0, trim)

    const tOpacity = guard * Math.min(1, trailPts.length / 6)
    if (trailPts.length > 1) {
      const dStr = threadPath(trailPts)
      threadGlow.setAttribute('d', dStr)
      threadCore.setAttribute('d', dStr)
    }
    threadGlow.style.opacity = (tOpacity * 0.35).toFixed(3)
    threadCore.style.opacity = (tOpacity * 0.9).toFixed(3)
    threadHead.setAttribute('cx', headX.toFixed(1))
    threadHead.setAttribute('cy', headY.toFixed(1))
    threadHead.style.opacity = (guard * 0.9).toFixed(3)

    // ── Full-bleed wash: lerp between the two nearest era
    // colours — each photograph grades the whole backdrop, as
    // in the source demo. The guard keeps the open on plain
    // bone; scroll velocity deepens the mood.
    const ti = Math.min(LAST, Math.max(0, Math.floor(f)))
    const tj = Math.min(LAST, ti + 1)
    const tf = Math.min(1, Math.max(0, f - ti))
    const PA = PALETTE[ti % PALETTE.length]
    const PB = PALETTE[tj % PALETTE.length]
    const r = Math.round(PA.wash[0] + (PB.wash[0] - PA.wash[0]) * tf)
    const g = Math.round(PA.wash[1] + (PB.wash[1] - PA.wash[1]) * tf)
    const bch = Math.round(PA.wash[2] + (PB.wash[2] - PA.wash[2]) * tf)
    const al = (PA.a + (PB.a - PA.a) * tf) * guard * (1 + Math.abs(vel) * 0.5)
    const key = r + ',' + g + ',' + bch + ',' + al.toFixed(3)
    if (key !== atmoKey) {
      atmoKey = key
      const c = r + ',' + g + ',' + bch
      atmo.style.background =
        'linear-gradient(155deg, rgba(' + c + ',' + al.toFixed(3) +
        ') 0%, rgba(' + c + ',' + (al * 0.45).toFixed(3) +
        ') 52%, rgba(' + c + ',' + (al * 0.1).toFixed(3) +
        ') 100%), radial-gradient(90% 70% at 50% 46%, rgba(' + c +
        ',' + (al * 0.55).toFixed(3) + ') 0%, rgba(' + c + ',0) 72%)'
    }
  }

  // ── The flight loop: chase the targets, render, and go to
  // sleep (skip all DOM writes) once everything has settled.
  function tick() {
    const dc = camTarget - cam
    const dx = pTX - pX
    const dy = pTY - pY
    const moving =
      Math.abs(dc) > 0.04 ||
      Math.abs(dx) > 0.0015 ||
      Math.abs(dy) > 0.0015 ||
      Math.abs(vel) > 0.003 ||
      // keep rendering while the ribbon drains to nothing
      trailPts.length > 0
    if (!moving) {
      if (!settled) {
        cam = camTarget
        pX = pTX
        pY = pTY
        vel = 0
        render()
        settled = true
      }
      return
    }
    settled = false
    cam += dc * CAM_LERP
    pX += dx * 0.07
    pY += dy * 0.07
    vel *= 0.9
    render()
  }

  // ── The scrub: progress → camera target; the ticker only
  // runs while the stage is on screen.
  function applyProgress(prog) {
    const p = Math.min(1, Math.max(0, prog))
    const t = p <= HOLD ? 0 : (p - HOLD) / (1 - HOLD)
    camTarget = t * LAST * GAP
  }

  const st = ScrollTrigger.create({
    trigger: scrollEl,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: function (self) {
      applyProgress(self.progress)
      vel = Math.max(-1, Math.min(1, self.getVelocity() / 2600))
    },
    onToggle: function (self) {
      if (self.isActive) {
        settled = false
        gsap.ticker.add(tick)
      } else {
        gsap.ticker.remove(tick)
        // Snap to the resting pose so re-entry starts clean.
        applyProgress(self.progress)
        cam = camTarget
        vel = 0
        render()
      }
    },
  })

  // First paint: put every plane where the current scroll says
  // (a reload mid-track must not flash the wrong pose).
  applyProgress(st.progress)
  cam = camTarget
  render()

  // The original never tears this down — the page simply ends. In React
  // the runtime-created atmosphere layer and thread SVG would accumulate
  // on every remount, the ticker callback would keep running against a
  // detached tree, and the stripped reveal classes would stay stripped.
  return function cleanup() {
    // Kill the trigger FIRST. Measured on the preview build: without this
    // the trigger survives unmount, so an About → Home → About round trip
    // left 2, then 3, then 4 live triggers on #originScroll — and each
    // stale one still owns an onToggle that would push its own tick()
    // back onto gsap.ticker, writing to a detached tree forever.
    st.kill()
    gsap.ticker.remove(tick)
    window.removeEventListener('resize', onResize)
    if (finePointer) {
      stage.removeEventListener('mousemove', onMouseMove)
      stage.removeEventListener('mouseleave', onMouseLeave)
    }
    if (atmo.parentNode) atmo.parentNode.removeChild(atmo)
    if (thread.parentNode) thread.parentNode.removeChild(thread)
    // Undo the inline pose the flight wrote onto each plane.
    planes.forEach(function (p) {
      p.el.style.transform = ''
      p.el.style.opacity = ''
      p.el.style.filter = ''
      p.el.style.visibility = ''
      p.el.style.zIndex = ''
    })
    // Put the page reveal primitives back so a remount is clean.
    stripped.forEach(function (pair) {
      pair[0].className = pair[1]
    })
    scrollEl.style.height = ''
    section.classList.remove('origin--anim')
  }
}
