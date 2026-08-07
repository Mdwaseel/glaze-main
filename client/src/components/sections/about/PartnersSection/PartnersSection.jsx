import './partnersSection.css'

/**
 * PartnersSection — port of about.html lines 2621-2766.
 *
 * The Support System: 33 supplier brands across five disciplines, each a
 * ledger band with a narrow left rail and a packed logo wall.
 *
 * ⚠ NO CONTROLLER, and no effect of any kind. about.html ships this
 * section as `<style>` + `<section>` with NO script of its own — its
 * header comment says so explicitly — because every beat here rides
 * machinery the page already mounts:
 *
 *   .fade-up + --reveal-delay  → useAboutFadeReveal   (page-level)
 *   [data-count-to]            → useAboutCountUp      (page-level)
 *   .js-word-reveal            → useAboutWordReveal   (page-level)
 *
 * All three are mounted by About.jsx and query `document`, exactly as the
 * base script does, so they pick this markup up with no wiring. That also
 * means the section inherits the reduced-motion guard for free and has
 * nothing to tear down — hence no refs, no gsap.context, no cleanup.
 *
 * The per-tile stagger is pure CSS: `.ptr__tile:nth-child(5n + N)` sets
 * `--reveal-delay` in a five-step cycle, which the shared fade observer
 * then honours through its `transition-delay`.
 *
 * The light bone ground is load-bearing, not decorative: the logo PNGs
 * are transparent and many marks are near-black (FSB, Menphis, Dr. Hahn,
 * Monticelli, Brio, Centor), so they would vanish on a dark band.
 */
