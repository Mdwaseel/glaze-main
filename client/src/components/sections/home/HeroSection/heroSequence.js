import { clamp } from '@/utils/scroll'

/**
 * Hero image-sequence configuration and its progress handler.
 *
 * Every number below is copied from the hero ImageSequence config in
 * hero.html (lines 5037-5064). Changing any of them changes the motion:
 *
 *   count   120    frames/hero/hero_000.webp … hero_119.webp
 *   pinVh   2.2    wrapper height = (1 + 2.2) × 100vh = 320vh
 *   zoom    0.12   cover scale × (1 + progress × 0.12) — 12% push-in
 *   anchorY 0.5    centred vertical crop
 */
export const HERO_SEQUENCE = {
  dir: '/frames/hero',
  prefix: 'hero',
  count: 120,
  pad: 3,
  pinVh: 2.2,
  zoom: 0.12,
  anchorY: 0.5,
  // Reduced motion → static, representative frame + copy stays visible.
  reducedMotionFrame: 0,
}

/**
 * The portrait set, painted instead of the one above on phones.
 *
 * WHY IT EXISTS. The frames above are 1600×893 — 16:9, cut for a desktop
 * viewport. `drawCoverFrame` covers, so on a 390×844 phone that landscape
 * frame is scaled until it fills 844px of height and then cropped to a
 * 390px-wide slice of the middle. Roughly two thirds of every frame is
 * thrown away and the building is left as an unreadable detail. These are
 * cut from footage shot for the format instead: 720×1280, exactly 9:16,
 * so cover is very nearly a straight fit and nothing is lost.
 *
 * ONLY `dir` DIFFERS. Same prefix, count, padding, pin travel, push-in and
 * anchor — the motion is identical, only the pixels change. useScrollSequence
 * lists `dir` in its effect deps, so crossing the breakpoint tears the
 * sequence down and rebuilds it against the other folder; nothing else in
 * the section has to know.
 *
 * Source: public/videos/mobile-hero-section-video.mp4, 1080×1916 @ 24fps.
 * See MOBILE_SEQUENCE_QUERY below for the recipe that produced the files.
 */
export const HERO_SEQUENCE_MOBILE = {
  ...HERO_SEQUENCE,
  dir: '/frames/hero-mobile',
}

/**
 * When the portrait sets are used.
 *
 * 768px is the site's own mobile breakpoint (heroSection.css and
 * systemsSection.css both step down there). The orientation clause matters:
 * a phone turned sideways is a 844×390 viewport, which is MORE landscape
 * than the desktop frames themselves — feeding it 9:16 frames would crop
 * far worse than the problem this set was cut to solve.
 *
 * The frames were produced with:
 *
 *   ffmpeg -i public/videos/mobile-hero-section-video.mp4 \
 *     -vf "crop=1078:1916,scale=720:1280:flags=lanczos" \
 *     -fps_mode passthrough -c:v libwebp -quality 75 -compression_level 6 \
 *     -f image2 out/f_%04d.webp
 *
 * then subsampled from the source's 193 frames to 120 (evenly spaced,
 * both endpoints kept) so the count matches the desktop set and the pin
 * maths is unchanged. `-f image2` is load-bearing — without it ffmpeg
 * writes one ANIMATED webp instead of a numbered sequence.
 */
export const MOBILE_SEQUENCE_QUERY = '(max-width: 768px) and (orientation: portrait)'

/** Text is fully gone at 32% of the pin. */
export const HERO_FADE_END = 0.32

/** Content lifts this many px over the full pin. */
export const HERO_LIFT_PX = 40

/**
 * Hero text + buttons fade and lift away as the frames scrub.
 *
 * Verbatim port of the hero's onProgress callback. The p <= 0.001 branch
 * matters: at rest it clears the inline styles so the CSS entrance
 * animations (fade-in / reveal-up on the eyebrow, title, subtitle and
 * buttons) own the element again instead of being pinned at opacity 1.
 */
export function createHeroProgressHandler(contentRef, cueRef) {
  return function onHeroProgress(p) {
    const content = contentRef.current
    const cue = cueRef.current

    // At rest (p≈0) hand control back to the CSS entrance animation.
    if (p <= 0.001) {
      if (content) {
        content.style.opacity = ''
        content.style.transform = ''
        content.style.pointerEvents = ''
      }
      if (cue) cue.style.opacity = ''
      return
    }

    const o = 1 - clamp(p / HERO_FADE_END, 0, 1)
    if (content) {
      content.style.opacity = o
      content.style.transform = 'translateY(' + -p * HERO_LIFT_PX + 'px)'
      content.style.pointerEvents = o < 0.05 ? 'none' : ''
    }
    if (cue) cue.style.opacity = o
  }
}
