import { useLayoutEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Contact — character-curtain reveal.
 *
 * Port of the reveal builder in <script id="contact-base-script">
 * (contact.html lines 2453-2545).
 *
 * ⚠ NOT the Home hook. `useWordReveal` masks whole WORDS with a 50ms
 * per-word stagger; Contact masks every word as an unbreakable unit and
 * rides each CHARACTER inside it on its own curtain at
 * CHAR_STAGGER = 0.02s, with a running per-heading index. The two also
 * differ in CSS (Contact's .reveal-word-mask adds white-space: nowrap).
 *
 * ⚠ Byte-identical in behaviour to useAboutWordReveal — contact.html and
 * about.html ship the same base-script block. It is duplicated rather
 * than shared because about-global/hooks are audited (Phase 26) and the
 * standing rule is not to modify completed work; consolidating the two
 * into one page-level hook set is a clean follow-up, recorded in the
 * migration log.
 *
 * Element children are handled three ways, exactly as the original:
 *   <br>                  passed through unwrapped
 *   plain-text wrapper    (the Bodoni <em>) — split inside, styling kept
 *   complex node          revealed whole as one unit, index += 3
 *
 * ⚠ LAYOUT effect. contact.html's base script runs at parse time, so the
 * masks exist before first paint. Carried over from the Phase 14 fix.
 */
export function useContactWordReveal(scopeRef, options = {}) {
  const {
    selector = '.js-word-reveal',
    rootMargin = '-15% 0px',
    charStagger = 0.02,
  } = options

  useLayoutEffect(() => {
    // contact.html's base script queries `document`; the optional ref is
    // only an extra guard. The hook is mounted by the Contact page alone,
    // so document-wide is safe and it is what reaches the nav CTA.
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
            // complex node — reveal whole, as one unit
            el.appendChild(makeMask([makeCharUnit(node, state.i * CHAR_STAGGER)]))
            state.i += 3
          }
        }
      })
    }

    const headings = scope.querySelectorAll(selector)

    // Snapshot pristine children first. buildWordReveal is not idempotent
    // (it preserves element children as units), so a re-run without a
    // restore would wrap masks in masks — the defect the Home audit caught
    // in useWordReveal under StrictMode's double invoke.
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
      observer.observe(el)
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

export default useContactWordReveal
