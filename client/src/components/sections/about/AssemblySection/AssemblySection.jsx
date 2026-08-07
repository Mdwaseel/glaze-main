import { useLayoutEffect, useRef } from 'react'
import { buildAssembly } from './assemblyAnimation'
import './assemblySection.css'

/**
 * AssemblySection — "Assembled, layer by layer".
 *
 * ⚠ ORIGINAL CONTENT, not a port. Every other section in this folder is
 * a line-for-line transcription of about.html; this one is new work,
 * mounted immediately before §02b Process as a visual metaphor for the
 * build. Parity audits will report it as extra in React by design.
 *
 * A full-screen stage pins via CSS `position: sticky` inside a tall
 * track while eleven architectural panels fly in from their own 3D
 * coordinates and lock together into a modern house. Once assembled,
 * the pointer orbits the finished model like an architectural render.
 *
 * It rides the page's existing primitives — `.fade-up` and
 * `.js-word-reveal` are picked up by useAboutFadeReveal and
 * useAboutWordReveal, which About already mounts — so the intro needs no
 * wiring of its own.
 *
 * ────────────────────────────────────────────────────────────────────
 * SWAPPING IN FINAL 3D RENDERS
 * ────────────────────────────────────────────────────────────────────
 * Every panel below is drawn in pure CSS (glass / metal / stone), so
 * this works with zero assets today. To use real renders, add a `src`
 * to any layer in LAYERS:
 *
 *   { id: 'roof', name: 'Roof plane', src: '/images/about/assembly/roof.webp', … }
 *
 * Put the file in `client/public/images/about/assembly/` and reference
 * it root-absolute, exactly as every other image on this page does.
 * `.asm__layer:has(> .asm__layer-img)` drops the glass tint
 * automatically, keeping the edge highlight and shadow as the frame —
 * no CSS change needed. Export each layer as a transparent PNG/WebP
 * pre-rendered at the same three-quarter angle the model rests at
 * (rotateY −14°, rotateX 8°); mixing baked-in perspective with the
 * live transform is what makes composited layers look wrong.
 *
 * Keep each panel's `depth` when you swap: it is the panel's resting
 * position on the camera axis, and it is what separates the fins and
 * the canopy from the façade in the assembled model. The controller
 * lands every fly-in on this exact value (see readDepth in
 * assemblyAnimation.js), so it stays true whether or not JS runs.
 * ────────────────────────────────────────────────────────────────────
 */

/**
 * The building, bottom-up.
 *
 * Geometry (`l`/`t`/`w`/`h`/`depth`) positions each panel inside the
 * shared 16:11 scene box, in percentages, so the whole model scales
 * with the viewport and never needs a media query of its own.
 *
 * `depth` is the panel's resting position on the camera axis and is
 * emitted TWICE from this one source: as the `--depth` custom property,
 * which the stylesheet uses for the still no-JS render, and as
 * `data-depth`, which is what the controller lands each fly-in on. Both
 * come from `geo.depth`, so they cannot drift — but the data attribute
 * is the one JS reads, because `element.dataset` is dependable where
 * reading a custom property back off `element.style` is not.
 *
 * `from` is where the panel flies in FROM — read off the data
 * attributes by the controller, so the choreography can be retuned here
 * without touching the animation module.
 *   x / y : percent of the panel's own size
 *   z     : px along the camera axis (negative = further away)
 *   rx/ry/rz : degrees
 */
const LAYERS = [
  {
    id: 'plinth',
    name: 'Foundation',
    material: 'base',
    geo: { l: '12%', t: '76%', w: '76%', h: '7%', depth: '0px' },
    from: { y: 140, z: -260, rx: 34 },
  },
  {
    id: 'slab-ground',
    name: 'Ground slab',
    material: 'metal',
    geo: { l: '15%', t: '70%', w: '70%', h: '5%', depth: '10px' },
    from: { x: -110, y: 30, z: -520, ry: 46, rz: -7 },
  },
  {
    id: 'glass-ground-l',
    name: 'Ground glazing',
    geo: { l: '17%', t: '46%', w: '31%', h: '25%', depth: '40px' },
    from: { x: -140, z: -600, ry: 58 },
  },
  {
    id: 'glass-ground-r',
    name: 'Ground glazing',
    geo: { l: '52%', t: '46%', w: '31%', h: '25%', depth: '40px' },
    from: { x: 140, z: -600, ry: -58 },
  },
  {
    id: 'core',
    name: 'Structural core',
    material: 'metal',
    geo: { l: '47%', t: '30%', w: '6%', h: '42%', depth: '-30px' },
    from: { y: -150, z: -380, rx: -26 },
  },
  {
    id: 'slab-first',
    name: 'First-floor slab',
    material: 'metal',
    geo: { l: '13%', t: '42%', w: '74%', h: '5%', depth: '18px' },
    from: { x: 120, y: -20, z: -540, ry: -40, rz: 6 },
  },
  {
    id: 'glass-first',
    name: 'Upper glazing',
    geo: { l: '19%', t: '20%', w: '62%', h: '23%', depth: '30px' },
    from: { y: -170, z: -520, rx: -34 },
  },
  {
    id: 'fin-l',
    name: 'Solar fins',
    material: 'metal',
    geo: { l: '15%', t: '18%', w: '3%', h: '54%', depth: '70px' },
    from: { x: -180, z: -300, ry: 70 },
  },
  {
    id: 'fin-r',
    name: 'Solar fins',
    material: 'metal',
    geo: { l: '82%', t: '18%', w: '3%', h: '54%', depth: '70px' },
    from: { x: 180, z: -300, ry: -70 },
  },
  {
    id: 'roof',
    name: 'Roof plane',
    material: 'metal',
    geo: { l: '11%', t: '15%', w: '78%', h: '5%', depth: '24px' },
    from: { y: -260, z: -420, rx: -44 },
  },
  {
    id: 'canopy',
    name: 'Entrance canopy',
    geo: { l: '30%', t: '66%', w: '40%', h: '4%', depth: '110px' },
    from: { y: 180, z: 260, rx: 40 },
  },
]

