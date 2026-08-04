import { Link, useLocation } from 'react-router-dom'
import { resolveHref } from '@/utils/links'
import './contactSection.css'

/**
 * ContactSection — port of about.html lines 4319-4344.
 *
 * A short hand-off: the real phone and email, plus a link into
 * contact.html#enquiry where the full call-back form lives.
 *
 * ⚠ NO CONTROLLER, and no effect of any kind. about.html ships §11 as
 * `<style>` + `<section>` with **no script** — its header comment says so
 * outright ("Self-contained: this <style> and the two blocks below. No
 * script."). Every beat rides machinery the page already mounts:
 *
 *   .fade-up + --reveal-delay  → useAboutFadeReveal   (page-level)
 *   .js-word-reveal            → useAboutWordReveal   (page-level)
 *
 * Both query `document`, exactly as the base script does, so they pick
 * this markup up with no wiring — and the section inherits the
 * reduced-motion guard for free. Hence no refs, no gsap.context, no
 * cleanup. Same shape as §03b Partners (Phase 18).
 *
 * The `id="contact"` is deliberately preserved: in-page anchors may
 * still target it (the original comment says as much).
 *
 * The FOOTER that follows this section in about.html is NOT rendered
 * here — RootLayout has supplied it for every route since Phase 2, in
 * its inner-page variant.
 */
export default function ContactSection() {
  const { pathname } = useLocation()
  const enquiry = resolveHref('contact.html#enquiry', pathname)

  return (
    <section id="contact" className="contact" aria-labelledby="contact-heading">
      <div className="contact__inner">
        <div>
          <h2 className="contact__heading js-word-reveal" id="contact-heading">
            Begin with a<br /><em>conversation.</em>
          </h2>
          <p className="contact__copy fade-up">
            Tell us about the room, the view and the light — we will
            take it from there.
          </p>
        </div>

        <div className="contact__form-slot fade-up" style={{ '--reveal-delay': '0.15s' }}>
          <span className="contact__slot-label">Reach us</span>
          <p className="contact__slot-note">
            Call or write, or leave your details on the contact page and
            we will call you back within a working day.
          </p>
          <div className="contact__direct">
            <a href="tel:+917675023939">+91 76750 23939</a>
            <a href="mailto:info@glazewindowsystems.com">info@glazewindowsystems.com</a>
            <Link to={enquiry.to}>Request a call back</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
