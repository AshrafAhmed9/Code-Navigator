# Code Navigator

Every developer has joined a repository where they had no idea where to
start. Code Navigator reconstructs a repo's architecture, shows where
systems begin and end, identifies the safest places to make a change, and
reveals exactly what that change will affect — directly inside GitHub,
before you write a line of code. Think of it as a map for software
architecture, built into the browser.

Everything runs **client-side** — there is no backend and no hosting cost.
It fetches files via the GitHub API, builds a real dependency graph
in-memory, and optionally calls **your own** LLM API key directly from the
browser for natural-language explanations grounded in that graph. The
provider is auto-detected from the key itself (Anthropic, OpenAI, Groq, and
Gemini are recognized automatically — no dropdown to fill in), and any other
OpenAI-compatible endpoint (Together, Mistral, DeepSeek, OpenRouter, a local
Ollama/LM Studio server, etc.) works too via a one-time endpoint URL. Nothing
is ever proxied through a server this project runs.

> Best tried on a real, unfamiliar repo (e.g. `expressjs/express`), not a
> tiny one — the value is orienting you in a codebase too large to read file
> by file.

## Install

- **Chrome Web Store**: coming soon.
- **From source** (works today): see [Develop](#develop) below — clone,
  `npm install && npm run build`, then load `dist/` as an unpacked extension.

Your GitHub token and LLM key never leave your browser. See
[docs/privacy.md](docs/privacy.md).

### Why not just use Copilot / ChatGPT?

| | Copilot / ChatGPT | Code Navigator |
|---|---|---|
| Explains | One file, in isolation | The repo's actual architecture |
| Scope | Whatever's in the current context window | The whole dependency graph, computed once |
| Before you edit | Nothing — you find out what breaks after | Impact, risk tier, and affected tests, upfront |
| Grounding | Model's read of the code as text | A real graph the model narrates on top of, never invents |
| Cost model | Per-message | Free graph features; LLM narratives use your own key |

---

## What it does

### Understand a repo, fast
- **"Understand this repository" screen** (the Map tab) — the first thing
  you see: auto-detected **Core Systems** (Authentication, API, Database,
  Cache, Message Queue, Payments, Background Jobs, Config, Storage) each with
  a **High/Medium/Low confidence score and a visible reason** ("clustered in
  auth/, 3 keyword signals" vs. "scattered across the repo, single keyword
  match") — a keyword match is a guess, not a fact, and this says so rather
  than implying false certainty. Also shows entry points, the most
  depended-on files, and a language breakdown.
- **Guided Tours** — click "Learn Authentication" (or any Core System /
  entry point) and get an ordered reading list with time estimates: "Step 1
  of 6 · ~12 min," each step showing *why* it's there (which earlier file
  pulled it in), with mark-as-read checkboxes and a progress bar. Turns the
  import graph into a reading path instead of a pile of files.
- **⌘K / Ctrl+K command palette** — question-driven search ("Find
  Authentication," "Find Database," or free text), ranked by
  filename/exported-symbol match plus import centrality, with an optional
  LLM narrative explaining which result is the right starting point.
- **Architecture flow diagrams** — traces the import graph outward from any
  entry point or search result and renders it as an interactive mermaid
  flowchart: drag to pan, scroll to zoom, fit-to-viewport by default so
  nothing is ever cut off or absurdly oversized.

### Navigate like an IDE
- **File tree** (the default tab) — the full repo file/folder browser, live
  filter-as-you-type search, per-language color icons, VS-Code-style indent
  guides, smooth expand/collapse. **Collapsed by default** even on repos with
  many root folders, so opening it is never a long scroll before you see
  anything — a saved expansion state from a previous visit still takes
  precedence. A home icon jumps back to the repo's front page.
- **Bookmarks** — star any file, or bookmark the current page from the
  header on *any* GitHub page (file, issue, PR, repo root). Stored locally,
  grouped by repo.
- **Tree, Bookmarks, and Recent are usable immediately** — they only need the
  repo's file list, which is available the moment the tree loads, well
  before the (potentially much slower) dependency-graph indexing finishes.
  No need to wait through a blocking "Indexing…" screen just to browse files.
- Map / Tree / Bookmarks / Recent all render at the **same fixed panel
  size** — switching tabs never resizes the sidebar.

### Before you make a change
- **Safe Change Checklist** — the first thing you see on a file: an
  actionable checklist ("Read X," "Check N consumers," "Review impact
  across N areas," "Run N related tests") composed from data already on the
  page, with a risk-tier badge. Not another number to interpret — a list of
  what to actually do.
- **Per-file impact analysis** — referenced-by, imports, and the full
  transitive impact set **grouped by affected area**, not a raw count, with
  a LOW/MEDIUM/HIGH risk tier. Every file listed links to it on GitHub.
- **Related tests** — found via the import graph, not guessed from naming.
- **Real AST parsing** for the open file (JS/TS/TSX) — genuine
  function/class/call-site extraction via tree-sitter, shown as "Functions &
  classes · AST-parsed," distinct from the regex-based exported-symbol list.
  Confirmed working end-to-end; see [Known limitations](#known-limitations)
  for scope and [docs/tree-sitter.md](docs/tree-sitter.md) for the five
  platform restrictions this took to work around.
- **Criticality** — opt-in, one API call, combining graph fan-in with commit
  count and contributor count. Only fetched on click, cached, never
  automatic — see [API budget](#api-budget) below.
- **Grounded LLM narratives** (labeled "LLM-inferred," streamed live):
  **Purpose**, **Why is this here?** (distinct from Purpose — the *reason*
  this file is separate, not what it does), **What breaks if I change
  this?**, **What should I test?**. Each narrative is checked after the fact
  against the exact evidence it was given — if it cites a file path that
  wasn't part of that evidence, the badge switches to a visible "⚠ unverified
  reference" instead of presenting it with the same confidence as a grounded
  claim (`src/lib/grounding.ts`). A system prompt makes hallucination rare;
  it doesn't make it impossible, so this is a real check, not just an
  instruction.

### Reviewing a PR
- **PR review mode** — open any `github.com/owner/repo/pull/N` and the
  sidebar overlays impact analysis (affected count, risk tier, related test
  count) on every changed file, built against the PR's actual head commit.
- **"Explain this PR"** — a grounded LLM summary of what the PR does, which
  Core Systems it touches, overall risk, and a suggested review order —
  narrated over the same impact data above, not invented. Falls back to the
  deterministic changed-file list if no LLM key is configured.

### Coming back to a repo
- **Recent tab** — the files, PRs, and issues you've visited in this repo,
  most-recent-first, stored only in `chrome.storage.local` (zero API cost).
  Makes the sidebar useful every session, not just the first one.

### Customization
- **Follows GitHub's own theme**, live — no reload needed.
- **Pin sidebar** — floats by default; pin it to push GitHub's content over
  instead, becoming a permanent panel. Drag-resizable (340–880px).
- **Dock left or right**, from the header icon or Settings.
- **Monospace code font** option for file paths and code-ish text.
- **Settings gear icon** in the header opens the options page directly, at
  any time — not just via the first-run panel or a low-budget hint.
- **First-run panel** explains the trust model (keys never leave your
  browser) and prompts for a GitHub token *before* the unauthenticated
  60/hr limit is likely to bite, not only after. Shown once; suppressed
  automatically once a token or LLM key is configured.

---

## API budget
- **Zero-setup**: every feature above except the LLM narratives and the
  Find X narrative works fully keyless on public repos. A GitHub token (no
  scopes needed) raises the rate limit from 60 to 5,000 req/hr.
- **Live budget footer** — shows remaining GitHub calls at all times; turns
  visible/warning when low with a countdown to reset and an inline "add a
  token" link. Indexing stops calling the authenticated Contents API once
  exhausted instead of failing through every remaining file one by one
  (`src/lib/rateLimit.ts`).
- **Criticality is lazy and cached** (one call, on click) — deliberately not
  a repo-wide history crawl, which would burn the budget fast on a large
  repo.
- **Indexing goes through GitHub's GraphQL API when a token is configured**
  (`fetchManyFilesGraphQL` in `src/lib/github.ts`), batching ~80 file lookups
  into a single HTTP request via aliased queries instead of one REST request
  per file. Request count — not local concurrency — was always the real
  bottleneck for indexing large repos (pushing concurrency higher just risks
  GitHub's separate secondary abuse-detection limit); this cuts the request
  count for a 1,500-file repo from ~1,500 to ~19. Falls back to the REST
  concurrent pool if GraphQL comes back empty (e.g. a token scoped without
  GraphQL access). No token means no GraphQL at all (it has no anonymous
  tier), so the unauthenticated path still fetches one file per REST request.
- **The indexed-file cap reflects that.** 20,000 files with a token (a
  20,000-file repo is now ~250 GraphQL requests, not 20,000 — most real
  repos, including very large ones, are indexed in full), 1,500 without one.
  Past the cap, indexing prioritizes a subset (entry-point-shaped files, then
  shallower paths first) rather than trying to fetch everything regardless of
  cost. The Map view says plainly when this happened and how many files were
  covered.

---

## Architecture

### Why client-side only
No backend means: no hosting bill, nothing to keep online, and your GitHub
token / LLM key never leave your browser except to their own providers
(`api.github.com`, `raw.githubusercontent.com`, `api.anthropic.com`,
`api.openai.com`, `api.groq.com`, `generativelanguage.googleapis.com` — each
explicitly declared in `manifest.config.ts`'s `host_permissions`, which MV3
content scripts require for any cross-origin fetch to succeed at all; a
custom OpenAI-compatible endpoint requests its own permission at runtime,
scoped to just that host — see [Settings](#settings)). There's also
deliberately no distributed backend of any kind (job queue, message broker) —
this is one browser tab making HTTP calls to GitHub's REST/GraphQL API, not a
distributed system with independent producers/consumers to decouple. The
actual bottleneck for indexing speed was never local parallelism, it's
request COUNT against GitHub's rate limit; see point 3 below (GraphQL
batching) for the fix that actually addresses that. The tradeoff of no
backend at all: a browser tab can't parse thousands of files upfront on its
own compute, so the design leans on:

1. **Import-graph first, not full ASTs** for the whole repo (`src/lib/importExtract.ts`,
   regex-based) — cheap, works across languages without per-language
   grammars, less precise than AST-level analysis. Real AST parsing exists
   but is scoped to the single open file (see above).
   Each supported language resolves imports the way it actually writes them,
   not just JS/TS-style relative paths: Java's fully-qualified class names
   and Python's dotted absolute imports are suffix-matched against the real
   file tree (their source root, e.g. `src/main/java/`, is never the repo
   root); Go resolves full module-path imports via the module root declared
   in `go.mod`; Rust resolves `crate::`/`self::`/`super::` paths, including
   the case where the last path segment is an imported item rather than a
   file. External packages (npm, PyPI, Go/Rust stdlib, other modules) are
   correctly left unresolved in every case, not guessed. TS/JS bare
   specifiers also resolve against a root `tsconfig.json`/`jsconfig.json`'s
   `paths`/`baseUrl` when one exists (following one `extends` hop) — a path
   alias like `@/components/Foo` is a real in-repo edge, not an external
   package, and treating it as one (the previous behavior) understated a
   file's true impact on any project using aliases, which is most modern
   TS/Next.js codebases.
2. **Everything cached by commit SHA** (`src/lib/cache.ts`) — reopening a
   repo/file is instant; a new commit invalidates cleanly. The cache is also
   schema-versioned (`REPO_GRAPH_SCHEMA_VERSION` in `src/lib/types.ts`): a
   graph cached under an older shape is discarded and rebuilt rather than
   handed to current code as-is, which used to be able to crash on a missing
   field.
3. **Bounded, batched fetching** (`src/lib/github.ts`) — GraphQL-batched
   (~80 files/request) with a token, one-REST-request-per-file without one;
   capped at 20,000 (with a token) or 1,500 (without) indexed files on very
   large repos (see [API budget](#api-budget)).

### Reliability
The sidebar is expected to show up on every repo, every time — a few specific
failure modes are guarded against directly rather than hoped around:
- **Self-healing mount.** `src/content/main.tsx` doesn't just mount once on
  page load — it watches for the sidebar's host node ever disappearing (not
  only on navigation) and remounts it, with the entire mount/sync path
  wrapped so one unexpected error can't silently take the whole sidebar down
  for the rest of the page's life. A toolbar-icon click force-remounts it
  manually as a last resort.
- **An error boundary** (`src/content/ErrorBoundary.tsx`) around the
  graph-dependent views means a future rendering bug shows a "Retry" message
  scoped to that view instead of an uncaught error unmounting React's entire
  tree — which used to take the toggle button down with it, since it lives
  under the same root.
- **Progressive indexing.** The file list is available (and Tree/Bookmarks/
  Recent usable) the moment the repo tree is fetched — well before the
  slower per-file content indexing that builds the dependency graph
  finishes. The whole panel no longer blocks on the slowest step just to
  show the tabs that don't need it.
- **The zero-setup path is actually exercised.** `raw.githubusercontent.com`
  — the fetch path used for every file when no GitHub token is configured —
  is declared in `host_permissions`; without it, MV3 blocks the content
  script from fetching it at all, which would have silently broken indexing
  for exactly the keyless users this project is built to work for by
  default.
- **LLM calls use the token-limit parameter each provider actually
  accepts.** OpenAI's GPT-5/o1/o3 reject `max_tokens` outright and require
  `max_completion_tokens` instead (`src/lib/llm.ts` uses the latter, which
  is also accepted by GPT-4/4o).
- **Mermaid node sizing matches what actually renders.** `mermaid.initialize()`
  explicitly sets `fontFamily` to the same stack the shadow DOM renders
  labels with — without this, mermaid sizes each node's box using its own
  default font, and a genuine mismatch with the rendered font causes text to
  overflow past the node border.

### Priorities: quality over speed, always
Every claim (impact counts, "what breaks," search rankings) is **grounded in
the deterministic import graph first**; the LLM only narrates or ranks on
top of that evidence, never as the sole source of truth. A wrong-but-fast
answer is a bug, not a feature. This isn't just a prompt instruction — every
LLM narrative is checked after the fact against the exact evidence it was
given (`src/lib/grounding.ts`), and flagged visibly if it cites something
that wasn't part of that evidence, rather than presented with the same
confidence as a verified claim. A grounded prompt makes hallucination rare;
only a verification step catches the rare case where it happens anyway.

### Source layout
```
manifest.config.ts        MV3 manifest (CRXJS)
vite.config.ts

src/
  background/
    index.ts               Service worker — opens Settings on first install,
                            relays parse-symbols messages
    symbols.ts              Tree-sitter parsing (why it runs here: docs/tree-sitter.md)
    domShim.ts               Minimal document/window shim (see docs/tree-sitter.md)

  content/                Injected into github.com via a shadow-DOM root
    main.tsx              Mount point; self-healing remount on GitHub's Turbo
                           SPA navigation (turbo:load-based) and DOM churn
    Sidebar.tsx            Top-level UI state machine: repo indexing, tabs
                           (Map/Tree/Bookmarks/Recent), pin/dock/theme, routing
    ErrorBoundary.tsx       Contains a rendering crash to a "Retry" message
    OnboardingPanel.tsx      First-run trust/token panel
    FilePanel.tsx          Per-file: checklist, referenced-by, impact, tests
    PurposePanel.tsx        "Purpose" LLM narrative (fetches file source)
    NarrativePanel.tsx      Generic streaming LLM panel
    SymbolsPanel.tsx         AST-parsed functions/classes (relays to background)
    SafeChangeChecklist.tsx  Actionable checklist composed from existing data
    CriticalityPanel.tsx      Lazy commit/contributor rating
    TourView.tsx               Guided Tours modal
    FileTree.tsx                 IDE-style folder/file browser (collapsed by default)
    BookmarksPanel.tsx            Saved bookmarks list
    HistoryPanel.tsx                Recent-activity list
    CommandPalette.tsx             ⌘K search UI
    FlowView.tsx                    Mermaid architecture-flow modal (pan/zoom)
    PrPanel.tsx                      PR review mode + "Explain this PR"
    RateLimitFooter.tsx               Live GitHub API budget display
    styles.ts                          All CSS as a template string (shadow root)

  lib/                    No React — pure logic, all independently testable
    types.ts               Shared types (RepoGraph, FileNode, Settings, ...);
                            REPO_GRAPH_SCHEMA_VERSION for cache invalidation
    github.ts               GitHub REST API client (tree, blobs, PR files, criticality)
    githubTheme.ts           Reads/watches GitHub's light/dark theme
    rateLimit.ts              Tracks X-RateLimit-* headers, exposes budget state
    cache.ts                   IndexedDB graph cache, keyed by commit SHA + schema version
    settings.ts                 chrome.storage.local wrapper for Settings
    openOptions.ts                Opens the options page via the background worker
                                   (chrome.runtime.openOptionsPage only works there,
                                   not from a content script)
    language.ts                  Extension → language map, test-file heuristic
    importExtract.ts              Regex import/export extraction per language
    graphBuilder.ts                 Import graph; impact analysis; related-tests;
                                     entry-point detection; skeleton graph for
                                     progressive indexing; large-repo indexing cap
    systems.ts                       Keyword-based Core Systems detection + confidence
    tour.ts                           Guided Tours ordering (reuses flow.ts's BFS)
    find.ts                            Find X heuristic ranking
    flow.ts                             BFS trace + mermaid diagram generation
    tree.ts                             Flat paths → nested folder/file tree
    bookmarks.ts                         Bookmark storage + URL classification
    history.ts                            Recent-activity storage (same pattern)
    symbols.ts                            Content-script relay to background parsing
    llm.ts                                 Provider-agnostic streaming LLM client
    prompts.ts                              All grounded LLM prompt templates,
                                             including "Explain this PR"

src/options/               Settings page (PAT, LLM key, dock side, font)
```

### Tech stack
TypeScript, React 19, Vite + `@crxjs/vite-plugin` (MV3 bundling), `idb`
(IndexedDB wrapper), `mermaid` (lazy-loaded), `web-tree-sitter` (pinned to
0.25.x — see [docs/tree-sitter.md](docs/tree-sitter.md)).

---

## Performance notes
- **Mermaid is lazy-loaded.** The full package bundles every diagram type we
  don't use (~2MB); dynamically `import()`-ed only when a flow view opens,
  so the always-shipped content-script bundle stays small.
- **Shadow DOM isolation.** The whole UI renders inside a shadow root, so
  its styles can never leak into or be clobbered by GitHub's own CSS.
- **SPA-aware remounting.** GitHub navigates via Turbo without full page
  loads, which can swap the DOM and update the URL in either order — a naive
  "diff the URL on every DOM mutation" approach can miss navigations where
  the swap happens before the URL settles. `src/content/main.tsx` listens
  for Turbo's own `turbo:load` event plus `popstate`, with a
  `MutationObserver` as a defensive fallback, funneled through one
  idempotent `sync()`.

## Privacy
- No telemetry, no analytics — nothing sent anywhere except GitHub's own API
  and, only if configured, your chosen LLM provider's API.
- GitHub token and LLM key live in `chrome.storage.local` — local to your
  browser profile, never synced anywhere this project controls (there isn't
  a server to control).
- Bookmarks, recent activity, and tree-expansion state stored locally the
  same way.
- Full policy: [docs/privacy.md](docs/privacy.md).

---

## Known limitations
- **Real AST parsing is scoped to one open file, JS/TS/TSX only** — not yet
  a repo-wide, cross-file call graph (needs cross-file symbol resolution,
  substantially harder than single-file parsing — deliberately not
  attempted yet). File-level impact analysis runs on the regex import graph
  everywhere else. Full engineering story, including five real platform
  restrictions this surfaced: [docs/tree-sitter.md](docs/tree-sitter.md).
- **Flow diagrams trace imports, not execution** — the *import* graph
  outward from a node, not a real request/execution lifecycle. That needs
  call-graph resolution across framework layers.
- **Core Systems detection is keyword-heuristic**, not semantic — hence the
  visible confidence score, which can (and should) read Low when the
  evidence is thin.
- **No full-text code search** — Find X matches paths and exported symbol
  names, not arbitrary code content.
- **Private repos** work with a PAT that has the `repo` scope, but there's
  no OAuth sign-in flow — you manage the token yourself.
- **Not supported**: GitHub Enterprise (hardcoded to `api.github.com`),
  multiple simultaneous accounts, no paid tier — everything here is free by
  design.
- **Very large repos (1,500+ code files) get a prioritized subset indexed**,
  not the full repo — see [API budget](#api-budget). The file tree, search,
  bookmarks, and recent activity are unaffected; only the dependency graph
  and impact analysis are scoped to the indexed subset.
- **Language-specific import resolution has known edge cases**: a Rust `mod`
  block declared inline in code (rather than as its own file) has no
  filesystem counterpart to resolve to; Go resolution needs a root `go.mod`
  (a multi-module workspace or non-standard layout falls back to
  unresolved); an ambiguous absolute import (ties between multiple
  same-named files) intentionally resolves to nothing rather than guessing
  wrong.

---

## Develop

```bash
npm install
npm run dev      # Vite dev server with HMR for the extension
npm run build    # production build to dist/
npm run lint     # oxlint
```

Load `dist/` as an unpacked extension: `chrome://extensions` → enable
Developer mode → **Load unpacked** → select `dist/`.

## Settings

Open the extension's options page (auto-opens on first install, or via
`chrome://extensions` → Details → Extension options):

| Setting | Effect | Required? |
|---|---|---|
| GitHub Personal Access Token | Raises the GitHub API rate limit from 60 to 5,000 req/hr; needed for private repos (`repo` scope) | No |
| LLM API Key (provider auto-detected) | Unlocks Purpose, Why Is This Here, What Breaks, What Should I Test, Explain This PR, and the Find X narrative | No |
| Sidebar dock position | Left or right edge | No (defaults right) |
| Code font | System font or monospace | No (defaults system) |

Every graph-based feature — Core Systems, Guided Tours, file tree, impact
analysis, checklist, flow diagrams, bookmarks, PR review — works with
**zero configuration**.
