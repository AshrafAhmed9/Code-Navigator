# Engineering notes: getting tree-sitter running in an MV3 extension

Real AST parsing (confirmed working end-to-end in a real Chrome install) is
scoped to **one open file at a time, JS/TS/TSX only**. `src/background/symbols.ts`
runs actual tree-sitter parsing for whichever file you have open, extracting
real functions/classes/call-sites — shown in FilePanel as "Functions & classes
· AST-parsed."

This is **not** yet a repo-wide, cross-file call graph, which needs cross-file
symbol resolution (imported names resolved to their exporting file's
definitions) — a substantially harder correctness problem than single-file
parsing, and deliberately not attempted yet. File-level impact analysis still
runs on the regex import graph everywhere else. Other languages have no AST
support and fall back to regex only, silently and without error.

## Why parsing runs in the background service worker, not the content script

Getting this working surfaced five independent platform walls, each real and
confirmed via actual browser errors, not assumptions. Documented in detail
here — not trimmed for brevity in the main README — because these failure
modes are non-obvious and this is exactly the kind of thing that could
silently break again on a future dependency bump. If it does, start here
instead of rediscovering all five from scratch.

1. **github.com's page CSP blocks `Worker` creation outright** (`worker-src`
   allow-lists only GitHub's own asset domains) — including the blob-URL
   workaround, which is also just a Worker under the hood. Confirmed via:
   ```
   Creating a worker from 'blob:https://github.com/...' violates the
   following Content Security Policy directive: "worker-src
   github.githubassets.com github.com/assets-cdn/worker/ ...". The action
   has been blocked.
   ```

2. **Moving to the background service worker, its default CSP still blocked
   WebAssembly compilation** (`script-src` without `wasm-unsafe-eval`) —
   relaxed in `manifest.config.ts`. This is *our own* extension's CSP, which
   we're allowed to configure, unlike GitHub's page CSP. Confirmed via:
   ```
   failed to asynchronously prepare wasm: CompileError:
   WebAssembly.instantiate():
   ```
   (Chrome gives an unhelpfully vague message for CSP-blocked wasm
   compilation, unlike the clear violation message for #1.)

3. **Vite's dynamic-`import()` wrapper assumes a DOM exists** — it injects
   `<link rel=modulepreload>` tags for browser loading performance, which is
   meaningless in a service worker (no DOM at all). Threw
   `document is not defined`, then after a first fix, `window is not defined`
   (the wrapper's error-dispatch path calls `window.dispatchEvent`). Worked
   around with a minimal shim in `src/background/domShim.ts` — `document`
   stubbed to no-ops, `window` aliased to `self` (a service worker's `self`
   is a real `EventTarget`, so `dispatchEvent` stays functionally correct
   rather than becoming another silent no-op).
   `build.modulePreload: false` in `vite.config.ts` was tried first but
   doesn't take effect for this project's Rolldown-based Vite build — left in
   as documentation of intent, but the shim is what actually fixes it.

4. **Dynamic `import()` itself is banned inside a running
   `ServiceWorkerGlobalScope`** by the HTML spec
   ([w3c/ServiceWorker#1356](https://github.com/w3c/ServiceWorker/issues/1356)).
   Confirmed via:
   ```
   TypeError: import() is disallowed on ServiceWorkerGlobalScope by the
   HTML specification.
   ```
   Fixed by switching `src/background/symbols.ts` to a static top-level
   `import`, which service workers do support (and which our
   `"type": "module"` background declaration already enables) — resolved
   during initial module evaluation, before the "already running" timing
   restriction applies. Tradeoff: `web-tree-sitter`'s JS now loads into
   memory whenever the background script starts, not lazily only when a file
   is actually parsed.

5. **`web-tree-sitter@0.26.x` changed its WASM linking format** in a way
   that's incompatible with grammar files built by `tree-sitter-cli@0.20.x`
   — which is what the `tree-sitter-wasms` npm package (our source for the
   `.wasm` grammar files) uses. Confirmed via:
   ```
   Error: need dylink section
       at getDylinkMetadata ...
       at Language.load ...
   ```
   Matches a documented upstream issue:
   [tree-sitter/tree-sitter#5171](https://github.com/tree-sitter/tree-sitter/issues/5171).
   Fixed by pinning `web-tree-sitter` to `^0.25.10` in `package.json`, which
   still speaks the older linking format. The caret range correctly locks to
   the 0.25.x line for future installs (npm treats the minor version as the
   breaking boundary for 0.x packages), so it won't silently drift back to
   an incompatible 0.26+.

## The message flow today

The content script (`src/content/SymbolsPanel.tsx` via `src/lib/symbols.ts`)
sends the file's already-fetched source to the background via
`chrome.runtime.sendMessage({ type: 'parse-symbols', ... })` and awaits the
parsed result. Any failure anywhere in this chain — unsupported language,
wasm load error, parse error — resolves to `null` on the content-script side
rather than throwing, so a parsing failure can never break anything else in
the extension; the "Functions & classes" section just doesn't appear.
