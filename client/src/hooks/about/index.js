/**
 * About-only page infrastructure.
 *
 * These are ports of <script id="about-base-script"> and deliberately do
 * NOT reuse the Home hooks of similar name: About's reveal is per
 * CHARACTER (Home's is per word), its count-up formats with
 * toLocaleString('en-IN') and zeroes first (Home uses toFixed with
 * data-decimals), and its fade observer also drives `.wipe-in` behind the
 * `html.motion-ok` gate. Sharing them would change the animation, so per
 * the migration rules they stay separate.
 *
 * Genuinely shared systems (Lenis, the load-time ScrollTrigger refresh,
 * reduced-motion detection, GSAP registration) are imported from the
 * top-level hooks/utils and are NOT duplicated here.
 */
export { useAboutWordReveal } from './useAboutWordReveal'
export { useAboutCountUp } from './useAboutCountUp'
export { useAboutFadeReveal } from './useAboutFadeReveal'
export { useMagneticButtons } from './useMagneticButtons'
export { useCursorCompanion } from './useCursorCompanion'
