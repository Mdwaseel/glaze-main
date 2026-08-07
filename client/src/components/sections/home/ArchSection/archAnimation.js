import { gsap, ScrollTrigger } from '@/utils/gsap'

/**
 * Architectural Freedom — GSAP horizontal gallery.
 *
 * Port of the script in hero.html (lines 4344-4530): scrubbed track with
 * velocity skew, per-card unfold + image parallax, live header counter.
 * The original's ghost-word parallax is the one omission — the outlined
 * word it moved has been removed from the markup.
 *
 * Every number, easing, start/end string and toggleActions value below is
 * copied from the original. The per-card triggers all ride
 * `containerAnimation: scrub`, which is what makes `start: 'left 100%'`
 * resolve against horizontal travel instead of page scroll — do not
 * convert these to ordinary vertical triggers.
 *
 * Call inside a useGSAP/gsap.context scope. The returned cleanup removes
 * the one thing gsap.context cannot track for us: the global
 * ScrollTrigger 'refreshInit' listener and the injected section height.
 */
export function buildArchAnimation(section, track, progressBar, els) {
  const { countEl, catEl, lineEl } = els

  const cards = gsap.utils.toArray('.arch__card', track)

  function distance() {
    return Math.max(0, track.scrollWidth - window.innerWidth)
  }

  // The section's own height provides the scroll room for the CSS
  // sticky stage (plays nicely with Lenis — no pin-spacer needed).
  function setHeight() {
    section.style.height = window.innerHeight + distance() + 'px'
  }
  setHeight()
  ScrollTrigger.addEventListener('refreshInit', setHeight)

  // ── Velocity skew: the track leans into fast scrolls, then settles ──
  const skewProxy = { skew: 0 }
  const skewSetter = gsap.quickSetter(track, 'skewX', 'deg')
  const clampSkew = gsap.utils.clamp(-4.5, 4.5)
  gsap.set(track, { transformOrigin: 'center center', force3D: true })

  const scrub = gsap.to(track, {
    x: function () {
      return -distance()
    },
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.8,
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        const skew = clampSkew(self.getVelocity() / -350)
        if (Math.abs(skew) > Math.abs(skewProxy.skew)) {
          skewProxy.skew = skew
          gsap.to(skewProxy, {
            skew: 0,
            duration: 0.8,
            ease: 'power3',
            overwrite: true,
            onUpdate: function () {
              skewSetter(skewProxy.skew)
            },
          })
        }
        if (progressBar) {
          progressBar.style.width = (self.progress * 100).toFixed(2) + '%'
          progressBar.style.opacity =
            self.progress > 0 && self.progress < 1 ? '1' : '0'
        }
        if (lineEl) {
          lineEl.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'
        }
      },
    },
  })

  // (The outlined ghost word that drifted behind the cards on its own
  // slower plane is gone, and its parallax tween with it.)

  // ── Live header counter / category readout ──
  let current = -1
  function setCurrent(i) {
    if (i === current || !cards[i]) return
    current = i
    if (countEl) {
      countEl.textContent = ('0' + (i + 1)).slice(-2)
      gsap.fromTo(
        countEl,
        { yPercent: 70, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out', overwrite: true }
      )
    }
    if (catEl) {
      catEl.textContent = cards[i].getAttribute('data-cat') || ''
      gsap.fromTo(
        catEl,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', overwrite: true }
      )
    }
  }
  setCurrent(0)

  // ── Per-card choreography, driven by the track's own motion ──
  cards.forEach(function (card, i) {
    const img = card.querySelector('.arch__card-media img')
    const content = card.querySelectorAll('.arch__card-meta, .arch__card-title')

    // Card unfolds (clip + scale) as it travels in from the right
    gsap.fromTo(
      card,
      { clipPath: 'inset(12% 9% 12% 9%)', scale: 0.92 },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        scale: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          containerAnimation: scrub,
          start: 'left 100%',
          end: 'left 45%',
          scrub: true,
        },
      }
    )

    // Caption lifts in once the card is comfortably on screen
    gsap.from(content, {
      y: 30,
      opacity: 0,
      stagger: 0.07,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        containerAnimation: scrub,
        start: 'left 78%',
        toggleActions: 'play none none reverse',
      },
    })

    // Image glides inside its frame (parallax within the card)
    if (img) {
      gsap.fromTo(
        img,
        { xPercent: -6, scale: 1.14 },
        {
          xPercent: 6,
          scale: 1.14,
          ease: 'none',
          scrollTrigger: {
            trigger: card,
            containerAnimation: scrub,
            start: 'left 100%',
            end: 'right 0%',
            scrub: true,
          },
        }
      )
    }

    // Which card owns the centre → drives the header counter
    ScrollTrigger.create({
      trigger: card,
      containerAnimation: scrub,
      start: 'left 60%',
      end: 'right 60%',
      onToggle: function (self) {
        if (self.isActive) setCurrent(i)
      },
    })
  })

  // gsap.context reverts the tweens and ScrollTriggers created above, but
  // it knows nothing about the global refreshInit hook or the inline
  // height, so both are undone here.
  return function cleanup() {
    ScrollTrigger.removeEventListener('refreshInit', setHeight)
    section.style.height = ''
  }
}

/**
 * Custom "Scroll" follow-cursor for this section only.
 *
 * Verbatim port of the second arch script (hero.html lines 4867-4907).
 * Plain rAF lerp at FOLLOW = 0.18 — no GSAP involved, deliberately.
 * Desktop pointers only; skipped for touch devices and reduced-motion
 * users, exactly as the original gated it.
 *
 * @returns {() => void} teardown
 */
export function initArchCursor(section, cursor) {
  if (!section || !cursor) return () => {}

  // Desktop pointers only — skip touch devices & reduced-motion users.
  const fine = window.matchMedia('(pointer: fine)').matches
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!fine || reduce) return () => {}

  let tx = 0,
    ty = 0,
    cx = 0,
    cy = 0,
    raf = null
  const FOLLOW = 0.18 // 0 = no lag, 1 = instant. Lower = smoother trailing.

  function loop() {
    cx += (tx - cx) * FOLLOW
    cy += (ty - cy) * FOLLOW
    cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'
    raf = requestAnimationFrame(loop)
  }

  function onEnter(e) {
    tx = cx = e.clientX
    ty = cy = e.clientY // appear under the pointer
    cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'
    cursor.classList.add('is-active')
    section.classList.add('is-cursor-active')
    if (!raf) loop()
  }

  function onMove(e) {
    tx = e.clientX
    ty = e.clientY
  }

  function onLeave() {
    cursor.classList.remove('is-active')
    section.classList.remove('is-cursor-active')
    if (raf) {
      cancelAnimationFrame(raf)
      raf = null
    }
  }

  section.addEventListener('mouseenter', onEnter)
  section.addEventListener('mousemove', onMove)
  section.addEventListener('mouseleave', onLeave)

  return function teardown() {
    section.removeEventListener('mouseenter', onEnter)
    section.removeEventListener('mousemove', onMove)
    section.removeEventListener('mouseleave', onLeave)
    if (raf) cancelAnimationFrame(raf)
    cursor.classList.remove('is-active')
    section.classList.remove('is-cursor-active')
  }
}
