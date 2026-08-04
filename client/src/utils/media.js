/**
 * React's `muted` on <video> is a PROPERTY-only prop: it sets
 * `element.muted` but never writes the `muted` content attribute, so the
 * DOM ends up with `defaultMuted === false` where the static pages —
 * which spell `<video ... muted ...>` in the markup — have it `true`.
 *
 * That is not cosmetic. `defaultMuted` reflects the content attribute and
 * is what the element resets `muted` to whenever the media is reloaded
 * (`load()`, a `src` change, a resource-selection restart). With it false,
 * a reset unmutes the clip — and autoplay of an unmuted video is blocked,
 * so the loop stops instead of restarting silently.
 *
 * Assigning `defaultMuted` reflects back to the attribute, which restores
 * both the attribute parity and the reset behaviour. Used as a ref
 * callback on every <video> that the originals mark `muted`.
 *
 * hero.html: 5 × .sysm__card-media, 5 × .lab__frame video.
 */
export function keepMuted(el) {
  if (el) el.defaultMuted = true
}
