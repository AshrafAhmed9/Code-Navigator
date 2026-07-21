# Code Navigator

A Chrome extension that overlays github.com and answers the architecture
questions you actually have when dropped into an unfamiliar repo: *Where does
this start? Who depends on this? What breaks if I change it? What should I
test?* — plus IDE-style navigation (file tree, bookmarks) so it also works
as a daily GitHub browsing tool, not just a one-time "understand this repo"
pass.

Everything runs **client-side, in the browser** — there is no backend and no
hosting cost. It fetches files via the GitHub API, builds a real dependency
graph in-memory, and optionally calls **your own** LLM API key (Anthropic or
OpenAI) directly from the browser for natural-language explanations grounded
in that graph. Nothing is ever proxied through a server this project runs.

> Best tried on a real, unfamiliar repo (e.g. `expressjs/express`), not a
> tiny one — the value is orienting you in a codebase too large to read file
> by file.

---

## What it does

### Understand a repo fast
- **"Understand this repository" screen** (Map tab) — the first thing you see
  on any repo: auto-detected **Core Systems** (Authentication, API, Database,
  Cache, Message Queue, Payments, Background Jobs, Config, Storage), entry
  points, the most depended-on files, and a language breakdown. Not a flat
  file list — grouped by what the code *is*, not just where it lives.