export default function PartnersSection() {
  return (
    <section id="about-partners" className="ptr" aria-labelledby="ptr-heading">
      <div className="ptr__inner">

        <h2 className="ptr__heading js-word-reveal" id="ptr-heading">
          Built with the <em>best in the world.</em>
        </h2>
        <p className="ptr__intro fade-up" style={{ '--reveal-delay': '0.1s' }}>
          Nothing inside a Glaze window is anonymous. The hardware, the
          glass, the coatings, the seals and the machines that cut and
          crimp them each come from a specialist who has spent decades on
          that one problem. We name them here, because what a window is
          made of is the part you cannot see once it is installed.
        </p>

        <div className="ptr__stats">
          <div className="fade-up">
            <span className="ptr__stat-value"><span data-count-to="33" data-format="plain">33</span></span>
            <span className="ptr__stat-label">Supplier brands</span>
          </div>
          <div className="fade-up" style={{ '--reveal-delay': '0.08s' }}>
            <span className="ptr__stat-value"><span data-count-to="10" data-format="plain">10</span></span>
            <span className="ptr__stat-label">Countries of origin</span>
          </div>
          <div className="fade-up" style={{ '--reveal-delay': '0.16s' }}>
            <span className="ptr__stat-value"><span data-count-to="5" data-format="plain">5</span></span>
            <span className="ptr__stat-label">Disciplines</span>
          </div>
        </div>

        {/* ── 01 · Profile & paint ───────────────────────────────── */}
        <div className="ptr__band">
          <header className="ptr__band-rail fade-up">
            <span className="ptr__band-num">01</span>
            <h3 className="ptr__band-name">Profile &amp; Paint</h3>
            <p className="ptr__band-desc">
              Architectural powder coatings and sublimation wood finishes,
              bonded to the aluminium before it is ever cut.
            </p>
            <span className="ptr__band-count">4 brands</span>
          </header>
          <ul className="ptr__grid" style={{ '--cols': '4' }}>
            <li className="ptr__tile fade-up"><img src="/logos/Profile%20Paint/1.png" alt="AkzoNobel — architectural powder coatings, Netherlands" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Profile%20Paint/2.png" alt="PPG — architectural coatings, United States" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Profile%20Paint/3.png" alt="Decoral System — sublimation finishes, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Profile%20Paint/4.png" alt="Menphis — powder coatings, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
          </ul>
        </div>

        {/* ── 02 · Glass ─────────────────────────────────────────── */}
        <div className="ptr__band">
          <header className="ptr__band-rail fade-up">
            <span className="ptr__band-num">02</span>
            <h3 className="ptr__band-name">Glass</h3>
            <p className="ptr__band-desc">
              Float, low-E and acoustic glass from the names that make
              most of the world's architectural glazing.
            </p>
            <span className="ptr__band-count">4 brands</span>
          </header>
          <ul className="ptr__grid" style={{ '--cols': '4' }}>
            <li className="ptr__tile fade-up"><img src="/logos/Glass/21.png" alt="Saint-Gobain — architectural glass, France" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Glass/22.png" alt="AGC — architectural glass, Japan" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Glass/23.png" alt="Pilkington — architectural glass, United Kingdom" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Glass/24.png" alt="XYG — architectural glass, China" width="1080" height="600" loading="lazy" decoding="async" /></li>
          </ul>
        </div>

        {/* ── 03 · Hardware ──────────────────────────────────────── */}
        <div className="ptr__band">
          <header className="ptr__band-rail fade-up">
            <span className="ptr__band-num">03</span>
            <h3 className="ptr__band-name">Hardware</h3>
            <p className="ptr__band-desc">
              Hinges, handles, locks and actuators — the moving parts
              that decide how a window feels for twenty years.
            </p>
            <span className="ptr__band-count">16 brands</span>
          </header>
          <ul className="ptr__grid" style={{ '--cols': '4' }}>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/5.png" alt="Roto — window and door hardware, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/6.png" alt="HOPPE — handles and levers, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/7.png" alt="Fapim — window hardware, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/8.png" alt="Gretsch-Unitas — window and door technology, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/9.png" alt="FSB — door and window fittings, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/10.png" alt="Sobinco — window and door hardware, Belgium" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/11.png" alt="Nekos — window automation actuators, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/12.png" alt="Smart Home — home automation systems, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/13.png" alt="Securistyle — friction hinges and hardware, United Kingdom" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/14.png" alt="GEZE — door and window control systems, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/15.png" alt="HAUTAU — sliding and parallel hardware, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/16.png" alt="Monticelli — window hardware, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/17.png" alt="Dr. Hahn — door hinges, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/18.png" alt="Renson — ventilation and sun protection, Belgium" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/19.png" alt="Centor — integrated screens and doors, Australia" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Hardware/20.png" alt="Brio — sliding and folding gear, Australia" width="1080" height="600" loading="lazy" decoding="async" /></li>
          </ul>
        </div>

        {/* ── 04 · Sealing & insulation ──────────────────────────── */}
        <div className="ptr__band">
          <header className="ptr__band-rail fade-up">
            <span className="ptr__band-num">04</span>
            <h3 className="ptr__band-name">Sealing &amp; Insulation</h3>
            <p className="ptr__band-desc">
              Silicones, gaskets, warm-edge spacers and thermal breaks
              that keep weather and noise on the outside.
            </p>
            <span className="ptr__band-count">5 brands</span>
          </header>
          <ul className="ptr__grid" style={{ '--cols': '5' }}>
            <li className="ptr__tile fade-up"><img src="/logos/Silicon%20Rubber%20Misc/25.png" alt="Wacker — silicones and sealants, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Silicon%20Rubber%20Misc/26.png" alt="Technoform Glassinsulation — warm-edge spacers, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Silicon%20Rubber%20Misc/27.png" alt="Technoform Bautec — polyamide thermal barriers, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Silicon%20Rubber%20Misc/28.png" alt="Haida — sealing and gasket systems, China" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Silicon%20Rubber%20Misc/29.png" alt="Lijialong — rubber sealing profiles, China" width="1080" height="600" loading="lazy" decoding="async" /></li>
          </ul>
        </div>

        {/* ── 05 · Equipment & software ──────────────────────────── */}
        <div className="ptr__band">
          <header className="ptr__band-rail fade-up">
            <span className="ptr__band-num">05</span>
            <h3 className="ptr__band-name">Equipment &amp; Software</h3>
            <p className="ptr__band-desc">
              The machines and fabrication software that cut, crimp and
              assemble every frame in Hyderabad.
            </p>
            <span className="ptr__band-count">4 brands</span>
          </header>
          <ul className="ptr__grid" style={{ '--cols': '4' }}>
            <li className="ptr__tile fade-up"><img src="/logos/Equipment%20Software/30.png" alt="Emmegi — aluminium working machinery, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Equipment%20Software/31.png" alt="Fom Industrie — aluminium working machinery, Italy" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Equipment%20Software/32.png" alt="AME Pressta — cutting and crimping machinery, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
            <li className="ptr__tile fade-up"><img src="/logos/Equipment%20Software/33.png" alt="Orgadata — fabrication software, Germany" width="1080" height="600" loading="lazy" decoding="async" /></li>
          </ul>
        </div>

        <p className="ptr__foot fade-up">
          All names and logos shown are the property of their respective
          owners and appear here to identify the components used in Glaze
          systems.
        </p>

      </div>
    </section>
  )
}
