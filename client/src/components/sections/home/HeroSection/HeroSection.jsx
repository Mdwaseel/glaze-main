import { useMemo, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ScrollIndicator from '@/components/common/ScrollIndicator'
import { useMediaQuery, useScrollSequence } from '@/hooks'
import { resolveHref } from '@/utils/links'
import {
  HERO_SEQUENCE,
  HERO_SEQUENCE_MOBILE,
  MOBILE_SEQUENCE_QUERY,
  createHeroProgressHandler,
} from './heroSequence'
// ⚠ Import order is load-bearing. In hero.html the shared .seq-* rules
// come AFTER the hero rules, so `.seq-pin { position: sticky }` wins over
// `.hero { position: relative }` on the element carrying both classes.
// Flip these two lines and the hero silently stops pinning.
import './heroSection.css'
import '@/styles/sequence.css'

/**
 * HeroSection — port of hero.html lines 1456-1503.
 *
 * Markup, class names and ids are unchanged: the tall .hero-scroll
 * wrapper gives the pinned hero its scroll travel, .seq-pin sticks the
 * section for a viewport while the 120-frame WebP sequence scrubs on the
 * canvas underneath.
 *
 * This component holds no animation code. The scrub, lazy frame loading,
 * cover-fit painting, pin height and resize handling all live in
 * useScrollSequence; the text fade lives in heroSequence.js.
 *
 * There is no GSAP here, and none was added — the original hero is
 * driven entirely by rAF plus CSS keyframe entrances (fade-in on the
 * eyebrow, reveal-up on the title/subtitle/buttons). Wrapping it in a
 * timeline would change the timing.
 */
export default function HeroSection() {
  const { pathname } = useLocation()

  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const contentRef = useRef(null)
  const cueRef = useRef(null)

  const onProgress = useMemo(
    () => createHeroProgressHandler(contentRef, cueRef),
    []
  )

  /* Phones in portrait paint the 9:16 set; everything else keeps the
     16:9 one. Only `dir` differs between the two, and useScrollSequence
     re-runs on it, so rotating the device swaps the frames. */
  const portrait = useMediaQuery(MOBILE_SEQUENCE_QUERY)
  const sequence = portrait ? HERO_SEQUENCE_MOBILE : HERO_SEQUENCE

  useScrollSequence({ canvasRef, scrollRef, ...sequence, onProgress })

  const primaryCta = resolveHref('contact.html#enquiry', pathname)
  const secondaryCta = resolveHref('#systems', pathname)

  return (
    /* Tall wrapper: gives the pinned hero its scroll travel. Its height is
       set by JS to (1 + PIN) × viewport so the sticky hero stays fixed while
       the WebP frame sequence scrubs through on scroll. */
    <div className="hero-scroll seq-scroll" id="heroScroll" ref={scrollRef}>
      <section id="top" className="hero seq-pin">

        {/*
          ┌─────────────────────────────────────────────┐
          │  SCROLL-SCRUBBED IMAGE SEQUENCE             │
          │  The old background video is replaced by a   │
          │  120-frame WebP sequence painted to this     │
          │  canvas (frames/hero/hero_000…119.webp).     │
          └─────────────────────────────────────────────┘
        */}
        <canvas
          className="hero__canvas seq-canvas"
          id="heroCanvas"
          aria-hidden="true"
          ref={canvasRef}
        ></canvas>

        {/* Dark gradient overlay */}
        <div className="hero__overlay"></div>

        {/* Hero content */}
        <div className="hero__content" id="heroContent" ref={contentRef}>

          <span className="hero__eyebrow">Architectural Aluminium Systems</span>

          <h1 className="hero__title">
            Designed to <br />Disappear.
          </h1>

          <p className="hero__subtitle">
            Minimal architectural systems for light,
            silence and seamless living.
          </p>

          <div className="hero__buttons">
            {primaryCta.internal ? (
              <Link to={primaryCta.to} className="hero__btn--primary">Discuss Your Project</Link>
            ) : (
              <a href={primaryCta.to} className="hero__btn--primary">Discuss Your Project</a>
            )}
            {secondaryCta.internal ? (
              <Link to={secondaryCta.to} className="hero__btn--secondary">Explore Systems</Link>
            ) : (
              <a href={secondaryCta.to} className="hero__btn--secondary">Explore Systems</a>
            )}
          </div>

        </div>

        {/* Scroll indicator */}
        <ScrollIndicator ref={cueRef} />

      </section>
    </div>
  )
}
