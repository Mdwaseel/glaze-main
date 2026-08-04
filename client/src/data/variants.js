/**
 * THE VARIANT CATALOGUE — the cinematic clip reel on each system page.
 *
 * A "series" (data/systems.js) is a PROFILE: an extrusion depth with its
 * own tested numbers. A "variant" is a CONFIGURATION of that system —
 * how many leaves, which way they open, where the track runs. The two
 * are orthogonal, which is why they are separate tables and separate
 * sections: §04 Variants asks "what shape is the opening", §05 Series
 * asks "which profile carries it".
 *
 * ⚠ THE CLIPS ARE NOT THE FILES THE CLIENT DROPPED IN. The raw drops sit
 * in `assets-source/videos/product videos/<Category>/<Name>.mp4` at 1928×1076
 * and ~9 Mbps — roughly six times the bitrate a full-bleed background
 * loop needs, behind filenames with spaces, double full stops and one
 * typo ("ouble Casement Window..mp4"). They are re-encoded once, at
 * build-prep time, into
 *
 *     public/videos/variants/<system-slug>/<variant-id>.mp4     (1600w, CRF 26)
 *     public/products/variants/<system-slug>/<variant-id>.webp  (first frame)
 *
 * so the runtime never has to URL-encode a path and a page of eleven
 * variants is not forty megabytes. The originals are left in place
 * untouched. See docs note in the section component for the ffmpeg
 * recipe.
 *
 * ⚠ THE FOLDERS DO NOT MAP ONE-TO-ONE ONTO THE SYSTEM PAGES, and the
 * two places they disagree are authored decisions, not guesses:
 *
 *   "Awning Windows"  → casement.  An awning light is a top-hung
 *                       outward-opening casement; it runs on the same
 *                       60 and 130 series and there is no Awning page
 *                       to give it. It sits at the END of Casement's
 *                       list so the plain casements read first.
 *   "Sliding windows" → sliding, ahead of "Sliding Systems" (the doors),
 *                       so the list runs window → door.
 *
 * Two clips were dropped loose in `product videos/` with generator
 * filenames rather than into a category folder. They were identified
 * from their footage and filed here: `hf_20260801_140241…` is a white
 * tilt & turn sash in a living room, `hf_20260802_123944…` is a
 * six-leaf bi-fold onto a terrace.
 *
 * ⚠ LIFT & SLIDE HAS NO CLIPS YET, so its page renders no Variants
 * section at all rather than borrowing Sliding's footage. Dropping a
 * `Lift and Slide/` folder into `product videos/`, re-running the
 * encode and adding a block below is all it takes.
 *
 * EVERY NUMBER BELOW IS FROM data/systems.js. Where a variant has no
 * tested figure of its own — every Pivot format, because pivot.html
 * ships no leaf-weight — the specification rows carry architectural
 * metadata (axis, seal, format) instead of an invented kilogram.
 */

/** Where the re-encoded clip and its first frame live. */
const clip = (slug, id) => `/videos/variants/${slug}/${id}.mp4`
const still = (slug, id) => `/products/variants/${slug}/${id}.webp`

/* ═══════════════════════════════════════════════════════════════
   Per-system variant lists, in the order they are scrolled.

   name   the variant, as a specifier would name it
   kind   the eyebrow's second half — "Sliding · Door"
   lede   ONE short sentence, ~55-65 characters. The panel is glass over
          a moving picture, and the picture is what is being sold — every
          line of prose in front of it is a line of the product hidden.
          Anything that does not change a specification decision belongs
          on the page, not in the panel.
   specs  exactly four rows, label over value. Architectural, not prose.
   ═══════════════════════════════════════════════════════════════ */