export default function AssemblySection() {
  const sectionRef = useRef(null)
  const runRef = useRef(null)
  const stageRef = useRef(null)
  const rigRef = useRef(null)
  const modelRef = useRef(null)
  const hudCountRef = useRef(null)
  const hudNameRef = useRef(null)

  // LAYOUT effect, not a passive one: the track height and the layers'
  // opened-up transforms have to be in place before first paint, or the
  // browser shows the finished building for a frame and then pulls it
  // apart. Same reasoning as §02b Process and the Phase 14 word-reveal.
  useLayoutEffect(
    () =>
      buildAssembly(sectionRef.current, {
        run: runRef.current,
        stage: stageRef.current,
        rig: rigRef.current,
        model: modelRef.current,
        hudCount: hudCountRef.current,
        hudName: hudNameRef.current,
      }),
    []
  )

  return (
    <section
      id="about-assembly"
      className="asm"
      aria-labelledby="asm-heading"
      ref={sectionRef}
    >
      <div className="asm__intro">
        <h2 id="asm-heading" className="asm__heading js-word-reveal">
          Assembled,
          <br />
          <em>layer by layer.</em>
        </h2>
        <p className="asm__lede fade-up" style={{ '--reveal-delay': '0.12s' }}>
          Every Glaze house begins as a stack of separate decisions — slab,
          core, glazing, shading, roof. Scroll to watch them find each other.
        </p>
      </div>

      <div className="asm__run" ref={runRef}>
        <div className="asm__stage" ref={stageRef}>
          {/* The model is decorative: it restates the copy above, so it
              is hidden from assistive tech rather than described twice. */}
          <div className="asm__scene" aria-hidden="true">
            {/* Mouse orbit writes here, and only here. */}
            <div className="asm__rig" ref={rigRef}>
              {/* Scroll writes here, and only here. */}
              <div className="asm__model" ref={modelRef}>
                {LAYERS.map((layer) => (
                  <div
                    key={layer.id}
                    className={
                      'asm__layer' +
                      (layer.material ? ' asm__layer--' + layer.material : '')
                    }
                    data-name={layer.name}
                    data-depth={parseFloat(layer.geo.depth) || 0}
                    data-from-x={layer.from.x ?? 0}
                    data-from-y={layer.from.y ?? 0}
                    data-from-z={layer.from.z ?? -400}
                    data-from-rx={layer.from.rx ?? 0}
                    data-from-ry={layer.from.ry ?? 0}
                    data-from-rz={layer.from.rz ?? 0}
                    style={{
                      '--l': layer.geo.l,
                      '--t': layer.geo.t,
                      '--w': layer.geo.w,
                      '--h': layer.geo.h,
                      '--depth': layer.geo.depth,
                    }}
                  >
                    {/* Placeholder swap point — see the header comment.
                        Rendered only when a layer declares a `src`. */}
                    {layer.src ? (
                      <img
                        className="asm__layer-img"
                        src={layer.src}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </div>
                ))}

                <div className="asm__ground"></div>
              </div>
            </div>
          </div>

          <div className="asm__hud" aria-hidden="true">
            <span className="asm__hud-count" ref={hudCountRef}>
              01 / {String(LAYERS.length).padStart(2, '0')}
            </span>
            <span className="asm__hud-name" ref={hudNameRef}>
              {LAYERS[0].name}
            </span>
            <span className="asm__hud-hint">Move to orbit</span>
          </div>
        </div>
      </div>
    </section>
  )
}
