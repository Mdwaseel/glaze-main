import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Vite 8 minifies CSS with Lightning CSS by default, which rewrites
    // declarations against its browser targets. On this stylesheet it
    // collapsed
    //     backdrop-filter: blur(14px) saturate(120%);
    //     -webkit-backdrop-filter: blur(14px) saturate(120%);
    // down to the -webkit- form alone — fine in Chrome/Safari, but it
    // silently drops the frosted-glass effect on the hero eyebrow and
    // secondary button in Firefox, which supports the unprefixed
    // property only. esbuild does not rewrite vendor prefixes, so the
    // CSS ships exactly as it was authored on the static site.
    cssMinify: 'esbuild',

    // The public pages are eagerly imported on purpose (see App.jsx), so the
    // entry chunk necessarily carries the runtime libraries every visitor
    // needs. Left as one file that was ~656 KB and tripped the 500 KB warning.
    //
    // Splitting the heavy, rarely-changing vendors into their own chunks does
    // two things: it drops the entry below the warning threshold, and it lets
    // React, GSAP and the router cache independently — a content or page edit
    // reships only the small app chunk, not 200 KB of framework the browser
    // already holds. Rolldown (Vite 8's bundler) drives this through
    // advancedChunks groups rather than the old manualChunks function.
    rolldownOptions: {
      // Rolldown warns when one plugin dominates build time. Here it always
      // will: this is a CSS-heavy migration — ~380 KB across 45 hand-written
      // stylesheets against ~300 KB of app JS — so vite:css, the Tailwind
      // generator and vite:css-post together account for ~95% of plugin time
      // no matter what. The split is a property of the project, not a
      // misconfiguration, and the numbers are percentages of plugin time, not
      // of a slow build (~6s total). Verified: switching the CSS pipeline to
      // Lightning CSS end to end (css.transformer) moved the ratio by one
      // point and made the build slower, so there is nothing to tune — the
      // warning is only noise on every build.
      checks: { pluginTimings: false },

      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'router', test: /node_modules[\\/]react-router/ },
            { name: 'gsap', test: /node_modules[\\/](gsap|@gsap)[\\/]/ },
          ],
        },
      },
    },
  },
  // public/ mirrors the original site root 1:1 (frames/, images/, videos/,
  // logos/, Glaze Logo Transparent.png) so every path from the static HTML
  // resolves unchanged as an absolute URL — e.g. frames/hero/hero_000.webp
  // becomes /frames/hero/hero_000.webp. Frame sequences are NEVER imported
  // through the bundler; they are fetched at runtime from these paths.
})
