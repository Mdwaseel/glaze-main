/**
 * About hero — kinetic manifesto.
 *
 * Verbatim port of <script id="about-hero-script"> in about.html
 * (lines 4942-5016). No GSAP, no ScrollTrigger — the heading assembly is
 * pure CSS transitions driven by per-character `--reveal-delay` values,
 * and the depth layer is a plain rAF lerp.
 */

/**
 * Manual reveal.
 *
 * The shared About reveal system builds this heading's masks but does NOT
 * observe it, because it carries [data-manual-reveal] — the assembly has
 * to wait for the preloader curtain instead of racing it. This re-times
 * the characters the base system already created: a 0.15s lead-in and a
 * 0.028s step, slower than the shared 0.02s default because it is the
 * page's opening statement.
 *
 * `window.__glazeHeroReady` is checked first and the event second, which
 * is what makes this order-independent: the Loader announces during its
 * layout effect, potentially before this listener is attached, and the
 * flag covers exactly that case.
 *
 * @returns {() => void} cleanup
 */
export function initAboutHeroReveal(title) {
  if (!title) return () => {}

  function reveal() {
    // Slow the assembly down a touch from the shared default —
    // this is the page's opening statement. (Delays are now
    // per-character, so the step is much smaller than the old
    // per-word one.)
    const chars = title.querySelectorAll('.reveal-word')
    chars.forEach(function (c, i) {
      c.style.setProperty('--reveal-delay', (0.15 + i * 0.028).toFixed(3) + 's')
    })
    title.classList.add('is-revealed')
  }

  if (window.__glazeHeroReady) {
    reveal()
    return () => {
      title.classList.remove('is-revealed')
    }
  }

  document.addEventListener('glaze:reveal-hero', reveal, { once: true })
  return () => {
    document.removeEventListener('glaze:reveal-hero', reveal)
    title.classList.remove('is-revealed')
  }
}

/**
 * Depth layer: mouse parallax + light glint.
 *
 * One lerped value (--ahero-mx, −1…1) drives a gentle counter-drift on
 * the dust. The glint follows the cursor over the manifesto band. Fine
 * pointers only; reduced-motion skips all of it, and with no JS the vars
 * stay 0.
 *
 * The rAF loop is self-parking — it stops once |target − current| < 0.001
 * and restarts on the next mousemove, exactly as the original.
 *
 * @returns {() => void} cleanup
 */
export function initAboutHeroDepth(hero, dust, glint) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const finePointer = window.matchMedia('(pointer: fine)').matches
  if (reduceMotion || !finePointer || !hero) return () => {}

  let targetX = 0 // where the cursor says we should be (−1…1)
  let currentX = 0 // where we actually are — eased toward target
  let raf = null

  function tick() {
    currentX += (targetX - currentX) * 0.06
    if (Math.abs(targetX - currentX) < 0.001) {
      currentX = targetX
      raf = null
    } else {
      raf = requestAnimationFrame(tick)
    }
    const v = currentX.toFixed(4)
    if (dust) dust.style.setProperty('--ahero-mx', v)
  }

  function onMouseMove(e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2
    if (!raf) raf = requestAnimationFrame(tick)

    if (glint) {
      const r = hero.getBoundingClientRect()
      glint.style.setProperty('--ahero-gx', (((e.clientX - r.left) / r.width) * 100).toFixed(2) + '%')
      glint.style.setProperty('--ahero-gy', (((e.clientY - r.top) / r.height) * 100).toFixed(2) + '%')
      glint.classList.add('is-on')
    }
  }

  function onMouseLeave() {
    targetX = 0
    if (!raf) raf = requestAnimationFrame(tick)
    if (glint) glint.classList.remove('is-on')
  }

  hero.addEventListener('mousemove', onMouseMove, { passive: true })
  hero.addEventListener('mouseleave', onMouseLeave)

  return () => {
    hero.removeEventListener('mousemove', onMouseMove)
    hero.removeEventListener('mouseleave', onMouseLeave)
    if (raf) cancelAnimationFrame(raf)
    if (dust) dust.style.removeProperty('--ahero-mx')
    if (glint) {
      glint.classList.remove('is-on')
      glint.style.removeProperty('--ahero-gx')
      glint.style.removeProperty('--ahero-gy')
    }
  }
}
