import { useEffect } from 'react'
import { prefersReducedMotion } from '@/utils/motion'

/**
 * Word-curtain reveal — each word slides up from behind a mask,
 * staggered 50 ms per word.
 *
 * Port of buildWordReveal() + its IntersectionObserver from the base
 * script in hero.html (lines 4212-4265). The mask spans are built by JS
 * at runtime, exactly as before; the matching CSS (.reveal-word-mask,
 * .reveal-word, .js-word-reveal.is-revealed) already lives in
 * styles/global.css.
 *
 * Inline child elements (e.g. an italic accent) are kept intact and
 * animated as one word unit so their styling survives; <br> is passed
 * through unwrapped.
 *
 * NOTE: this mutates the DOM inside React-owned nodes. That is safe for
 * the static headings it targets — React has no reason to re-render
 * them — but never point it at a heading whose text comes from state.
 *
 * Reduced motion is handled in CSS (transform/transition are forced off),
 * and, as in the original, the masks are simply never built when motion
 * is reduced or IntersectionObserver is missing.
 *
 * @param {React.RefObject<HTMLElement>} scopeRef container to search
 * @param {object} [options]
 * @param {string} [options.selector='.js-word-reveal']
 * @param {string} [options.rootMargin='-15% 0px'] fires 15% into the viewport
 * @param {number} [options.stagger=0.05] seconds between words
 */
export function useWordReveal(scopeRef, options = {}) {
  const {
    selector = '.js-word-reveal',
    rootMargin = '-15% 0px',
    stagger = 0.05,
  } = options

  useEffect(() => {
    const scope = scopeRef?.current
    if (!scope) return
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    // Build the masked word spans for each word-reveal heading.
    function makeWord(content, index) {
      const mask = document.createElement('span')
      mask.className = 'reveal-word-mask'
      const inner = document.createElement('span')
      inner.className = 'reveal-word'
      inner.style.setProperty('--reveal-delay', index * stagger + 's')
      if (typeof content === 'string') {
        inner.textContent = content
      } else {
        inner.appendChild(content)
      }
      mask.appendChild(inner)
      return mask
    }

    function buildWordReveal(el) {
      const nodes = Array.prototype.slice.call(el.childNodes)
      el.textContent = ''
      let i = 0
      nodes.forEach(function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/(\s+)/).forEach(function (token) {
            if (token === '') return
            if (/^\s+$/.test(token)) {
              el.appendChild(document.createTextNode(' '))
            } else {
              el.appendChild(makeWord(token, i++))
            }
          })
        } else if (node.nodeType === 1) {
          // Preserve line breaks as-is; don't wrap them in a mask.
          if (node.nodeName === 'BR') {
            el.appendChild(document.createElement('br'))
          } else {
            el.appendChild(makeWord(node, i++))
          }
        }
      })
    }

    const headings = scope.querySelectorAll(selector)

    // Snapshot the pristine children before wrapping. buildWordReveal is
    // NOT idempotent: it preserves ELEMENT children as whole word units
    // (so the italic accent keeps its styling), so running it twice on the
    // same DOM wraps the masks in masks. React's StrictMode invokes
    // effects twice against the SAME nodes in development, which produced
    // 6 masks instead of 3 on the Arch heading. Restoring on cleanup makes
    // the hook re-runnable. (Production mounts once, and a route remount
    // gets freshly rendered markup, so this only ever fires in dev — but a
    // hook that corrupts the DOM when re-run is a trap either way.)
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
      // Put the original children back so a re-run starts from clean markup.
      pristine.forEach(function (nodes, el) {
        el.textContent = ''
        nodes.forEach(function (n) {
          el.appendChild(n)
        })
        el.classList.remove('is-revealed')
      })
    }
  }, [scopeRef, selector, rootMargin, stagger])
}

export default useWordReveal