const CATALOGUE = {
  /* ── Sliding — the two window formats, then the four doors ── */
  sliding: [
    {
      id: 'two-track-two-panel',
      name: '2 Track · 2 Panel',
      kind: 'Window',
      lede: 'One panel parks behind the other — the smallest sliding format.',
      specs: [
        { k: 'Tracks', v: '2' },
        { k: 'Panels', v: '2' },
        { k: 'Max sash', v: '120 kg' },
        { k: 'Series', v: '105 SD' },
      ],
    },
    {
      id: 'two-track-four-panel',
      name: '2 Track · 4 Panel',
      kind: 'Window',
      lede: 'Four leaves on two rails, clearing from the middle outward.',
      specs: [
        { k: 'Tracks', v: '2' },
        { k: 'Panels', v: '4' },
        { k: 'Max sash', v: '180 kg' },
        { k: 'Series', v: '135 SD' },
      ],
    },
    {
      id: 'two-track-door',
      name: '2 Track Sliding Door',
      kind: 'Door',
      lede: 'Full-height glass on twin rollers; half the elevation moves.',
      specs: [
        { k: 'Tracks', v: '2' },
        { k: 'Max sash', v: '180 kg' },
        { k: 'Max height', v: '4.0 m' },
        { k: 'Series', v: '135 SD' },
      ],
    },
    {
      id: 'three-track-door',
      name: '3 Track Sliding Door',
      kind: 'Door',
      lede: 'A third rail stacks all three leaves at one jamb — two thirds open.',
      specs: [
        { k: 'Tracks', v: '3' },
        { k: 'Max sash', v: '120 kg' },
        { k: 'Clear opening', v: '2/3' },
        { k: 'Series', v: '155 SD' },
      ],
    },
    {
      id: 'slim-door',
      name: 'Slim Sliding Door',
      kind: 'Door',
      lede: 'The interlock drawn down to a line. Six metres of sash.',
      specs: [
        { k: 'Max sash', v: '300 kg' },
        { k: 'Max height', v: '6.0 m' },
        { k: 'Sightline', v: 'Minimal' },
        { k: 'Series', v: '201 SD' },
      ],
    },
    {
      id: 'door-with-mesh',
      name: 'Sliding Door with Mesh',
      kind: 'Door & Screen',
      lede: 'An insect screen on its own track, in the same frame.',
      specs: [
        { k: 'Screen', v: 'Integrated' },
        { k: 'Tracks', v: '2 + 1' },
        { k: 'Max sash', v: '300 kg' },
        { k: 'Series', v: '201 SD + SN' },
      ],
    },
  ],

  /* ── Casement — the seven casements, then the four awnings ── */
  casement: [
    {
      id: 'single',
      name: 'Single Casement',
      kind: 'Window',
      lede: 'One sash on concealed hinges, swinging clear of the frame.',
      specs: [
        { k: 'Leaves', v: '1' },
        { k: 'Opening', v: 'Outward' },
        { k: 'Max leaf', v: '80 kg' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'double',
      name: 'Double Casement',
      kind: 'Window',
      lede: 'Two sashes meeting at a centre mullion, on one gasket line.',
      specs: [
        { k: 'Leaves', v: '2' },
        { k: 'Opening', v: 'Outward' },
        { k: 'Max leaf', v: '80 kg' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'french',
      name: 'French Casement',
      kind: 'Window',
      lede: 'No centre post at all; both leaves swing clear of the view.',
      specs: [
        { k: 'Leaves', v: '2' },
        { k: 'Meeting', v: 'Post-free' },
        { k: 'Max height', v: '2.8 m' },
        { k: 'Series', v: '150' },
      ],
    },
    {
      id: 'side-hung',
      name: 'Side Hung Casement',
      kind: 'Window',
      lede: 'Hinged on the jamb, opening across the reveal — the classic.',
      specs: [
        { k: 'Hinge', v: 'Side' },
        { k: 'Opening', v: 'Outward' },
        { k: 'Max leaf', v: '80 kg' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'top-hung',
      name: 'Top Hung Casement',
      kind: 'Window',
      lede: 'Hinged at the head, so the sash becomes its own canopy.',
      specs: [
        { k: 'Hinge', v: 'Top' },
        { k: 'Opening', v: 'Outward' },
        { k: 'Weather', v: 'Open in rain' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'bottom-hung',
      name: 'Bottom Hung Casement',
      kind: 'Window',
      lede: 'Hinged at the sill and tilting inward for background air.',
      specs: [
        { k: 'Hinge', v: 'Bottom' },
        { k: 'Opening', v: 'Inward tilt' },
        { k: 'Use', v: 'Secure vent' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'fixed-combination',
      name: 'Fixed + Casement',
      kind: 'Window',
      lede: 'A fixed light takes the span that never needs to open.',
      specs: [
        { k: 'Lights', v: 'Fixed + opening' },
        { k: 'Sightline', v: 'Continuous' },
        { k: 'Max height', v: '2.8 m' },
        { k: 'Series', v: '130' },
      ],
    },
    {
      id: 'awning-single',
      name: 'Single Awning',
      kind: 'Awning',
      lede: 'A top-hung light set high — privacy at eye level, air above.',
      specs: [
        { k: 'Hinge', v: 'Top' },
        { k: 'Opening', v: 'Outward' },
        { k: 'Weather', v: 'Open in rain' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'awning-double',
      name: 'Double Awning',
      kind: 'Awning',
      lede: 'Two awning lights stacked, ventilating the full height.',
      specs: [
        { k: 'Leaves', v: '2' },
        { k: 'Hinge', v: 'Top' },
        { k: 'Stack', v: 'Vertical' },
        { k: 'Series', v: '60H' },
      ],
    },
    {
      id: 'awning-fixed',
      name: 'Fixed + Awning',
      kind: 'Awning',
      lede: 'The pane holds the view; a slim awning above holds the air.',
      specs: [
        { k: 'Lights', v: 'Fixed + awning' },
        { k: 'Sightline', v: 'Continuous' },
        { k: 'Max height', v: '2.8 m' },
        { k: 'Series', v: '130' },
      ],
    },
    {
      id: 'awning-mesh',
      name: 'Awning with Mesh',
      kind: 'Awning & Screen',
      lede: 'The screen sits inside the frame rather than over it.',
      specs: [
        { k: 'Screen', v: 'Integrated' },
        { k: 'Hinge', v: 'Top' },
        { k: 'Mesh', v: 'Fibreglass' },
        { k: 'Series', v: '60H' },
      ],
    },
  ],

  /* ── Pivot — three window formats, four doors.
     No kilogram rows: pivot.html ships no leaf-weight figure, so these
     carry geometry instead of an invented number. ── */
  pivot: [
    {
      id: 'centre-window',
      name: 'Centre Pivot Window',
      kind: 'Window',
      lede: 'The pane turns about its middle, balanced at any angle.',
      specs: [
        { k: 'Axis', v: 'Horizontal centre' },
        { k: 'Rotation', v: '180°' },
        { k: 'Balance', v: 'Any angle' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
    {
      id: 'vertical-window',
      name: 'Vertical Pivot Window',
      kind: 'Window',
      lede: 'A vertical axis turns the pane edge-on to the room.',
      specs: [
        { k: 'Axis', v: 'Vertical' },
        { k: 'Rotation', v: '180°' },
        { k: 'Format', v: 'Oversized' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
    {
      id: 'corner-window',
      name: 'Corner Pivot Window',
      kind: 'Window',
      lede: 'Two panes meeting at a post-free corner, both turning away.',
      specs: [
        { k: 'Corner', v: 'Post-free' },
        { k: 'Axis', v: 'Vertical' },
        { k: 'Glazing', v: 'Glass-to-glass' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
    {
      id: 'single-door',
      name: 'Single Pivot Door',
      kind: 'Door',
      lede: 'The load sits on the axis, so an oversized leaf stays square.',
      specs: [
        { k: 'Axis', v: 'Offset' },
        { k: 'Leaves', v: '1' },
        { k: 'Format', v: 'Oversized' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
    {
      id: 'double-door',
      name: 'Double Pivot Door',
      kind: 'Door',
      lede: 'Two pivoting leaves, with nothing standing between them.',
      specs: [
        { k: 'Axis', v: 'Offset' },
        { k: 'Leaves', v: '2' },
        { k: 'Meeting', v: 'Post-free' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
    {
      id: 'glass-door',
      name: 'Glass Pivot Door',
      kind: 'Door',
      lede: 'The frame withdraws to the structural minimum. Glass, turning.',
      specs: [
        { k: 'Frame', v: 'Minimal' },
        { k: 'Glazing', v: 'Structural' },
        { k: 'Axis', v: 'Offset' },
        { k: 'Sightline', v: 'Minimum' },
      ],
    },
    {
      id: 'oversized-door',
      name: 'Oversized Pivot Door',
      kind: 'Door',
      lede: 'Far beyond what a hinge would carry, and still one-handed.',
      specs: [
        { k: 'Format', v: 'Oversized' },
        { k: 'Axis', v: 'Balanced' },
        { k: 'Operation', v: 'One hand' },
        { k: 'Seal', v: 'Full perimeter' },
      ],
    },
  ],

  /* ── Fixed — no moving parts, so the rows describe the joint ── */
  fixed: [
    {
      id: 'single',
      name: 'Single Fixed Light',
      kind: 'Window',
      lede: 'The thinnest frame we can draw around a pane. Nothing opens.',
      specs: [
        { k: 'Moving parts', v: 'None' },
        { k: 'Sightline', v: 'Minimum' },
        { k: 'Seal', v: 'Bonded' },
        { k: 'Water tight', v: '600 Pa' },
      ],
    },
    {
      id: 'corner',
      name: 'Corner Fixed',
      kind: 'Window',
      lede: 'Two lights mitred so the view carries around the building.',
      specs: [
        { k: 'Corner', v: 'Mitred' },
        { k: 'Post', v: 'None' },
        { k: 'Sightline', v: 'Minimum' },
        { k: 'Seal', v: 'Bonded' },
      ],
    },
    {
      id: 'glass-to-glass',
      name: 'Glass-to-Glass Corner',
      kind: 'Window',
      lede: 'No aluminium at the corner: two panes meeting in air.',
      specs: [
        { k: 'Joint', v: 'Glass-to-glass' },
        { k: 'Post', v: 'None' },
        { k: 'Bond', v: 'Structural' },
        { k: 'Sound', v: '44 Rw dB' },
      ],
    },
    {
      id: 'structural-glazing',
      name: 'Structural Glazing',
      kind: 'Façade',
      lede: 'The frame moves behind the glass line; one uninterrupted plane.',
      specs: [
        { k: 'Fixing', v: 'Structural' },
        { k: 'Frame', v: 'Concealed' },
        { k: 'Span', v: 'Floor to ceiling' },
        { k: 'Water tight', v: '600 Pa' },
      ],
    },
  ],

  /* ── Tilt & Turn — the two clips the client dropped loose ── */
  'tilt-and-turn': [
    {
      id: 'tilt-turn-dark',
      name: 'Fixed + Tilt & Turn',
      kind: 'Window',
      lede: 'A picture pane beside an opening sash, on one continuous sightline.',
      specs: [
        { k: 'Positions', v: '2' },
        { k: 'Lights', v: 'Fixed + opening' },
        { k: 'Hardware', v: 'Multi-point' },
        { k: 'Series', v: '130' },
      ],
    },
    {
      id: 'tilt-turn-light',
      name: 'Single Tilt & Turn',
      kind: 'Window',
      lede: 'One handle, two windows: a quarter turn tilts, a half turn swings.',
      specs: [
        { k: 'Positions', v: '2' },
        { k: 'Opening', v: 'Inward' },
        { k: 'Max leaf', v: '80 kg' },
        { k: 'Series', v: '60H' },
      ],
    },
  ],

  /* ── Bi-Fold — one clip so far; the section renders as a single
     cinematic panel until more arrive ── */
  'bi-fold': [
    {
      id: 'six-panel',
      name: 'Six-Leaf Bi-Fold',
      kind: 'Door',
      lede: 'Six leaves gather into a stack about one panel wide.',
      specs: [
        { k: 'Leaves', v: '6' },
        { k: 'Stack', v: 'One side' },
        { k: 'Per leaf', v: '45 kg' },
        { k: 'System', v: '150 kg' },
      ],
    },
  ],
}

/**
 * A system's variants with their media resolved, or an empty array for
 * the systems that have no footage yet (Lift & Slide). The section
 * component renders nothing on an empty list rather than an empty shell.
 */
export function variantsFor(slug) {
  const list = CATALOGUE[slug]
  if (!list) return []
  return list.map((v, i) => ({
    ...v,
    index: i,
    /* 01, 02, … — the numbered rail, and the panel's own counter. */
    num: String(i + 1).padStart(2, '0'),
    video: clip(slug, v.id),
    poster: still(slug, v.id),
  }))
}

/** Does this system have a Variants section at all? */
export function hasVariants(slug) {
  return (CATALOGUE[slug] || []).length > 0
}

export default CATALOGUE
