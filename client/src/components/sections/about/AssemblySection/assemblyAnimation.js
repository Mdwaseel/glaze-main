import { gsap, ScrollTrigger } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About — "Assembled, layer by layer" 3D build sequence.
 *
 * ⚠ ORIGINAL CONTENT. Unlike every other section in this folder, this is
 * NOT a port of anything in about.html. It is new work, mounted directly
 * before §02b Process as a visual metaphor for the build. Parity audits
 * will therefore report this whole section as "extra in React" — that is
 * expected, not drift. See docs/migration-log.md.
 *
 * TWO INDEPENDENT SYSTEMS, DELIBERATELY ON SEPARATE ELEMENTS
 * ----------------------------------------------------------
 *   .asm__rig    ← MOUSE orbit only   (rotationX / rotationY)
 *   .asm__model  ← SCROLL only        (the settling hero angle)
 *   .asm__layer  ← SCROLL only        (each panel flying into place)
 *
 * Nothing writes to an element another system also writes to, so the two
 * can never fight over the same matrix or stomp each other's inline
 * styles. That separation is the whole reason the rig element exists.
 *
 * PINNING is CSS `position: sticky` inside a tall track, not
 * ScrollTrigger's `pin`. That is this project's established pattern
 * (§02b Process, Home's Lab and Systems): it needs no pin-spacer, and it
 * stays smooth under Lenis where a pinned/spacered element can judder.
 * The scrub is a real ScrollTrigger scrub; only the pin is CSS.
 *
 * DEFAULT CSS IS THE ASSEMBLED BUILDING. With no JS, no GSAP or reduced
 * motion, every layer already sits in its final position — the section
 * degrades to a still architectural render rather than to nothing. This
 * controller only adds motion on top.
 *
 * ⚠ THE ANIMATED END STATE MUST EQUAL THE CSS REST STATE. CSS parks each
 * panel at `translateZ(var(--depth))`; GSAP's inline transform REPLACES
 * that declaration wholesale, so the fly-in has to land on the panel's
 * own `--depth`, never on a hard-coded 0. Landing on 0 collapses all
 * eleven panels onto one plane and the "building" flattens into a
 * collage — see readDepth() below.
 */

/* ── PACING ────────────────────────────────────────────────────────
   The timeline is measured in UNITS: one unit is one layer's slot.
   Layer i starts at unit i, so `Math.floor(time)` is always the index
   of the panel currently flying — which is what drives the HUD.

   Track height and every progress threshold are DERIVED from these
   three numbers, so retuning the build cannot desynchronise the track,
   the HUD and the orbit hand-off the way three hand-tuned constants
   could. Raise UNIT_VH for a slower build, lower it to tighten. */
const UNIT_VH = 47

/* Each panel's fly-in, in units. Slightly under 1 so consecutive
   panels overlap a little rather than landing metronomically. */
const FLY_DURATION = 0.85

/* Units of fully-assembled, still scroll AFTER the last panel lands.
   This is the window the pointer orbit lives in, so it has to be real
   scroll distance — not a token beat. At UNIT_VH this is ~94vh. */
const HOLD_UNITS = 2

/* How much of the hold the orbit takes to reach full authority, so the
   cursor eases in as the last panel locks instead of snapping on. */
const ORBIT_RAMP_UNITS = 0.8

/* The building's resting angle once assembled — a three-quarter
   architectural view rather than a flat elevation. Must match the
   `transform` authored on .asm__model in the stylesheet. */
const HERO_ANGLE = { rotationY: -14, rotationX: 8 }

/* The angle it starts from, so the whole massing swings gently into
   place while the panels land. */
const OPEN_ANGLE = { rotationY: -28, rotationX: 15 }

/* ── MOUSE ORBIT ───────────────────────────────────────────────────
   Maximum degrees of travel from centre, and how quickly the rig
   chases the cursor. Kept subtle on purpose: this is an architectural
   render being inspected, not a spinning 3D toy. */
const ORBIT_Y = 18 // left / right, degrees
const ORBIT_X = 10 // up / down, degrees
const ORBIT_EASE = 'power3'
const ORBIT_DURATION = 0.6

/**
 * Build the scroll assembly + mouse orbit.
 *
 * @param {HTMLElement} section  #about-assembly
 * @param {object} refs
 * @param {HTMLElement} refs.run    .asm__run   — the tall scroll track
 * @param {HTMLElement} refs.stage  .asm__stage — the sticky viewport
 * @param {HTMLElement} refs.rig    .asm__rig   — mouse-orbited wrapper
 * @param {HTMLElement} refs.model  .asm__model — scroll-rotated wrapper
 * @param {HTMLElement} [refs.hudCount]
 * @param {HTMLElement} [refs.hudName]
 * @returns {(() => void) | undefined} cleanup
 */
export function buildAssembly(section, refs) {
  if (!section || !refs) return
  const { run, stage, rig, model, hudCount, hudName } = refs
  if (!run || !stage || !rig || !model) return

  const layers = [].slice.call(model.querySelectorAll('.asm__layer'))
  if (layers.length < 2) return

  // Reduced motion → the authored CSS already shows the finished
  // building. Nothing to do, and nothing to clean up.
  if (prefersReducedMotion()) return

  // ⚠ Call this from a LAYOUT effect. The track height and the layers'
  // pre-assembly transforms must exist before first paint, or the
  // browser paints the finished building for one frame and then yanks
  // it apart — the same class of flash the Phase 14 word-reveal fix
  // addressed.

  const ground = model.querySelector('.asm__ground')

  /* ── Derived timeline layout ───────────────────────────────────────
     Everything downstream reads these, so the track, the HUD and the
     orbit hand-off cannot drift apart. */
  const assemblyEnd = layers.length - 1 + FLY_DURATION // last panel lands
  const total = assemblyEnd + HOLD_UNITS // timeline duration, in units
  const orbitFrom = assemblyEnd / total // progress: orbit wakes up
  const orbitTo = Math.min(1, (assemblyEnd + ORBIT_RAMP_UNITS) / total)

  /* ── Runtime state ─────────────────────────────────────────────── */
  let orbitGain = 0 // 0 → 1 as the build completes
  let pointerX = 0 // last pointer position, normalised −1 … 1
  let pointerY = 0
  let inView = false // is the track on screen at all?
  let rect = null // cached stage rect — see measure()
  let orbitToY = null // gsap.quickTo setters, assigned inside the context
  let orbitToX = null
  let tl = null
  let liveST = null

  section.classList.add('asm--anim')

  /* The track has to be tall enough for every unit to get its own
     stretch of scroll. Written as a string exactly like §02b does. */
  run.style.height = 100 + total * UNIT_VH + 'vh'

  /* ── Helpers ───────────────────────────────────────────────────────
     Function declarations, so the context callback below can call them
     before they appear in source order. */

  /* The pointer handler normalises against the stage box. Reading that
     box per pointermove forces a layout on every mouse move for the
     whole time About is mounted — a 25,000px page — so it is cached
     instead and refreshed only when it can actually have changed: on
     scroll while in view, and on resize. */
  function measure() {
    rect = stage.getBoundingClientRect()
  }

  function applyOrbit() {
    if (!orbitToY || !orbitToX) return
    orbitToY(pointerX * ORBIT_Y * orbitGain)
    orbitToX(-pointerY * ORBIT_X * orbitGain)
  }

  let lastIndex = -1
  function updateHud(progress) {
    if (!hudCount && !hudName) return
    // Layer i occupies unit i, so the floor of the timeline time IS the
    // index of the panel in flight. No separate span constant to keep
    // in sync with the timeline.
    const i = gsap.utils.clamp(
      0,
      layers.length - 1,
      Math.floor(progress * total)
    )
    if (i === lastIndex) return // only touch the DOM when it changes
    lastIndex = i
    if (hudCount) {
      hudCount.textContent =
        String(i + 1).padStart(2, '0') +
        ' / ' +
        String(layers.length).padStart(2, '0')
    }
    if (hudName) hudName.textContent = layers[i].dataset.name || ''
  }

  /* ── GSAP context ──────────────────────────────────────────────────
     Every tween and ScrollTrigger is created INSIDE this callback, so
     ctx.revert() genuinely reverts them. (A context whose callback is
     empty records nothing and its revert is a no-op — the trap this
     replaces.) The context is scoped to `section`, so any selector
     text used inside resolves within this section only. */
  const ctx = gsap.context(() => {
    /* ── 1. Scroll assembly ──────────────────────────────────────── */
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: run,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          // Orbit authority ramps in across the head of the hold beat,
          // i.e. strictly AFTER the last panel has landed.
          const gain = gsap.utils.clamp(
            0,
            1,
            (p - orbitFrom) / (orbitTo - orbitFrom)
          )
          if (gain !== orbitGain) {
            orbitGain = gain
            applyOrbit()
          }
          updateHud(p)
        },
      },
    })

    // The massing swings from its open angle to the resting hero angle
    // across the build, arriving exactly as the last panel locks.
    tl.fromTo(
      model,
      { ...OPEN_ANGLE },
      { ...HERO_ANGLE, duration: assemblyEnd },
      0
    )

    // The contact shadow belongs to the building, so it arrives with
    // it rather than sitting on an empty stage waiting.
    if (ground) {
      tl.fromTo(
        ground,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: FLY_DURATION, ease: 'power2.out' },
        0
      )
    }

    // Each panel flies in from its own 3D coordinate and locks home.
    // The from-values are authored as data attributes so the choreography
    // can be retuned in the markup without touching this file.
    layers.forEach((layer, i) => {
      const from = readLayerOrigin(layer)
      tl.fromTo(
        layer,
        {
          xPercent: from.xPercent,
          yPercent: from.yPercent,
          z: from.z,
          rotationX: from.rotationX,
          rotationY: from.rotationY,
          rotationZ: from.rotationZ,
          autoAlpha: 0,
        },
        {
          xPercent: 0,
          yPercent: 0,
          // ⚠ NOT 0 — the panel's authored depth. GSAP's inline
          // transform replaces the stylesheet's translateZ(var(--depth)),
          // so landing on 0 would flatten the model onto one plane.
          z: readDepth(layer),
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          autoAlpha: 1,
          duration: FLY_DURATION,
          ease: 'power2.out',
        },
        i
      )
    })

    // Held stillness at the end: the finished building sits fully
    // assembled for a real stretch of scroll before the section leaves,
    // which is the window the orbit lives in. Extends the timeline to
    // exactly `total` units.
    tl.to({}, { duration: HOLD_UNITS }, assemblyEnd)

    /* ── 1b. Compositor promotion + visibility gate ────────────────────
       `will-change: transform` on 13 elements is worth paying for while
       the section is on screen and pure memory cost across the rest of a
       25,000px page. A declarative trigger spanning the whole time the
       section is visible is both cheaper and more correct than the
       assembly trigger's own onToggle: that one reports inactive at
       progress 1 — exactly when the build has finished and the user is
       most likely to still be orbiting.

       ⚠ The trigger is the TRACK, not the stage. ScrollTrigger measures an
       element at its natural offset, and the stage is `position: sticky` —
       triggering off it gives a range one viewport tall instead of one
       spanning the whole pinned sequence, so the class would switch off
       after the first 900px of a 6,345px track.

       It doubles as the pointer handler's visibility gate and the cache
       refresh for the stage rect. */
    liveST = ScrollTrigger.create({
      trigger: run,
      start: 'top bottom',
      end: 'bottom top',
      toggleClass: { targets: section, className: 'asm--live' },
      onToggle: (self) => {
        inView = self.isActive
        if (inView) {
          measure()
        } else {
          // Recentre so the model is square-on when scrolled back to.
          pointerX = 0
          pointerY = 0
          applyOrbit()
        }
      },
      onUpdate: measure,
    })

    /* ── 2. Mouse orbit ────────────────────────────────────────────── */
    // quickTo keeps this to two cheap setter calls per pointer event; the
    // interpolation itself rides GSAP's single ticker rather than a
    // listener-driven rAF of our own.
    orbitToY = gsap.quickTo(rig, 'rotationY', {
      duration: ORBIT_DURATION,
      ease: ORBIT_EASE,
    })
    orbitToX = gsap.quickTo(rig, 'rotationX', {
      duration: ORBIT_DURATION,
      ease: ORBIT_EASE,
    })
  }, section)

  // Seed the gate + rect for a load that lands mid-section (a refresh
  // partway down the page, or a hash link). onToggle only fires on a
  // CHANGE, so an already-active trigger would otherwise never arm it.
  if (liveST) {
    inView = liveST.isActive
    if (inView) measure()
  }

  /* ── 3. Pointer wiring ─────────────────────────────────────────── */
  function onPointerMove(e) {
    // Cheap boolean first: while the section is off screen — which is
    // most of this page — the handler costs one comparison and no
    // layout. `rect` is maintained by measure(), never read here.
    if (!inView || !rect || !rect.width || !rect.height) return
    pointerX = gsap.utils.clamp(
      -1,
      1,
      ((e.clientX - rect.left) / rect.width - 0.5) * 2
    )
    pointerY = gsap.utils.clamp(
      -1,
      1,
      ((e.clientY - rect.top) / rect.height - 0.5) * 2
    )
    applyOrbit()
  }

  // ⚠ On the DOCUMENT, not the stage. pointermove is bound to the
  // window so the orbit stays responsive to the edges of the viewport;
  // a stage-level pointerleave therefore recentres and is immediately
  // overwritten by the next window pointermove, leaving the model stuck
  // at full deflection. Leaving the document is the event that actually
  // means "not inspecting any more".
  function onPointerLeave() {
    pointerX = 0
    pointerY = 0
    applyOrbit()
  }

  // Fine-pointer devices only. On touch there is no hover to inspect
  // with, and binding it would cost a listener for nothing.
  const finePointer =
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches

  if (finePointer) {
    // Listening on the window rather than the stage keeps the rotation
    // responsive right to the edges of the viewport; `inView` is what
    // stops it doing any work while the section is off screen.
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('resize', measure)
    document.addEventListener('pointerleave', onPointerLeave, { passive: true })
    section.classList.add('asm--orbit')
  }

  updateHud(0)

  /* ── 4. Cleanup ────────────────────────────────────────────────── */
  // Must fully restore the DOM: React owns this markup, and a route
  // change or StrictMode's double-invoke would otherwise leave inline
  // transforms, a stale track height and live listeners behind.
  return () => {
    if (finePointer) {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', measure)
      document.removeEventListener('pointerleave', onPointerLeave)
    }
    // ⚠ quickTo parks a PAUSED tween on the global timeline and reuses
    // it for every call. gsap.killTweensOf() does not reach it, so each
    // mount would strand two tweens on the global timeline — 2 per SPA
    // round trip, forever. Kill them through the handle quickTo exposes.
    if (orbitToY && orbitToY.tween) orbitToY.tween.kill()
    if (orbitToX && orbitToX.tween) orbitToX.tween.kill()
    // Explicit kills as well as the revert: the context owns these, but
    // teardown of this section is measured in the migration log and is
    // cheaper to over-specify than to re-verify.
    if (liveST) liveST.kill()
    if (tl) {
      if (tl.scrollTrigger) tl.scrollTrigger.kill()
      tl.kill()
    }
    ctx.revert()
    const targets = ground ? [rig, model, ground, ...layers] : [rig, model, ...layers]
    gsap.killTweensOf(targets)
    gsap.set(targets, { clearProps: 'all' })
    run.style.height = ''
    section.classList.remove('asm--anim', 'asm--orbit', 'asm--live')
  }
}

