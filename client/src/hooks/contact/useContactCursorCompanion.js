import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Contact — cursor companion.
 *
 * Port of the cursor block in <script id="contact-base-script">
 * (contact.html lines 2592-2647).
 *
 * A lerped champagne dot trailing the cursor; over anything tagged
 * [data-cursor-label] it opens into a pill naming the interaction
 * ("Call" / "Write" / "Book" / "WhatsApp" / "Visit" …). The native cursor
 * is never hidden. Fine pointers + motion only; the element is CREATED
 * here, so a page without JS carries no trace of it.
 *
 * The rAF loop is self-parking: it stops once the dot is within 0.1px of
 * the target and restarts on the next mousemove, exactly as the original.
 *
 * ⚠ The JS is behaviour-identical to useCursorCompanion in hooks/about,
 * but the CSS is NOT — Contact's `.cursor-dot__label` is a dark pill with
 * bone text where About's is a bone pill with dark text. That difference
 * lives in contact-global.css as a `:where(.page-contact)` scoped rule.
 */
export function useContactCursorCompanion() {
  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return

    const dot = document.createElement('div')
    dot.className = 'cursor-dot'
    dot.setAttribute('aria-hidden', 'true')
    const core = document.createElement('span')
    core.className = 'cursor-dot__core'
    const dotLabel = document.createElement('span')
    dotLabel.className = 'cursor-dot__label'
    dot.appendChild(core)
    dot.appendChild(dotLabel)
    document.body.appendChild(dot)

    let dotX = -100, dotY = -100, dotTX = -100, dotTY = -100
    let dotOn = false
    let dotRaf = null

    function dotTick() {
      dotX += (dotTX - dotX) * 0.16
      dotY += (dotTY - dotY) * 0.16
      dot.style.transform = 'translate(' + dotX.toFixed(1) + 'px,' + dotY.toFixed(1) + 'px)'
      if (Math.abs(dotTX - dotX) < 0.1 && Math.abs(dotTY - dotY) < 0.1) {
        dotRaf = null
      } else {
        dotRaf = requestAnimationFrame(dotTick)
      }
    }

    function onMouseMove(e) {
      dotTX = e.clientX
      dotTY = e.clientY
      if (!dotOn) {
        dotOn = true
        dotX = dotTX
        dotY = dotTY
        dot.classList.add('is-on')
      }
      if (!dotRaf) dotRaf = requestAnimationFrame(dotTick)
    }

    function onMouseOver(e) {
      const labelled = e.target.closest ? e.target.closest('[data-cursor-label]') : null
      if (labelled) {
        dotLabel.textContent = labelled.getAttribute('data-cursor-label')
        dot.classList.add('has-label')
      } else {
        dot.classList.remove('has-label')
      }
    }

    function onDocLeave() {
      dot.classList.remove('is-on')
      dotOn = false
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseover', onMouseOver)
    document.documentElement.addEventListener('mouseleave', onDocLeave)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onMouseOver)
      document.documentElement.removeEventListener('mouseleave', onDocLeave)
      if (dotRaf) cancelAnimationFrame(dotRaf)
      // The original never removes the dot — the page simply ends. React
      // remounts, so leaving it would append a second dot on every visit.
      if (dot.parentNode) dot.parentNode.removeChild(dot)
    }
  }, [])
}

export default useContactCursorCompanion
