import { Link, useLocation } from 'react-router-dom'
import SEO from '@/components/common/SEO'
import { useCatalogue } from '@/context/CatalogueContext'
import { useSiteSettings } from '@/context/SiteSettingsContext'
import { ROUTES, productPath } from '@/constants/routes'
import './thankYou.css'

/**
 * /thank-you — where an enquiry lands.
 *
 * ⚠ WHY A PAGE AND NOT JUST THE INLINE CONFIRMATION. Both enquiry forms
 * already swapped themselves for a "Thank you. We have it." panel in place,
 * which is good UX and is still the fallback (see below). What it cannot do
 * is be a URL, and three separate things need one:
 *
 *   MEASUREMENT   A conversion defined as "reached /thank-you" is the one
 *                 definition that works in GA4, Google Ads, Meta and Search
 *                 Console alike, without a tag manager listening for a class
 *                 name on a div. The `trackEnquiry` event still fires from
 *                 the controller — this is the destination that makes the
 *                 same conversion measurable by tools that only see URLs.
 *   THE FALLBACK  When `fetch` is unavailable the form posts NATIVELY to the
 *                 relay, which navigates the browser away from the page. In
 *                 that path there was no confirmation at all; a `_next`
 *                 field pointing here gives that visitor the same answer as
 *                 everyone else.
 *   THE ANSWER    "We have it" is not what somebody who just sent drawings
 *                 wants to read. What happens next, when, and what to do if
 *                 it is urgent — that needs more room than a form's success
 *                 state, and it is where the response-time promise belongs.
 *
 * ⚠ `noindex, follow`. A thank-you page in the index is a thank-you page
 * people arrive at from a search having sent nothing, and it pollutes the
 * conversion count with organic entrances. `follow` because the links out of
 * it are real and should be crawled from wherever else they appear.
 *
 * ⚠ IT DOES NOT ASSUME IT WAS REACHED FROM A FORM. Someone can bookmark it,
 * a crawler can find it, and the native-POST path arrives with no router
 * state at all. There is no "your reference is…" here that could be blank,
 * and the copy reads correctly to a visitor who simply typed the URL.
 */
export default function ThankYou() {
  const { state } = useLocation()
  const { systems } = useCatalogue()
  const { settings } = useSiteSettings()

  /* Set by the enquiry controllers when they navigate here. Absent on a
     direct visit and on the native-POST fallback, which is why every use of
     it below is optional rather than load-bearing.

     ⚠ `recap` IS WHY THIS PAGE TAKES STATE AT ALL. The system pages' form is
     a configurator — it collects system, variant, series, glass and finish —
     and its in-place confirmation printed that configuration back. Sending
     everybody to a generic thank-you page would have thrown that away, which
     is a worse confirmation than the one it replaced. It is carried here
     instead, so there is one confirmation surface rather than two. */
  const system = state?.system || ''
  const recap = Array.isArray(state?.recap) ? state.recap.filter((r) => r && r.value) : []

  const phone = settings.contact_phone
  const tel = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null

  // Three to read next, never including the one just enquired about — that
  // is the page they came from.
  const suggestions = systems.filter((s) => s.name !== system).slice(0, 3)

  return (
    <main className="ty" id="top">
      <SEO
        title="Thank you — Glaze | Your enquiry is with us"
        description="Your enquiry has reached Glaze Window Systems. We reply within one working day."
        path="/thank-you"
        noindex
      />

      <div className="ty__inner">
        <header className="ty__head">
          <p className="ty__eyebrow">Enquiry received</p>
          <h1 className="ty__title">
            Thank you.<br /><em>We have it.</em>
          </h1>
          <p className="ty__lede">
            {system
              ? `Your ${system} enquiry is with our team.`
              : 'Your enquiry is with our team.'}{' '}
            We reply within one working day &mdash; usually the same one.
          </p>
        </header>

        {/* What was configured, when the enquiry came from a system page's
            configurator. Nothing at all when it did not — an empty "your
            specification" panel reads as something that failed to load. */}
        {recap.length > 0 && (
          <div className="ty__recap">
            <h2 className="ty__recap-title">What you specified</h2>
            <dl className="ty__recap-list">
              {recap.map((row) => (
                <div className="ty__recap-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* The response-time promise, made specific. "We'll be in touch" is
            what every site says; these are the three things that actually
            happen, in the order they happen. */}
        <ol className="ty__steps">
          <li className="ty__step">
            <span className="ty__step-num">01</span>
            <h2 className="ty__step-title">A confirmation, now</h2>
            <p className="ty__step-copy">
              An acknowledgement is on its way to the email address you gave.
              If it is not in your inbox within a few minutes, it is worth a
              look in the spam folder.
            </p>
          </li>
          <li className="ty__step">
            <span className="ty__step-num">02</span>
            <h2 className="ty__step-title">A reply within one working day</h2>
            <p className="ty__step-copy">
              Someone who knows the systems reads your enquiry &mdash; not an
              auto-responder. If you sent drawings, they will have been
              through them before they call.
            </p>
          </li>
          <li className="ty__step">
            <span className="ty__step-num">03</span>
            <h2 className="ty__step-title">A specification, then a number</h2>
            <p className="ty__step-copy">
              We agree the series and the configuration that suit the opening
              before anyone quotes a price, so the figure you get is for the
              window you are actually going to have.
            </p>
          </li>
        </ol>

        {/* Urgency valve. Somebody on site with a deadline should not have to
            find the contact page from here. */}
        {tel && (
          <div className="ty__urgent">
            <p className="ty__urgent-copy">
              If it is urgent, do not wait for us to call.
            </p>
            <a className="ty__urgent-cta" href={tel}>
              {phone}<span className="ty__arrow" aria-hidden="true">&rarr;</span>
            </a>
            {settings.business_hours && (
              <p className="ty__urgent-hours">{settings.business_hours}</p>
            )}
          </div>
        )}

        {/* Internal links out. A confirmation page with one "back to home"
            button is a dead end for a visitor who is, at this exact moment,
            more interested in the product than they will ever be again. */}
        <section className="ty__next" aria-labelledby="ty-next-title">
          <h2 className="ty__next-title" id="ty-next-title">While you wait</h2>

          <div className="ty__next-grid">
            {suggestions.map((suggestion) => (
              <Link className="ty__card" to={productPath(suggestion.slug)} key={suggestion.slug}>
                <span className="ty__card-media">
                  <img
                    src={suggestion.card.poster || suggestion.card.image}
                    alt={`${suggestion.name} aluminium system by Glaze`}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="ty__card-name">
                  {suggestion.name}<span className="ty__arrow" aria-hidden="true">&rarr;</span>
                </span>
              </Link>
            ))}
          </div>

          <div className="ty__links">
            <Link to={ROUTES.SYSTEMS}>All systems</Link>
            <Link to={ROUTES.BLOG}>The journal</Link>
            <Link to={ROUTES.ABOUT}>About Glaze</Link>
            <Link to={ROUTES.HOME}>Home</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
