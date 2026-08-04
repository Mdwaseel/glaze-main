import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import { useReducedMotion, useScrollTriggerRefresh } from '@/hooks'
import { useCatalogue } from '@/context/CatalogueContext'
import { buildSystemsCarousel, initSystemsStatic } from './systemsSequence'
import { keepMuted } from '@/utils/media'
import { productPath } from '@/constants/routes'
import { countWord } from '@/utils/format'
import './systemsSection.css'

/**
 * SystemsSection — port of hero.html lines 2137-2329.
 *
 * ⚠ SEVEN CARDS, NOT THE ORIGINAL SIX. Tilt & Turn was added after the
 * port. Nothing in systemsSequence.js needed changing for it: the arc
 * geometry, the scroll travel and the active-card mapping are all
 * computed from `N = cards.length`, so the seventh card slots into the
 * ring, the track grows by one 0.85-viewport stop, and the heading count
 * below is the only string that had to move.
 *
 * Category cards run a timed intro (scatter → line → circle), then
 * scroll morphs the circle into a bottom "rainbow" arc and rotates it so
 * each category lands at the apex. The apex card plays its video in full
 * colour; every other card is greyscaled. All of that lives in
 * systemsSequence.js — this component only renders and scopes it.
 *
 * No image sequence here: the 145-frame `frames/layers` sequence belongs
 * to the Performance/Engineering section.
 */

/**
 * ⚠ THE CARDS AND THEIR COPY ARE NO LONGER IN THIS FILE.
 *
 * They were two hard-coded arrays — SYSTEMS_CARDS and SYSTEMS_INFO —
 * aligned by POSITION, because the controller toggles `.sysm__info` by the
 * apex card's index. That is now the catalogue: `card` and `teaser` on each
 * system (data/systems.js while offline, the API when it answers), keyed by
 * slug and paired here, so a system added in the admin panel arrives with
 * its own card and its own copy and there is no index to keep aligned.
 *
 * ⚠ The card hrefs were `products/sliding.html` — relative links to files
 * that had no route while the system pages were out of scope. Each points
 * at its route instead.
 *
 * ⚠ THEY ARE NOT FULL NAVIGATIONS. Both the CTA and the card used to
 * reload the document — the CTA as a plain `<a href>`, the card via
 * `data-href` + `location.href` in systemsSequence.js — which was faithful
 * to the static site, where each system WAS a separate document. In the SPA
 * that meant re-downloading and re-parsing the whole bundle, re-initialising
 * GSAP and Lenis and re-mounting every provider just to move between two
 * pages of the same app, with a white flash for the duration. The CTA is
 * a <Link> and the card handlers take router `navigate`.
 *
 * `data-href` STAYS on the card. The controller is a ported vanilla module
 * that reads its targets off the DOM, and rewriting it to take an array of
 * hrefs would mean re-threading state through a 400-line spring integrator
 * for no behavioural gain.
 */
