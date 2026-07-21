/**
 * Vite wraps dynamic import() with a "modulepreload" helper that injects
 * <link> tags into `document` for browser-page loading performance —
 * harmless on a real page, but the background service worker has no DOM at
 * all, so it throws "ReferenceError: document is not defined" the moment a
 * dynamic import (e.g. `import('web-tree-sitter')` in ./symbols.ts) has any
 * chunk/asset to preload. Confirmed via the actual stack trace, not a guess.
 *
 * `build.modulePreload: false` in vite.config.ts was tried first but doesn't
 * take effect for this project's Rolldown-based Vite build — the helper
 * chunk is still emitted and wired in regardless. Rather than keep fighting
 * bundler config, this stubs just enough of `document` to make the preload
 * helper's calls no-ops: it has zero functional purpose in a service worker
 * (dynamic import() itself works fine without the preload hints; they're
 * purely a browser resource-hint optimization), so neutralizing it is safe
 * and doesn't mask anything real.
 *
 * Must be imported before anything that might trigger a dynamic import.
 */
if (typeof document === 'undefined') {
  ;(globalThis as unknown as { document: unknown }).document = {
    createElement: () => ({ setAttribute() {}, remove() {} }),
    getElementsByTagName: () => [],
    querySelector: () => null,
    head: { appendChild: () => {} },
  }
}
