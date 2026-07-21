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
      // Tree-sitter grammar files, fetched directly from the content script's
      // main thread (see src/lib/symbols.ts — github.com's own CSP blocks
      // worker-src entirely, so this can't run in a Worker; see that file's
      // top comment for the full story). Declared explicitly rather than
      // relying on the content script's extension privileges, since that
      // assumption already burned us once this session on Worker construction.
      resources: ['wasm/*.wasm'],
      matches: ['https://github.com/*'],
    },
  ],
})
