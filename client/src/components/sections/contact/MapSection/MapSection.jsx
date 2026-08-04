import './mapSection.css'

/**
 * MapSection — port of contact.html lines 2227-2242.
 *
 * The studio pinned on a Google map, in a full-width band between the
 * dark Visit banner and the footer. The embed needs no API key and works
 * without JS; the CSS filter pulls it into the dark house palette.
 *
 * ⚠ NO CONTROLLER, and no effect of any kind. contact.html ships §05 as
 * `<style>` + `<section>` with no script — its header comment says so
 * outright ("No script.") — and none of the page's three scripts mentions
 * `cmap`. The one moving part is the reveal:
 *
 *   .wipe-in  → useContactFadeReveal   (page-level)
 *
 * ⚠ The wipe mask sits on `.cmap__frame`, NEVER on the iframe itself —
 * the house convention the original calls out by name. Clipping a
 * cross-origin iframe directly is what makes the embed repaint mid-load.
 *
 * `loading="lazy"` is authored, not an optimisation added here: the embed
 * costs nothing until the visitor scrolls near it.
 *
 * The section carries no id and no heading — `aria-label` names it, which
 * is what the original does.
 */
export default function MapSection() {
  return (
    <section className="cmap" aria-label="Where to find us">
      <div className="cmap__frame wipe-in">
        <iframe
          src="https://maps.google.com/maps?q=Glaze%20Windows%20System%2C%20Road%20No.%205%2C%20Jubilee%20Hills%2C%20Hyderabad%2C%20Telangana%20500033&z=16&output=embed"
          title="Map — Glaze Windows System, Jubilee Hills, Hyderabad"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        ></iframe>
      </div>
      <a
        className="cmap__open sheen"
        href="https://www.google.com/maps/search/?api=1&query=Glaze%20Windows%20System%2C%204th%20Floor%2C%20Road%20No.%205%2C%20Jubilee%20Hills%20Metro%20Station%2C%20Jubilee%20Hills%2C%20Hyderabad%2C%20Telangana%20500033"
        target="_blank" rel="noopener" data-cursor-label="Visit"
      >Open in Google Maps</a>
    </section>
  )
}
