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
  // 'unsafe-eval' is also needed: 'wasm-unsafe-eval' only covers WebAssembly
  // compilation, not the plain eval() calls that show up in web-tree-sitter's
  // own compiled (Emscripten) output regardless of where it runs. This is
  // *our own* extension's CSP, which we're allowed to relax for our own
  // extension-privileged contexts — unlike github.com's page CSP, which we
  // can't touch and which is the whole reason parsing had to move here.
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'; object-src 'self';",
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
