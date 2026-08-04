import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Single registration point for GSAP plugins.
 *
 * The static pages called gsap.registerPlugin(ScrollTrigger) inside every
 * section script. Registering is idempotent, but importing from here keeps
 * it to one place and guarantees the plugin is registered before any
 * section module runs its timeline.
 *
 * Pinned to gsap 3.12.5 — the exact build the original pages loaded from
 * the CDN — so pinning, scrub and refresh behaviour stay identical.
 */
gsap.registerPlugin(ScrollTrigger)

// Parity-testing escape hatch. The static pages load GSAP from a CDN, so
// window.gsap / window.ScrollTrigger exist there and timelines can be
// inspected from outside. Here GSAP is a module, which is correct — this
// branch only opens it up for the vite.preview.config.js build used to
// diff animation configuration against hero.html. VITE_EXPOSE_GSAP is
// undefined in the real build, so the whole block is dropped.
if (import.meta.env.VITE_EXPOSE_GSAP) {
  window.gsap = gsap
  window.ScrollTrigger = ScrollTrigger
}

export { gsap, ScrollTrigger }
