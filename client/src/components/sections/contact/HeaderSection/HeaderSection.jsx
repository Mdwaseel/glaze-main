import './headerSection.css'

/**
 * HeaderSection — port of contact.html lines 724-738.
 *
 * The editorial opening on paper: a mono eyebrow pill, a huge
 * left-aligned Playfair headline with a Bodoni-italic second line, and a
 * short helper line seated top-right against the headline's baseline.
 *
 * ⚠ NO CONTROLLER, and no effect of any kind. contact.html ships §01 as
 * `<style>` + `<section>` with no script — its header comment says so
 * outright ("No script of its own — the heading and copy ride the shared
 * reveal primitives from the base script at the bottom of <body>"), and
 * none of the page's three scripts mentions `chead`. Every beat rides
 * machinery the page already mounts:
 *
 *   .fade-up + --reveal-delay  → useContactFadeReveal   (page-level)
 *   .js-word-reveal            → useContactWordReveal   (page-level)
 *
 * Both query `document`, exactly as the base script does, so they pick
 * this markup up with no wiring — and the section inherits the
 * reduced-motion guard for free. Hence no refs, no gsap.context, no
 * cleanup. Same shape as §03b Partners (Phase 18) and §11 Contact
 * (Phase 25) on the About page.
 *
 * The section carries no id of its own — `aria-labelledby` points at the
 * `<h1>`, which is where the id lives. Reproduced exactly.
 */
export default function HeaderSection() {
  return (
    <section className="chead" aria-labelledby="chead-title">
      <div className="chead__inner">
        <span className="chead__eyebrow fade-up">Plan Your Project</span>
        <div className="chead__row">
          <h1 className="chead__title js-word-reveal" id="chead-title">
            Discuss Your<br /><em>Project.</em>
          </h1>
          {/* TODO(copy): confirm the response-time promise with the team */}
          <p className="chead__aside fade-up" style={{ '--reveal-delay': '0.15s' }}>
            Tell us about your space and the light you want to keep.
            We respond within one working day.
          </p>
        </div>
      </div>
    </section>
  )
}
