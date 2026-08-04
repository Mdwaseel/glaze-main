/**
 * Canvas sizing + cover-fit painting for scroll-scrubbed frame sequences.
 * Both functions are the bodies of resize() and draw() from the sequence
 * controller in hero.html (lines 4984-5010), unchanged.
 */

/**
 * Match the backing store to the CSS box at up to 2× DPR.
 *
 *   var dpr = Math.min(window.devicePixelRatio || 1, 2);
 *   var nw = Math.round(canvas.clientWidth * dpr);
 *   var nh = Math.round(canvas.clientHeight * dpr);
 *
 * The 2× cap is deliberate: it keeps the 120-frame sequence affordable
 * on high-DPR phones. Assigning width/height also clears the canvas,
 * hence the equality guard.
 */
export function resizeCanvasToDisplaySize(canvas, maxDpr = 2, options = {}) {
  const { skipEmpty = false } = options
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
  const nw = Math.round(canvas.clientWidth * dpr)
  const nh = Math.round(canvas.clientHeight * dpr)
  // The engineering sequence guards with `if (nw && nh && …)` — its plate
  // can measure 0 before layout settles, and zeroing the backing store
  // there would throw away the painted frame. Hero and day/night have no
  // such guard, so it stays opt-in and off by default.
  if (skipEmpty && !(nw && nh)) return
  if (canvas.width !== nw || canvas.height !== nh) {
    canvas.width = nw
    canvas.height = nh
  }
}

/**
 * Paint one frame cover-fitted, with the optional cinematic push-in.
 *
 *   var scale = Math.max(cw / iw, ch / ih);
 *   if (cfg.zoom) scale *= (1 + progress * cfg.zoom);
 *   var dx = (cw - dw) / 2;
 *   var dy = (ch - dh) * (cfg.anchorY != null ? cfg.anchorY : 0.5);
 *
 * The zoom multiplier is applied on top of the cover scale, so the
 * frame never letterboxes as it pushes in.
 */
export function drawCoverFrame(ctx, canvas, image, options = {}) {
  const { zoom = 0, progress = 0, anchorY = 0.5 } = options
  const cw = canvas.width
  const ch = canvas.height
  const iw = image.naturalWidth
  const ih = image.naturalHeight

  let scale = Math.max(cw / iw, ch / ih)
  if (zoom) scale *= 1 + progress * zoom // subtle cinematic push-in

  const dw = iw * scale
  const dh = ih * scale
  const dx = (cw - dw) / 2
  const dy = (ch - dh) * (anchorY != null ? anchorY : 0.5)

  ctx.clearRect(0, 0, cw, ch)
  ctx.drawImage(image, dx, dy, dw, dh)
}

/**
 * Paint one frame CONTAIN-fitted, over a solid ground.
 *
 * The engineering sequence is the one that needs this — the whole
 * assembly must stay in frame at every step, so it fits by the SMALLER
 * ratio and fills the surplus with the section's ground colour rather
 * than clearing it:
 *
 *   var s = Math.min(cw / im.naturalWidth, ch / im.naturalHeight);
 *   ctx.fillStyle = GROUND;
 *   ctx.fillRect(0, 0, cw, ch);
 *   ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
 *
 * The frames are tone-graded to that exact ground colour, which is what
 * lets the render sit on the page with no visible plate — the letterbox
 * must be filled, never transparent.
 */
export function drawContainFrame(ctx, canvas, image, options = {}) {
  const { background } = options
  const cw = canvas.width
  const ch = canvas.height
  const s = Math.min(cw / image.naturalWidth, ch / image.naturalHeight)
  const dw = image.naturalWidth * s
  const dh = image.naturalHeight * s
  ctx.fillStyle = background
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(image, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
}
