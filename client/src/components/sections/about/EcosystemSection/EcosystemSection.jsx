import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { prefersReducedMotion } from '@/utils/motion'
import { buildEcosystemMotion } from './ecosystemAnimation'
import './ecosystemSection.css'

/**
 * EcosystemSection — About §07b, the parent group.
 *
 * NEW WORK, not a port: about.html has no group section. It sits between
 * §07 Values and §08 Numbers because that is where the page stops talking
 * about how Glaze builds and starts talking about who Glaze belongs to —
 * the last thing said before the figures.
 *
 * ── IT IS A LEDGER, NOT A GRID, AND THAT IS THE WHOLE REDESIGN ──
 * The first version was five equal cards. It was legible and it was
 * forgettable: five identical rectangles give five companies identical
 * weight, which is a table of contents rather than a composition, and no
 * amount of spacing inside a card fixes a shape that repeats.
 *
 * So the cards are gone. Each company is now a full-measure ENTRY in an
 * index — a hairline, a number, an industry, the name set large, one
 * paragraph, its services, and its mark — and the entries ALTERNATE which
 * half of the grid they hold. Odd entries put the type left and the mark
 * right; even entries reverse it. Read down the page that produces a
 * zig-zag the eye follows rather than a block it scans, which is how a
 * printed exhibition catalogue handles exactly this problem: many equal
 * things that must not look like a list.
 *
 * What the shape buys, in order of how much it matters:
 *
 *   · TYPE IS THE HERO. A card caps its heading at whatever the card is
 *     wide. A half-measure entry does not, so the name is set at
 *     clamp(2.2rem, 4.4vw, 3.5rem) — five times the size of its own
 *     eyebrow, and the largest thing in the section after the headline.
 *   · WHITESPACE IS STRUCTURAL. The empty half of every row is not
 *     padding that could be tuned away; it is the other half of the
 *     alternation. The air cannot collapse because it is load-bearing.
 *   · THE HAIRLINE IS THE ONLY EDGE. No card border, no fill, no shadow.
 *     One rule per entry, drawn left to right as the entry arrives.
 *
 * ── THE PALETTE IS LOCAL, AND IT IS A DEPARTURE ─────────────────
 * ⚠ #0B0B0B AND #C8A46A ARE NOT THE HOUSE TOKENS. The page's ground is
 * `--arch-black` (#1B1B1B) and its accent is `--champagne` (#A79A87);
 * this section is authored to the two values the brief specifies, which
 * are a stop darker and a stop warmer. Both are declared as custom
 * properties on `.eco` and used nowhere else, so the section can be
 * returned to the house palette by editing two lines — see the note at
 * the top of the stylesheet.
 *
 * ── THE ASSETS ARE NOT THE SUPPLIED FILES ───────────────────────
 * The originals in `/images/about/Brio Group logos/` are unusable as
 * shipped: five sizes, five aspect ratios, 53–76% of each canvas empty
 * margin, and JAZ a 2.1 MB JPEG. They are pre-processed into
 * `/images/about/ecosystem/` in two passes — trimmed to their real
 * content box, then scaled to the same ink AREA on an identical 900×300
 * white canvas.
 *
 * ⚠ EQUAL AREA, BECAUSE NO CSS BOX CAN EXPRESS IT. The set runs from a
 * 3.02:1 wordmark to a 1.43:1 lockup; a box sizes them by whichever edge
 * binds first, so equal height makes the wide ones enormous and equal
 * width makes the square one enormous. Measured across four breakpoints,
 * the version that tried it in CSS rendered them up to 8x apart. 2.5 MB
 * became 36 KB and the five files are now interchangeable.
 *
 * Motion lives in ecosystemAnimation.js. The headline still uses the
 * page's own `js-word-reveal`; everything below it is per-entry, because
 * the ledger is several viewports tall and one section-level trigger
 * would fire the last entry's reveal while it was still below the fold.
 */

/**
 * ⚠ THE GROUP'S OWN URL IS THE ONE THING NOT SUPPLIED. The CTA is built,
 * styled and magnetic; it needs a destination. Set this and it is done.
 * Left as '#' rather than invented, and rather than pointed at a Glaze
 * route that would make the label a lie.
 */
const BRIO_GROUP_HREF = '#'

