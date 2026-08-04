import './trustSection.css'

/**
 * TrustSection — port of contact.html lines 1908-1987.
 *
 * The four ways to reach Glaze, in one white band between the form and
 * the dark Visit banner: Call & WhatsApp, Working Hours, Write to Us,
 * Follow Us. Each column is a line-drawn glyph inside a 1px champagne
 * ring, a Playfair heading and its lines.
 *
 * ⚠ NO CONTROLLER, and no effect of any kind. contact.html ships §03 as
 * `<style>` + `<section>` with no script, and none of the page's three
 * scripts mentions `trust` or `ticon`. Every beat rides machinery the
 * page already mounts:
 *
 *   .fade-up + --reveal-delay  → useContactFadeReveal   (page-level)
 *   [data-cursor-label]        → useContactCursorCompanion (page-level)
 *
 * The ring draw is pure CSS keyed off the same `is-revealed` class the
 * fade sets (`.motion-ok .fade-up.is-revealed .ticon__ring`), so the
 * columns and their rings arrive together, 0.12s apart down the row.
 * Same shape as §01 Header.
 *
 * The section carries no id and no heading — `aria-label` names it, which
 * is what the original does; the four `<h2>`s are the column headings.
 */
export default function TrustSection() {
  return (
    <section className="trust" aria-label="Ways to reach us">
      <div className="trust__inner">

        <div className="trust__item fade-up">
          <svg className="ticon" viewBox="0 0 72 72" aria-hidden="true">
            <circle className="ticon__ring" cx="36" cy="36" r="35" />
            <g className="ticon__glyph" transform="translate(24 24)">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </g>
          </svg>
          <h2 className="trust__heading">Call &amp; WhatsApp</h2>
          <p className="trust__lines">
            <a href="tel:+917675023939" data-cursor-label="Call">+91 76750 23939</a><br />
            {/* TODO(copy): add the second line / landline if there is one */}
            <a href="https://wa.me/917675023939" target="_blank" rel="noopener" data-cursor-label="WhatsApp">WhatsApp us</a>
          </p>
        </div>

        <div className="trust__item fade-up" style={{ '--reveal-delay': '0.12s' }}>
          <svg className="ticon" viewBox="0 0 72 72" aria-hidden="true">
            <circle className="ticon__ring" cx="36" cy="36" r="35" />
            <g className="ticon__glyph" transform="translate(24 24)">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </g>
          </svg>
          <h2 className="trust__heading">Working Hours</h2>
          {/* TODO(copy): confirm hours with the showroom team */}
          <p className="trust__lines">
            Mon–Sat: 9am–7pm<br />
            Sunday: Closed
          </p>
        </div>

        <div className="trust__item fade-up" style={{ '--reveal-delay': '0.24s' }}>
          <svg className="ticon" viewBox="0 0 72 72" aria-hidden="true">
            <circle className="ticon__ring" cx="36" cy="36" r="35" />
            <g className="ticon__glyph" transform="translate(24 24)">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </g>
          </svg>
          <h2 className="trust__heading">Write to Us</h2>
          <p className="trust__lines">
            <a href="mailto:info@glazewindowsystems.com" data-cursor-label="Write">info@glazewindowsystems.com</a><br />
            {/* TODO(copy): add a second address (sales/projects) if one exists */}
            We reply within one working day.
          </p>
        </div>

        <div className="trust__item fade-up" style={{ '--reveal-delay': '0.36s' }}>
          <svg className="ticon" viewBox="0 0 72 72" aria-hidden="true">
            <circle className="ticon__ring" cx="36" cy="36" r="35" />
            <g className="ticon__glyph" transform="translate(24 24)">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" />
            </g>
          </svg>
          <h2 className="trust__heading">Follow Us</h2>
          <p className="trust__lines">See our latest installations and site stories.</p>
          <div className="trust__social">
            <a href="https://www.instagram.com/glaze_window_systems/" target="_blank" rel="noopener" aria-label="Glaze on Instagram" data-cursor-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.07 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.12-1.38.66-.66 1.07-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.12C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0z" /><path d="M12 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" /><circle cx="18.41" cy="5.59" r="1.44" /></svg>
            </a>
            <a href="https://www.facebook.com/Glazewindowsystems" target="_blank" rel="noopener" aria-label="Glaze on Facebook" data-cursor-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" /></svg>
            </a>
            <a href="https://in.linkedin.com/company/glaze-window-systems" target="_blank" rel="noopener" aria-label="Glaze on LinkedIn" data-cursor-label="LinkedIn">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" /></svg>
            </a>
            <a href="https://www.youtube.com/@GlazeWindowSystems" target="_blank" rel="noopener" aria-label="Glaze on YouTube" data-cursor-label="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" /></svg>
            </a>
          </div>
        </div>

      </div>
    </section>
  )
}