/**
 * Read a layer's fly-in origin from its data attributes, falling back to
 * a sensible default so a new layer can be dropped into the markup with
 * no attributes at all.
 *
 *   data-from-x   xPercent, relative to the layer's own width
 *   data-from-y   yPercent, relative to its own height
 *   data-from-z   px along the camera axis (negative = further away),
 *                 absolute — NOT an offset from the panel's rest depth
 *   data-from-rx / -ry / -rz   degrees
 */
function readLayerOrigin(el) {
  const n = (key, fallback) => {
    const v = parseFloat(el.dataset[key])
    return Number.isFinite(v) ? v : fallback
  }
  return {
    xPercent: n('fromX', 0),
    yPercent: n('fromY', -60),
    z: n('fromZ', -400),
    rotationX: n('fromRx', 20),
    rotationY: n('fromRy', 0),
    rotationZ: n('fromRz', 0),
  }
}

/**
 * The panel's resting depth on the camera axis, in px.
 *
 * The stylesheet parks each panel at `translateZ(var(--depth))` for the
 * still no-JS render. GSAP's inline transform overrides that declaration
 * outright, so the fly-in has to land on this value explicitly or the
 * whole model collapses onto z = 0 and reads as a flat collage.
 *
 * ⚠ Read from `data-depth`, NOT from the `--depth` custom property.
 * AssemblySection.jsx emits both from the same `geo.depth`, but a custom
 * property set through React's style object does not reliably read back
 * off `element.style` — measured empty on all eleven panels — which
 * would silently return 0 here and reinstate the very bug this fixes.
 * `element.dataset` is the dependable path, and it is already how every
 * other bit of this choreography is authored.
 */
function readDepth(el) {
  const v = parseFloat(el.dataset.depth)
  return Number.isFinite(v) ? v : 0
}