/** The five companies, in the order the group presents them. */
const COMPANIES = [
  {
    slug: 'brio-elevators',
    name: 'Brio Elevators',
    industry: 'Vertical Transportation',
    body:
      'Premium residential and commercial elevator solutions, combining ' +
      'advanced technology, safety and elegant design to enhance modern living.',
    services: ['Home Elevators', 'MRL Elevators'],
  },
  {
    slug: 'jaz-home-theatres',
    name: 'Jaz Home Theatres',
    industry: 'Home Entertainment',
    body:
      'Immersive entertainment built room by room, through customised home ' +
      'theatre systems and smart home automation.',
    services: ['Home Theatre Systems', 'Dolby Atmos', 'Smart Home Automation'],
  },
  {
    slug: 'glaze-window-systems',
    name: 'Glaze Window Systems',
    industry: 'Window & Door Solutions',
    body:
      'Premium aluminium window and door systems, designed to enhance the ' +
      'style, comfort and functionality of modern homes and commercial spaces.',
    services: ['Aluminium Windows', 'Sliding & Casement', 'Premium Door Systems'],
  },
  {
    slug: 'auravelle-interiors',
    name: 'Auravelle Interiors',
    industry: 'Interior Design',
    body:
      'End-to-end interior solutions, managing every stage of a project from ' +
      'design and planning through execution to final handover.',
    services: ['Home Interiors', 'Modular Kitchens', 'Office Interiors', 'Turnkey Projects'],
  },
  {
    slug: 'dhan-infra',
    name: 'Dhan Infra',
    industry: 'Infrastructure & Construction',
    body:
      'Infrastructure and construction delivered on quality, timely execution ' +
      'and sustainable development.',
    services: ['Residential Construction', 'Commercial Projects', 'Infrastructure Development'],
  },
]

export default function EcosystemSection() {
  const sectionRef = useRef(null)

  useGSAP(
    () => {
      /* The resting markup IS the finished state, so there is nothing to
         put back — the section simply never animates. */
      if (prefersReducedMotion()) return
      buildEcosystemMotion(sectionRef.current)
    },
    { scope: sectionRef }
  )

  return (
    <section id="about-ecosystem" className="eco" aria-labelledby="eco-heading" ref={sectionRef}>
      <div className="eco__inner">

        <header className="eco__head">
          <p className="eco__label">Brio Group</p>
          <h2 className="eco__heading js-word-reveal" id="eco-heading">
            Five companies.<br /><em>One vision.</em>
          </h2>
          <p className="eco__lede fade-up" style={{ '--reveal-delay': '0.12s' }}>
            One group, five specialist practices — each building a different
            part of the same house. Glaze is the window and door practice
            within it.
          </p>
        </header>

        {/* An ordered list, because the numbers in the margin are real: the
            entries are counted 01–05 and read in that order. */}
        <ol className="eco__index">
          {COMPANIES.map((c, i) => (
            <li className="eco__row" key={c.slug} data-eco-row>

              {/* The entry's own opening gesture. An element rather than a
                  `border-top` because a border cannot be drawn from one
                  end — see the animation module. */}
              <span className="eco__rule" data-eco-rule aria-hidden="true"></span>

              <div className="eco__text">
                <p className="eco__meta" data-eco-line>
                  <span className="eco__num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="eco__meta-sep" aria-hidden="true"></span>
                  <span className="eco__industry">{c.industry}</span>
                </p>

                <h3 className="eco__name" data-eco-line>{c.name}</h3>
                <p className="eco__body" data-eco-line>{c.body}</p>

                <ul className="eco__services" role="list" data-eco-line
                    aria-label={`${c.name} core services`}>
                  {c.services.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="eco__figure">
                {/* ⚠ THE WHITE PLATE IS IN THE FILE, NOT IN THE CSS. Two of
                    the five marks carry a baked-in white rectangle that
                    cannot be keyed out without holing their own counters,
                    so every canvas is white and all five are seamless on
                    it. The wrapper clips the corner and holds the drift. */}
                <div className="eco__plate" data-eco-plate>
                  <img
                    src={`/images/about/ecosystem/${c.slug}.webp`}
                    alt={`${c.name} logo`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>

            </li>
          ))}
        </ol>

        <div className="eco__foot">
          <span className="eco__rule eco__rule--foot" aria-hidden="true"></span>
          <a className="eco__cta" href={BRIO_GROUP_HREF} data-magnetic>
            <span className="eco__cta-label">Explore the Brio Group</span>
            <span className="eco__cta-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </div>

      </div>
    </section>
  )
}
