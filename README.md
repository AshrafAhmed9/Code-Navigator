# Code Navigator

Every developer has joined a repository where they had no idea where to
start. Code Navigator reconstructs a repo's architecture, shows where
systems begin and end, identifies the safest places to make a change, and
reveals exactly what that change will affect — directly inside GitHub,
before you write a line of code. Think of it as a map for software
architecture, built into the browser.

Everything runs **client-side** — there is no backend and no hosting cost.
It fetches files via the GitHub API, builds a real dependency graph
in-memory, and optionally calls **your own** LLM API key (Anthropic or
OpenAI) directly from the browser for natural-language explanations grounded
in that graph. Nothing is ever proxied through a server this project runs.

> Best tried on a real, unfamiliar repo (e.g. `expressjs/express`), not a
> tiny one — the value is orienting you in a codebase too large to read file
> by file.

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
  guides, smooth expand/collapse. A home icon jumps back to the repo's front
  page.
- **Bookmarks** — star any file, or bookmark the current page from the
  header on *any* GitHub page (file, issue, PR, repo root). Stored locally,
  grouped by repo.
- Map / Tree / Bookmarks all render at the **same fixed panel size** —
  switching tabs never resizes the sidebar.

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
  this?**, **What should I test?**.

### Reviewing a PR
- **PR review mode** — open any `github.com/owner/repo/pull/N` and the
  sidebar overlays impact analysis (affected count, risk tier, related test
  count) on every changed file, built against the PR's actual head commit.

### Customization
- **Follows GitHub's own theme**, live — no reload needed.
- **Pin sidebar** — floats by default; pin it to push GitHub's content over
  instead, becoming a permanent panel. Drag-resizable (340–880px).
- **Dock left or right**, from the header icon or Settings.
- **Monospace code font** option for file paths and code-ish text.

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

---

## Architecture

### Why client-side only
No backend means: no hosting bill, nothing to keep online, and your GitHub
token / LLM key never leave your browser except to their own providers
(`api.github.com`, `api.anthropic.com`, `api.openai.com`). The tradeoff: a
browser tab can't parse thousands of files upfront, so the design leans on:

1. **Import-graph first, not full ASTs** for the whole repo (`src/lib/importExtract.ts`,
   regex-based) — cheap, works across languages without per-language
   grammars, less precise than AST-level analysis. Real AST parsing exists
   but is scoped to the single open file (see above).
2. **Everything cached by commit SHA** (`src/lib/cache.ts`) — reopening a
   repo/file is instant; a new commit invalidates cleanly.
3. **Bounded, batched fetching** (`src/lib/github.ts`) — concurrency-pooled
   (8 in flight), Contents API or raw.githubusercontent.com depending on
   whether a token is set.

### Priorities: quality over speed, always
Every claim (impact counts, "what breaks," search rankings) is **grounded in
the deterministic import graph first**; the LLM only narrates or ranks on
top of that evidence, never as the sole source of truth. A wrong-but-fast
answer is a bug, not a feature.

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
    main.tsx              Mount point; detects repo pages, remounts on
                           GitHub's Turbo SPA navigation (turbo:load-based)
    Sidebar.tsx            Top-level UI state machine: repo indexing, tabs
                           (Map/Tree/Bookmarks), pin/dock/theme, view routing
    FilePanel.tsx          Per-file: checklist, referenced-by, impact, tests
    PurposePanel.tsx        "Purpose" LLM narrative (fetches file source)
    NarrativePanel.tsx      Generic streaming LLM panel
    SymbolsPanel.tsx         AST-parsed functions/classes (relays to background)
    SafeChangeChecklist.tsx  Actionable checklist composed from existing data
    CriticalityPanel.tsx      Lazy commit/contributor rating
    TourView.tsx               Guided Tours modal
    FileTree.tsx                 IDE-style folder/file browser
    BookmarksPanel.tsx            Saved bookmarks list
    CommandPalette.tsx             ⌘K search UI
    FlowView.tsx                    Mermaid architecture-flow modal (pan/zoom)
    PrPanel.tsx                      PR review mode
    RateLimitFooter.tsx               Live GitHub API budget display
    styles.ts                          All CSS as a template string (shadow root)

  lib/                    No React — pure logic, all independently testable
    types.ts               Shared types (RepoGraph, FileNode, Settings, ...)
    github.ts               GitHub REST API client (tree, blobs, PR files, criticality)
    githubTheme.ts           Reads/watches GitHub's light/dark theme
    rateLimit.ts              Tracks X-RateLimit-* headers, exposes budget state
    cache.ts                   IndexedDB graph cache, keyed by commit SHA
    settings.ts                 chrome.storage.local wrapper for Settings
    language.ts                  Extension → language map, test-file heuristic
    importExtract.ts              Regex import/export extraction per language
    graphBuilder.ts                 Import graph; impact analysis; related-tests;
                                     entry-point detection
    systems.ts                       Keyword-based Core Systems detection + confidence
    tour.ts                           Guided Tours ordering (reuses flow.ts's BFS)
    find.ts                            Find X heuristic ranking
    flow.ts                             BFS trace + mermaid diagram generation
    tree.ts                             Flat paths → nested folder/file tree
    bookmarks.ts                         Bookmark storage + URL classification
    symbols.ts                            Content-script relay to background parsing
    llm.ts                                 Provider-agnostic streaming LLM client
    prompts.ts                              All grounded LLM prompt templates

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
- Bookmarks and tree-expansion state stored locally the same way.

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
| LLM Provider + API Key + Model | Unlocks Purpose, Why Is This Here, What Breaks, What Should I Test, and the Find X narrative | No |
| Sidebar dock position | Left or right edge | No (defaults right) |
| Code font | System font or monospace | No (defaults system) |

Every graph-based feature — Core Systems, Guided Tours, file tree, impact
analysis, checklist, flow diagrams, bookmarks, PR review — works with
**zero configuration**.
