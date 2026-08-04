import './visitSection.css'

/**
 * VisitSection — port of contact.html lines 2128-2172.
 *
 * The dark full-width band before the map: eyebrow pill, the recurring
 * Playfair/Bodoni title, one line of copy, and an underline-wipe link
 * that returns to the form with "Showroom visit" already chosen. On the
 * right, two offset vertical images on their own parallax planes.
 *
 * ⚠ NO CONTROLLER of its own. Both of the moving parts belong to code
 * that already exists elsewhere, exactly as in the original, whose header
 * comment says so outright ("the image parallax shares
 * <script id="contact-parallax-script">, and the 'Book a visit'
 * pre-select lives in the form controller"):
 *
 *   .fade-up + --reveal-delay   → useContactFadeReveal        (page-level)
 *   .js-word-reveal             → useContactWordReveal        (page-level)
 *   .wipe-in                    → useContactFadeReveal        (page-level)
 *   [data-cursor-label]         → useContactCursorCompanion   (page-level)
 *   [data-parallax]             → useContactParallax          (page-level)
 *   [data-preselect-type]       → enquiryFormController (§02)
 *
 * `data-parallax="-14"` on the second figure is SIGNED on purpose: the
 * negative range drifts it against the first, which is what makes the
 * pair feel offset. Reproduced as authored.
 *
 * The href stays `#enquiry` — an in-page hash on this route, so Lenis's
 * delegated anchor handler scrolls it smoothly and the form controller's
 * own click handler pre-selects the chip. Not a react-router <Link>: the
 * original is an anchor to a fragment of the page it is already on, and
 * routing it would swallow both behaviours.
 */
export default function VisitSection() {
  return (
    <section className="visit" aria-labelledby="visit-title">
      <div className="visit__inner">

        <div className="visit__text">
          <span className="visit__eyebrow fade-up">Visit Us</span>
          <h2 className="visit__title js-word-reveal" id="visit-title">
            Experience Glaze<br /><em>in person.</em>
          </h2>
          <p className="visit__copy fade-up">
            Step into our Experience Centre — see, feel and hear
            the difference.
          </p>
          <p className="fade-up" style={{ '--reveal-delay': '0.1s' }}>
            <a
              className="visit__link"
              href="#enquiry"
              data-preselect-type="Showroom visit"
              data-cursor-label="Book"
            >Book a visit &rarr;</a>
          </p>
        </div>

        {/* TODO(photography): replace both with real Experience Centre
            shots — same filenames in images/contact/. */}
        <div className="visit__figs">
          <figure className="visit__fig sheen wipe-in" data-parallax="20">
            <img
              src="/images/contact/centre-exterior.webp"
              alt="Experience Centre exterior — modern facade with full-height glazing"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <figure className="visit__fig visit__fig--b sheen wipe-in" data-parallax="-14" style={{ '--reveal-delay': '0.15s' }}>
            <img
              src="/images/contact/showroom-window.jpg"
              alt="Inside the showroom — aluminium window systems on display"
              loading="lazy"
              decoding="async"
            />
          </figure>
        </div>

      </div>
    </section>
  )
}
