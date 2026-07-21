import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
  build: {
    // Vite wraps dynamic import() with a "modulepreload" polyfill that injects
    // <link> tags into `document` for browser-page loading performance. The
    // background service worker (src/background/symbols.ts, which dynamically
    // imports 'web-tree-sitter') has no DOM at all, so this polyfill throws
    // "ReferenceError: document is not defined" the moment it runs there —
    // confirmed via the actual stack trace, not a guess. It's also not useful
    // in an extension bundle regardless of context, so disabling it outright.
    modulePreload: false,
  },
})
