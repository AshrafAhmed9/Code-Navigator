import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Code Navigator — Understand any repo in 15 minutes',
  version: pkg.version,
  description:
    'Navigate, understand, and safely change any GitHub repo. Dependency graphs, impact analysis, and architecture tours — right inside github.com.',
  icons: {
    16: 'public/icon16.png',
    48: 'public/icon48.png',
    128: 'public/icon128.png',
  },
  action: {
    default_title: 'Code Navigator',
  },
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  // MV3's default extension CSP doesn't include 'wasm-unsafe-eval', which
  // WebAssembly.compile/instantiate requires regardless of where the bytes
  // came from — the background service worker (src/background/symbols.ts)
  // compiles tree-sitter's wasm grammars, so this has to be added explicitly.
  // NOTE: 'unsafe-eval' was tried too (for a stray eval() call in
  // web-tree-sitter's compiled Emscripten output) but Chrome hard-rejects it
  // for MV3 extension_pages CSP at manifest-load time — "Insecure CSP value"
  // — unlike 'wasm-unsafe-eval', it's not something an extension is allowed
  // to grant itself at all, full stop. Betting that the actual eval() call
  // sits behind a Node.js-only branch (typeof require !== 'undefined' or
  // similar) that never executes in a browser — if wrong, the resulting
  // error will be a distinct eval-specific CSP violation, not the vaguer
  // wasm CompileError, so it'll be diagnosable either way.
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },
  content_scripts: [
    {
      matches: ['https://github.com/*'],
      js: ['src/content/main.tsx'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'unlimitedStorage'],
  host_permissions: [
    'https://api.github.com/*',
    'https://api.anthropic.com/*',
    'https://api.openai.com/*',
  ],
  web_accessible_resources: [
    {
      // Tree-sitter grammar files. Fetched by the background service worker
      // now (src/background/symbols.ts), which has full extension privileges
      // and doesn't strictly need this declaration for its own resources —
      // left in place defensively since it's zero-cost and this exact area
      // has already produced more than one wrong assumption this session.
      resources: ['wasm/*.wasm'],
      matches: ['https://github.com/*'],
    },
  ],
})