export default function SystemsSection() {
  const sectionRef = useRef(null)
  const scrollRef = useRef(null)
  const stageRef = useRef(null)
  const ringRef = useRef(null)
  const hintRef = useRef(null)
  const contentRef = useRef(null)
  const fillRef = useRef(null)

  const reduceMotion = useReducedMotion()

  // The collection, in catalogue order. `signature` changes only when the
  // SET of systems does — which is exactly when the controller below has to
  // be rebuilt, because it captured the card nodes as they were.
  const { systems, signature } = useCatalogue()

  // Held in a ref, NOT closed over directly. useGSAP's callback runs once on
  // mount, so it would capture whatever `navigate` was at that moment; reading
  // it through a ref at click time keeps the controller on the current one
  // even if the router hands back a new identity. It also keeps `navigate` out
  // of the effect's dependency surface, so the whole carousel cannot be torn
  // down and rebuilt by a routing-layer re-render.
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const go = (to) => navigateRef.current(to)

  // The original refreshes twice here: an immediate rAF refresh (because
  // the triggers measured the track before setHeight ran) and one on
  // window 'load'. hero.html line 5451-5452.
  useScrollTriggerRefresh({ immediate: true })

  useGSAP(
    () => {
      const section = sectionRef.current
      const scrollEl = scrollRef.current
      const stage = stageRef.current
      if (!section || !scrollEl || !stage) return

      const cards = [].slice.call(stage.querySelectorAll('.sysm__card'))
      if (!cards.length) return
      const medias = cards.map((c) => c.querySelector('.sysm__card-media'))
      const videos = cards.map((c) => c.querySelector('video'))
      const infos = [].slice.call(stage.querySelectorAll('.sysm__info'))

      // No GSAP or reduced motion → plain row of cards, no pinning.
      // (GSAP is bundled here, so only the motion check remains.)
      if (reduceMotion) {
        return initSystemsStatic(section, cards, infos, videos, true, go)
      }

      return buildSystemsCarousel(section, scrollEl, {
        stage,
        cards,
        medias,
        videos,
        infos,
        hint: hintRef.current,
        content: contentRef.current,
        fill: fillRef.current,
        navigate: go,
      })
    },
    /* ⚠ `dependencies` IS NEW, and it is what makes an editable catalogue
       safe here. The carousel is an imperative spring integrator that
       captures the card elements when it runs. The provider paints the
       shipped catalogue first and swaps in the live one when the request
       lands, so if the two differ React re-renders the ring and the
       controller would otherwise still be driving nodes that have been
       replaced — a ring that animates cards nobody can see. Keyed on the
       signature it is reverted and rebuilt, and on the ordinary case (the
       two are identical) the string is unchanged and nothing happens. */
    { scope: sectionRef, dependencies: [signature] }
  )

  return (
    <section id="systems" className="sysm" aria-label="Our window and door systems" ref={sectionRef}>

      {/* Intro header */}
      <header className="sysm__intro">
        <span className="sysm__eyebrow">The Collection</span>
        {/* "Six" in the original, "Seven" once Tilt & Turn was added — and
            now whatever the catalogue holds, because the count is a thing
            an editor can change. */}
        <h2 className="sysm__heading">
          {countWord(systems.length)} systems.<br /><em>One philosophy.</em>
        </h2>
        <p className="sysm__sub">
          Every Glaze system is a study in motion — or the deliberate absence
          of it. Scroll, and watch each one move.
        </p>
      </header>

      {/* Tall scrub track */}
      <div className="sysm__scroll" id="sysmScroll" ref={scrollRef}>
        <div className="sysm__stage" ref={stageRef}>

          {/* Centre hint (visible inside the circle) */}
          <div className="sysm__hint" aria-hidden="true" ref={hintRef}>
            <p className="sysm__hint-title">Systems in <em>motion.</em></p>
            <p className="sysm__hint-kicker">Scroll to explore</p>
          </div>

          {/* One card per system, in catalogue order. A clip if the system
              has one, its still if it does not — Fixed ships an image and
              deliberately zero motion, because there is no footage of a
              window that never moves. */}
          <div className="sysm__ring" id="sysmRing" ref={ringRef}>
            {systems.map((system, i) => (
              <button
                className="sysm__card"
                type="button"
                data-index={String(i)}
                data-href={productPath(system.slug)}
                aria-label={`${system.name} systems — view details`}
                key={system.slug}
              >
                <span className="sysm__card-frame">
                  {system.card.video ? (
                    <video className="sysm__card-media" src={system.card.video} poster={system.card.poster || undefined} muted ref={keepMuted} loop playsInline preload="metadata" aria-hidden="true"></video>
                  ) : (
                    <img className="sysm__card-media" src={system.card.image || system.card.poster} alt="" loading="lazy" />
                  )}
                </span>
                <span className="sysm__card-name">{system.name}</span>
              </button>
            ))}
          </div>

          {/* Active-category copy (below the cards) */}
          <div className="sysm__content" id="sysmContent" ref={contentRef}>

            {/* ⚠ ONE ARTICLE PER CARD, IN THE SAME ORDER. The controller
                toggles `.sysm__info` by the apex card's INDEX, so these
                have to stay index-aligned with the ring above — which is
                now guaranteed rather than maintained, since both map the
                same array. */}
            {systems.map((system, i) => (
              <article
                className={i === 0 ? 'sysm__info is-active' : 'sysm__info'}
                aria-label={`${system.name} systems`}
                key={system.slug}
              >
                <h3 className="sysm__title">{system.teaser.lead}<em>{system.teaser.em}</em></h3>
                <p className="sysm__desc">
                  {system.teaser.desc}
                </p>
                <ul className="sysm__specs">
                  {system.teaser.specs.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="sysm__cta-row">
                  <Link className="sysm__cta" to={productPath(system.slug)}>
                    {system.teaser.cta}<span className="sysm__cta-arrow">&rarr;</span>
                  </Link>
                </div>
              </article>
            ))}

          </div>

          {/* Section progress */}
          <div className="sysm__progress" aria-hidden="true">
            <div className="sysm__progress-fill" id="sysmProgressFill" ref={fillRef}></div>
          </div>

        </div>
      </div>

      {/*
        The original ships a <noscript><style>…</style></noscript> here as a
        no-JS fallback. It is deliberately NOT reproduced: React creates real
        DOM nodes inside <noscript>, so that <style> would become a live
        stylesheet and apply the static-fallback rules ALWAYS, breaking the
        carousel. The block is also moot in an SPA — with JS disabled this
        section never renders at all. See index.html for the site-level
        no-JS fallback.
      */}
    </section>
  )
}