- **⌘K / Ctrl+K command palette** — question-driven search ("Find
  Authentication," "Find Database," or free text). Results are ranked by
  filename/exported-symbol match plus import centrality (how many other files
  depend on it), with an optional LLM narrative explaining which result is
  the right starting point.
- **Architecture flow diagrams** — traces the import graph outward from any
  entry point or search result (bounded to ~18 nodes / 4 levels deep so it
  stays readable) and renders it as an interactive mermaid flowchart: drag to
  pan, scroll to zoom, a Fit button to reset. Opens at 50% zoom by default.

### Make a safe change
- **Per-file impact analysis** — referenced-by, imports, and the full
  transitive impact set **grouped by affected area** (directory), not just a
  raw count, with a LOW/MEDIUM/HIGH risk tier. Every file listed links
  straight to it on GitHub.
- **Related tests** — test files that import the changed file or anything in
  its impact set, found via the import graph (not guessed by naming
  convention alone).
- **Grounded LLM narratives** (each visually labeled "LLM-inferred" so
  they're never confused with deterministic graph facts, and streamed live
  token-by-token):
  - **Purpose** — what a file is responsible for.
  - **What breaks if I change this?** — grouped by affected area.
  - **What should I test?** — cites real test files from the graph, or says
    plainly when none were found rather than inventing test names.
- **PR review mode** — open any `github.com/owner/repo/pull/N` and the
  sidebar overlays impact analysis (affected file count, risk tier, related
  test count) on every changed file in the PR, built against the PR's actual
  head commit.

### Navigate like an IDE
- **File tree** — the full repo file/folder browser (every file, not just
  ones the import graph indexed), with live filter-as-you-type search that
  auto-expands matching branches, per-language color-coded icons, smooth
  expand/collapse animation, and VS-Code-style indent guide lines. Top-level
  folders auto-expand on first open.
- **Bookmarks** — star any file from the tree, or bookmark the current page
  from the sidebar header on *any* GitHub page (file, issue, PR, or repo
  root — detected from the URL). Stored locally, grouped by repo with an
  "other repos" section for everything else you've saved.

### Fits how you actually browse
- **Follows GitHub's own theme** — reads GitHub's `data-color-mode` /
  light-theme / dark-theme attributes (falling back to OS
  `prefers-color-scheme` when GitHub is set to "auto") and live-updates via
  a `MutationObserver`, so toggling GitHub's own theme switcher updates the
  sidebar instantly, no reload.
- **Pin sidebar** — floats over the page by default; pin it and it pushes
  GitHub's own content over instead, becoming a permanent side panel. Pinned
  width is **drag-resizable** (grab the inner edge) from 340px to 880px,
  persisted across sessions.
- **Dock left or right**, toggle from the header icon or the Settings page.
- **Monospace code font** option for file paths and code-ish text, if you
  prefer that over the system font.
- **Zero-setup**: every feature above except the three LLM narratives and
  the Find X narrative works fully keyless on public repos. A GitHub token
  (no scopes needed) just raises the rate limit; an LLM key is separately
  optional.

---

## Architecture

### Why client-side only
No backend means: no hosting bill, nothing to keep online, and your GitHub
token / LLM key never leaves your browser except to their own providers
(`api.github.com`, `api.anthropic.com`, `api.openai.com`) — there is no
middle server to trust. The tradeoff is real: a browser tab can't parse
thousands of files upfront, so the design leans on three things instead:

1. **Import-graph first, not full ASTs.** Regex-based import extraction
   (`src/lib/importExtract.ts`) rather than a real parser — cheap, works
   across languages without shipping per-language grammars, but less precise
   than AST-level analysis (see Limitations).
2. **Everything is cached by commit SHA** (`src/lib/cache.ts`, IndexedDB +
   an in-memory hot layer) — reopening a repo or file you've already indexed
   is instant, and a new commit invalidates cleanly instead of silently
   serving stale data.
3. **Bounded, batched fetching** (`src/lib/github.ts`) — a concurrency-pooled
   fetch (8 in flight) for file contents, and the GitHub Contents API
   (authenticated) or raw.githubusercontent.com (unauthenticated) depending
   on whether a token is set.

### Priorities: quality over speed, always
Every feature that makes a claim (impact counts, "what breaks," search
rankings) is **grounded in the deterministic import graph first**; the LLM
is only ever used to *narrate* or *rank* on top of that evidence, never as
the sole source of truth. A wrong-but-fast answer is treated as a bug, not
a feature — caching, lazy loading, and streaming exist to make *correct*
answers arrive faster, never to skip correctness for speed.

### Source layout
```
manifest.config.ts        MV3 manifest (CRXJS)
vite.config.ts

src/
  background/index.ts     Service worker — opens Settings on first install

  content/                Injected into github.com via a shadow-DOM root
    main.tsx              Mount point; detects repo pages, remounts on
                           GitHub's SPA (pjax) navigation
    Sidebar.tsx            Top-level UI state machine: repo indexing, tabs
                           (Map/Tree/Bookmarks), pin/dock/theme, view routing
    FilePanel.tsx          Per-file: referenced-by, impact, tests, exports
    PurposePanel.tsx        "Purpose" LLM narrative (fetches file source)
    NarrativePanel.tsx      Generic streaming LLM panel (What Breaks / Tests)
    FileTree.tsx            IDE-style folder/file browser
    BookmarksPanel.tsx       Saved bookmarks list
    CommandPalette.tsx       ⌘K search UI
    FlowView.tsx             Mermaid architecture-flow modal (pan/zoom)
    PrPanel.tsx              PR review mode
    styles.ts                All CSS as a template string (injected via
                              <style> inside the shadow root)

  lib/                    No React — pure logic, all independently testable
    types.ts               Shared types (RepoGraph, FileNode, Settings, ...)
    github.ts               GitHub REST API client (tree, blobs, PR files)
    githubTheme.ts           Reads/watches GitHub's light/dark theme
    cache.ts                 IndexedDB graph cache, keyed by commit SHA
    settings.ts               chrome.storage.local wrapper for Settings
    language.ts                Extension → language map, test-file heuristic
    importExtract.ts            Regex import/export extraction per language
    graphBuilder.ts               Builds the import graph; impact analysis;
                                   related-tests lookup; entry-point detection
    systems.ts                     Keyword-based "Core Systems" detection
    find.ts                         Find X heuristic ranking
    flow.ts                          BFS trace + mermaid diagram generation
    tree.ts                          Flat paths → nested folder/file tree
    bookmarks.ts                      Bookmark storage + URL classification
    llm.ts                             Provider-agnostic streaming LLM client
    prompts.ts                          All grounded LLM prompt templates

src/options/               Settings page (PAT, LLM key, dock side, font)
```

### Tech stack
TypeScript, React 19, Vite + `@crxjs/vite-plugin` (MV3 bundling with HMR),
`idb` (IndexedDB wrapper), `mermaid` (lazy-loaded — see below).

---

## Performance notes
- **Mermaid is lazy-loaded.** The full `mermaid` package bundles every
  diagram type (gantt, sequence, C4, ER, ...) we don't use — about 2MB. It's
  dynamically `import()`-ed only when a flow view actually opens, so the
  always-shipped content-script bundle stays ~40KB gzipped.
- **Shadow DOM isolation.** The whole UI renders inside a shadow root
  (`src/content/main.tsx`), so its styles can never leak into or be
  clobbered by GitHub's own CSS, and vice versa.
- **SPA-aware remounting.** GitHub navigates via pjax/Turbo without full
  page loads; a `MutationObserver` on `document.body` detects path changes
  and remounts the sidebar so it stays in sync without a hard refresh.

## Privacy
- No telemetry, no analytics, nothing sent anywhere except: GitHub's own API
  (to read repo data) and, only if you configure it, your chosen LLM
  provider's API (for narrative features).
- Your GitHub token and LLM key are stored in `chrome.storage.local` —
  local to your browser profile, never synced to any server this project
  controls (there isn't one).
- Bookmarks and tree-expansion state are stored locally the same way.

---

## Known limitations (stated plainly, not glossed over)
- **No symbol-level call graph.** Import extraction is regex-based, not
  AST-based (e.g. tree-sitter) — it knows file A imports file B, but not
  *which function* calls *which function*. This is the single biggest gap
  for precise impact analysis, and the real next leap for this project.
- **Flow diagrams trace imports, not execution.** They show the *import*
  graph outward from a node, not an actual request/execution lifecycle
  (HTTP request → router → controller → service → DB). Real execution-flow
  reconstruction needs call-graph resolution across framework layers.
- **Core Systems detection is keyword-heuristic**, not semantic — matches
  on path/filename keywords (e.g. "auth", "queue"), so it can miss
  unconventionally-named code or mislabel something.
- **No full-text code search** — Find X matches file paths and exported
  symbol names, not arbitrary code content.
- **Private repos**: work if your PAT has the `repo` scope (the client
  already authenticates every request with it), but there's no OAuth
  sign-in flow — you manage the token yourself via Settings.
- **Not supported at all**: GitHub Enterprise (hardcoded to
  `api.github.com`, no configurable base URL), multiple simultaneous
  accounts, and there's no paid tier — everything here is free by design.

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
`chrome://extensions` → Details → Extension options) to configure:

| Setting | Effect | Required? |
|---|---|---|
| GitHub Personal Access Token | Raises the GitHub API rate limit from 60 to 5,000 req/hr; needed for private repos (`repo` scope) | No |
| LLM Provider + API Key + Model | Unlocks Purpose, What Breaks, What Should I Test, and the Find X narrative | No |
| Sidebar dock position | Left or right edge | No (defaults right) |
| Code font | System font or monospace | No (defaults system) |

Every graph-based feature — Core Systems, file tree, impact analysis, flow
diagrams, bookmarks, PR review — works with **zero configuration**.
