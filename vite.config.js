import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Vanilla multi-page build. index.html + press.html.
// Libraries (gsap/lenis/ogl) are dynamically imported at runtime so they land
// in their own chunks and never block first paint.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: true,
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        press: resolve(__dirname, 'press.html')
      }
    }
  }
});
