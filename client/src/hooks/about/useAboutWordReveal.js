import { useLayoutEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * About — character-curtain reveal.
 *
 * Port of the reveal builder in <script id="about-base-script">
 * (about.html lines 4610-4705).
 *
 * ⚠ This is NOT the Home hook. `useWordReveal` masks whole WORDS with a
 * 50ms per-word stagger; About masks every word as an unbreakable unit
 * and rides each CHARACTER inside it on its own curtain at
 * CHAR_STAGGER = 0.02s, with a running per-heading index. The two also
 * differ in CSS (About's .reveal-word-mask adds white-space: nowrap).
 * Reusing the Home hook here would change the animation, so per the
 * migration rules it stays local.
 *
 * Element children are handled three ways, exactly as the original:
 *   <br>                  passed through unwrapped
 *   plain-text wrapper    (the Bodoni <em>) — split inside, styling kept
 *   complex node          revealed whole as one unit, index += 3, so a
 *                         live counter's text stays scriptable
 *
 * Headings flagged [data-manual-reveal] are BUILT but not observed —
 * their section script reveals them (the hero waits for the preloader
 * curtain).
 *
 * ⚠ LAYOUT effect, deliberately. In about.html the base script sits above
 * every section script, so the masks always exist before a section tries
 * to re-time them. In React the page is the PARENT, and parent effects
 * run last — so as a passive effect this ran AFTER AboutHeroSection's
 * reveal. On a cached revisit (preloader skipped, __glazeHeroReady
 * already true) the hero re-timed zero characters and the heading then
 * animated on the shared 0.02s default instead of its own 0.15s lead-in
 * and 0.028s step. Every layout effect in a commit completes before any
 * passive effect, which restores the original ordering — and building
 * the masks before paint is what the parse-time script did anyway.
 */
export function useAboutWordReveal(scopeRef, options = {}) {
  const {
    selector = '.js-word-reveal',
    rootMargin = '-15% 0px',
    charStagger = 0.02,
  } = options

  useLayoutEffect(() => {
    // about.html's base script queries `document`; the optional ref is
    // only an extra guard for callers that want a tighter scope. The
    // hook is mounted by the About page alone, so document-wide is safe
    // and it is what reaches the nav CTA (which is outside the sections).
    const scope = scopeRef?.current || document
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    const CHAR_STAGGER = charStagger

    function makeCharUnit(content, delay) {
      const inner = document.createElement('span')
      inner.className = 'reveal-word'
      inner.style.setProperty('--reveal-delay', delay.toFixed(3) + 's')
      if (typeof content === 'string') {
        inner.textContent = content
      } else {
        inner.appendChild(content)
      }
      return inner
    }

    function makeMask(children) {
      const mask = document.createElement('span')
      mask.className = 'reveal-word-mask'
      children.forEach(function (child) {
        mask.appendChild(child)
      })
      return mask
    }

    function splitWord(word, state) {
      const chars = []
      for (let c = 0; c < word.length; c++) {
        chars.push(makeCharUnit(word.charAt(c), state.i++ * CHAR_STAGGER))
      }
      return makeMask(chars)
    }

    function splitTextInto(el, text, state) {
      text.split(/(\s+)/).forEach(function (token) {
        if (token === '') return
        if (/^\s+$/.test(token)) {
          el.appendChild(document.createTextNode(' '))
        } else {
          el.appendChild(splitWord(token, state))
        }
      })
    }

    function buildWordReveal(el) {
      const state = { i: 0 }
      const nodes = Array.prototype.slice.call(el.childNodes)
      el.textContent = ''
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          splitTextInto(el, node.textContent, state)
        } else if (node.nodeType === 1) {
          if (node.nodeName === 'BR') {
            el.appendChild(document.createElement('br'))
          } else if (node.children.length === 0) {
            // a styled wrapper of plain text (the Bodoni <em>) —
            // split the characters inside it, keep the styling
            const text = node.textContent
            node.textContent = ''
            splitTextInto(node, text, state)
            el.appendChild(node)
          } else {
            // complex node (e.g. a live counter) — reveal whole,
            // as one unit, so its text stays scriptable
            el.appendChild(makeMask([makeCharUnit(node, state.i * CHAR_STAGGER)]))
            state.i += 3
          }
        }
      })
    }

    const headings = scope.querySelectorAll(selector)

    // Snapshot pristine children first. buildWordReveal is not idempotent
    // (it preserves element children as units), so a re-run without a
    // restore would wrap masks in masks — the exact defect the Home audit
    // caught in useWordReveal under StrictMode's double invoke.
    const pristine = new Map()
    headings.forEach(function (el) {
      pristine.set(
        el,
        Array.prototype.slice.call(el.childNodes).map(function (n) {
          return n.cloneNode(true)
        })
      )
    })

    headings.forEach(buildWordReveal)

    // Fires when the element is 15% into the viewport, once only.
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin, threshold: 0 }
    )
    headings.forEach(function (el) {
      if (!el.hasAttribute('data-manual-reveal')) {
        observer.observe(el)
      }
    })

    return () => {
      observer.disconnect()
      pristine.forEach(function (nodes, el) {
        el.textContent = ''
        nodes.forEach(function (n) {
          el.appendChild(n)
        })
        el.classList.remove('is-revealed')
      })
    }
  }, [scopeRef, selector, rootMargin, charStagger])
}

export default useAboutWordReveal
