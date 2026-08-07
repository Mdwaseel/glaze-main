import './hardwareSection.css'

/**
 * HardwareSection — port of products/sliding.html lines 2499-2522.
 *
 * A gapless 5 × 2 plate of hardware details on dark ground, under the
 * four marque names. Identical on all six pages, so nothing here is
 * parameterised.
 *
 * ⚠ NO CONTROLLER. §06 ships as `<style>` + `<section>` with no script.
 * The two moving parts are page-level:
 *
 *   [data-curtain] on the title  → useProductsEntrance
 *   [data-stagger] on the grid   → useProductsEntrance
 *   .hw__cell img clip reveal    → useProductsEntrance
 *
 * TODO(photography): hw-01…hw-10 are the placeholder detail shots that
 * shipped with the page; the alt text is generic for the same reason.
 */
export default function HardwareSection() {
  return (
    <section className="hw" id="sys-hardware" aria-labelledby="hw-title">
      <div className="hw__head">
        <h2 className="sec-title hw__title" id="hw-title" data-curtain>
          Engineered in Germany. <em>Every piece.</em>
        </h2>
        <p className="hw__marques">
          <span>Siegenia</span><span>Hoppe</span><span>GU</span><span>Roto</span>
        </p>
      </div>

      <div className="hw__grid" data-stagger>
        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'].map((n) => (
          <figure className="hw__cell" key={n}>
            <img
              src={`/products/hardware/hw-${n}.webp`}
              alt={n === '10' ? 'Glaze system handle detail' : 'Glaze system hardware detail'}
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  )
}
