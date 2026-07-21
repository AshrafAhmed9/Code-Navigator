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
      // Fetched from inside a Web Worker (src/content/parser.worker.ts), which
      // is not extension-privileged the way the content script's main thread
      // is — the worker can't call chrome.runtime.getURL itself, and its
      // fetch() of a chrome-extension:// URL needs this declaration.
      resources: ['wasm/*.wasm'],
      matches: ['https://github.com/*'],
    },
    {
      // The worker's own bundled JS chunk (parser.worker-<hash>.js) must also
      // be web-accessible for `new Worker(chrome-extension://.../...)` to be
      // allowed to load it from the content script. CRXJS auto-detects and
      // declares chunks reachable via dynamic import() (e.g. mermaid's), but
      // not chunks only reachable via `new Worker(new URL(...))` — so this
      // has to be declared explicitly, as a wildcard since the hash changes
      // every build.
      resources: ['assets/*.js'],
      matches: ['https://github.com/*'],
    },
  ],
})
