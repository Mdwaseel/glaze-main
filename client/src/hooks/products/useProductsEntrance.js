import { useLayoutEffect } from 'react'
import { gsap, ScrollTrigger } from '@/utils/gsap'
import { prefersReducedMotion } from '@/utils/motion'
import { whenRevealed } from '@/utils/reveal'
import { countTo } from '@/utils/glz'

/**
 * Products — the entrance choreography.
 *
 * Port of the reveal script in products/sliding.html (lines 3452-3584):
 * word curtains, stagger groups, generic fade-ups, the scroll-triggered
 * counters, the clip reveals on the picture-led sections, the hero
 * parallax, the eyebrow rules and the divider rules — one script over the
 * whole page, exactly as authored.
 *
 * ⚠ THE DEFAULT CSS IS THE FINISHED STATE. Nothing here is required for
 * the page to read: with reduced motion the hook returns immediately and
 * every headline, chip and figure is already in its final position. The
 * `wc--armed` / `rule--armed` classes that hide things are added by this
 * code and only when it is going to animate them — the original's own
 * comment says so, and it is why `curtain()` may safely rewrite the DOM.
 *
 * ⚠ THE CURTAIN REWRITES TEXT NODES. `curtain()` walks each `[data-curtain]`
 * heading and replaces every text node with per-word masks. React rendered
 * those nodes and does not know they were replaced — which is safe here for
 * the same reason it is safe on the About and Contact word-reveals: the
 * headings are static, nothing re-renders them while the page is mounted,
 * and the whole subtree is discarded on unmount. `gsap.context` reverts the
 * tweens; the injected spans go with the section.
 *
 * ⚠ LAYOUT effect, and the section components' own controllers run BEFORE
 * it (React flushes a child's layout effect before its parent's). That is
 * the original's order too: this script is the fourth of thirteen and the
 * section scripts that change layout — the series accordion, which opens
 * its first card — run after it but re-measure through
 * `ScrollTrigger.refresh()`.
 */
export function useProductsEntrance() {
  useLayoutEffect(() => {
    if (prefersReducedMotion()) return      /* default CSS is the finished state */

    /* Wrap every word in its own mask. Only text nodes are touched,
       so <em> and <span class="accent"> survive intact. */
    function curtain(root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
      const nodes = []
      let n
      while ((n = walker.nextNode())) { if (n.nodeValue.trim()) nodes.push(n) }

      nodes.forEach(function (node) {
        const frag = document.createDocumentFragment()
        node.nodeValue.split(/(\s+)/).forEach(function (chunk) {
          if (!chunk) return
          if (!chunk.trim()) { frag.appendChild(document.createTextNode(chunk)); return }
          const mask = document.createElement('span')
          mask.className = 'wc__w'
          const inner = document.createElement('span')
          inner.className = 'wc__i'
          inner.textContent = chunk
          mask.appendChild(inner)
          frag.appendChild(mask)
        })
        node.parentNode.replaceChild(frag, node)
      })

      root.classList.add('wc--armed')
      return root.querySelectorAll('.wc__i')
    }

    /* ⚠ WRAPPED, and not in the original. The hero's title curtain and
       the `.shero__media` parallax are built at mount and the title is
       already in view, so `start: 'top 88%'` fires immediately — which
       now means underneath the preloader. `whenRevealed` holds the whole
       context until the loader announces; on every visit where the loader
       does not run (the common case) it fires synchronously and the
       timing is unchanged. See utils/reveal.js. */
    return whenRevealed(() => {
      const ctx = gsap.context(() => {
        document.querySelectorAll('[data-curtain]').forEach(function (el) {
          const words = curtain(el)
          /* The armed class hides the words before GSAP is ready, but GSAP
             reads that CSS translate into its cached pixel `y`. Writing
             y: 0 alongside yPercent moves the whole offset into the
             percentage channel the tween actually animates — otherwise the
             words land a full line-height low. */
          gsap.set(words, { yPercent: 110, y: 0 })
          gsap.to(words, {
            yPercent: 0,
            duration: 1.15,
            ease: 'power4.out',
            stagger: 0.055,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          })
        })

        document.querySelectorAll('[data-stagger]').forEach(function (group) {
          gsap.from(group.children, {
            y: 34,
            autoAlpha: 0,
            duration: 0.95,
            ease: 'power3.out',
            stagger: 0.07,
            scrollTrigger: { trigger: group, start: 'top 86%', once: true },
          })
        })

        /* Generic fade-up for standalone blocks. */
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
          gsap.from(el, {
            y: 30, autoAlpha: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          })
        })

        /* Counters run once, when their number is actually on screen. */
        document.querySelectorAll('[data-countup]').forEach(function (el) {
          ScrollTrigger.create({
            trigger: el, start: 'top 92%', once: true,
            onEnter: function () {
              countTo(el, el.dataset.to, parseInt(el.dataset.dec, 10) || 0)
            },
          })
        })

        /* Clip reveals on the picture-led sections. */
        gsap.utils.toArray('.ser__shot img, .hw__cell img, .fin__stage')
          .forEach(function (el) {
            gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, {
              clipPath: 'inset(0 0 0% 0)',
              duration: 1.2,
              ease: 'power3.inOut',
              scrollTrigger: { trigger: el, start: 'top 92%', once: true },
            })
          })

        /* Hero media drifts slower than the page — the type separates
           from the footage as you leave the fold. */
        const heroMedia = document.querySelector('.shero__media')
        if (heroMedia) {
          gsap.to(heroMedia, {
            yPercent: 14,
            ease: 'none',
            scrollTrigger: {
              trigger: '.shero', start: 'top top', end: 'bottom top', scrub: true,
            },
          })
        }

        /* The section eyebrows and their leading rules are gone from the
           Products markup, so the tween that drew those rules in went with
           them. `[data-rule]` below is a different thing — the standalone
           divider rules — and still runs. */
        document.querySelectorAll('[data-rule]').forEach(function (rule) {
          rule.classList.add('rule--armed')
          gsap.fromTo(rule, { scaleX: 0 }, {
            scaleX: 1,
            duration: 1.3,
            ease: 'power3.inOut',
            scrollTrigger: { trigger: rule, start: 'top 92%', once: true },
          })
        })

        /* Editorial copy blocks that are not part of a stagger group. */
        gsap.utils.toArray('.ovw__body, .ser__note, .ptn__note, .fin__lede, .gls__lede')
          .forEach(function (el) {
            gsap.from(el, {
              y: 26, autoAlpha: 0, duration: 1, ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            })
          })
      })

      return () => ctx.revert()
    })
  }, [])
}

export default useProductsEntrance
