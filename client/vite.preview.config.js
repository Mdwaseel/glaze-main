import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * Parity-testing build only — NOT part of the app.
 *
 * Emits the app into the static site's own folder under /react-preview/
 * so the React version and hero.html can be measured side by side from
 * the same origin (identical browser zoom, DPR and viewport). Public
 * assets are not copied: /frames, /images, /videos already exist at that
 * server root, which is exactly what the app requests.
 */
export default defineConfig({
  base: '/react-preview/',
  // Opens window.gsap / window.ScrollTrigger so the harness can diff
  // timeline and trigger configuration against hero.html, which has them
  // as CDN globals. Never set for the real build.
  define: { 'import.meta.env.VITE_EXPOSE_GSAP': 'true' },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL('../react-preview', import.meta.url)),
    emptyOutDir: true,
    copyPublicDir: false,
    cssMinify: 'esbuild',
  },
})
