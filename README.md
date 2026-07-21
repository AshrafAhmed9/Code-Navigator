# Code Navigator

A Chrome extension that overlays github.com and answers the architecture
questions you actually have when dropped into an unfamiliar repo: *Where does
this start? Who depends on this? What breaks if I change it? What should I
test?*

It builds a real import/dependency graph client-side (no backend, no hosting
cost) and optionally uses your own LLM API key (Anthropic or OpenAI) to add
natural-language explanations grounded in that graph — never a freeform guess
over the whole repo.

> Best tried on a real, unfamiliar repo (e.g. `expressjs/express`), not a
> small one — the value is orienting you in a codebase too large to read file
> by file.

## Status

### Built
- **Import-graph construction** — file-level dependency graph via the GitHub
  API, regex-based import extraction for TS/JS, Python, Go, Java, Ruby, Rust.
  Cached in IndexedDB keyed by commit SHA.
- **"Understand this repository" first screen** — not a flat file list:
  auto-detected **Core Systems** (Authentication, API, Database, Cache,
  Message Queue, Payments, Background Jobs, Config, Storage), entry points,
  most depended-on files, and language breakdown.
- **⌘K command palette** — question-driven search ("Find Authentication",
  "Find Database", or free text), heuristic-ranked by filename/symbol match
  and import centrality, with an optional LLM narrative on top explaining
  which result is the right starting point.
- **Architecture flow diagrams** — traces the import graph outward from any
  entry point or search result and renders it as a mermaid flowchart, bounded
  so it stays readable. Mermaid is lazy-loaded (~2MB of unused diagram types
  otherwise) so the always-shipped bundle stays ~40KB.
- **Per-file impact analysis** — referenced-by, imports, transitive impact
  grouped by **affected area** (not just a raw count) with a LOW/MEDIUM/HIGH
  risk tier, related test files (graph-evidenced, not guessed), exported
  symbols. Every claim links to the actual file on GitHub.
- **Grounded LLM narratives**, each labeled "LLM-inferred" to stay visually
  distinct from deterministic graph facts, streamed live:
  - **Purpose** — what a file is responsible for.
  - **What breaks if I change this?** — grouped by affected area.
  - **What should I test?** — cites real test files from the graph, or says
    plainly when none were found rather than inventing test names.
- **PR review mode** — on any `github.com/.../pull/N` page, overlays impact
  analysis (affected file count, risk tier, related test count) on every
  changed file in the PR, using the PR's actual head commit.
- **IDE-like file tree** — full collapsible folder/file browser for the repo
  (not just indexed code files), with a live filter-as-you-type search that
  auto-expands matching branches, and per-language color icons.
- **Bookmarks** — star any file from the tree, or bookmark the current page
  from the header (works on file, issue, PR, and repo-root pages), for quick
  return access. Stored locally, scoped per-repo with an "other repos" section.
- **Follows GitHub's own theme** — detects and live-updates with GitHub's
  light/dark/auto theme setting (`data-color-mode`), instead of a fixed theme.
- **Pin sidebar** — toggle between floating over the page (default) and
  pinned, which pushes GitHub's own content over to reserve room, like a
  permanent side panel.
- **Dock left or right**, and a **monospace code font** option for file paths
  — both togglable from the sidebar header or the options page.
- **Zero-setup**: every feature above except the LLM narratives works fully
  keyless on public repos (60 req/hr); a GitHub token (no scopes needed)
  raises that to 5,000/hr; an LLM key is separately optional.

### Known limitations / next real leap
- Import extraction is regex-based, not AST-based (tree-sitter) — fast and
  broad-language, but less precise than a real parser, and there's no
  symbol-level **call graph** (who calls this function, not just which file
  imports which). This is the biggest gap for accurate impact analysis.
- Flow diagrams trace the **import graph**, not actual **execution/request
  lifecycle** (e.g. HTTP request → router → controller → service → DB). That
  needs call-graph resolution across framework layers and is real future
  scope, not a quick addition.
- Core Systems detection is keyword-heuristic (path/filename matching), not
  semantic — it can miss unconventionally-named code or mislabel it.
- No local file-content full-text search yet — Find X matches path and
  exported-symbol names, not arbitrary code content.
- **Private repos**: work if your PAT has the `repo` scope — the GitHub API
  client already authenticates with it — but there's no OAuth sign-in flow,
  so you manage the token yourself via Settings.
- **Not supported**: GitHub Enterprise (hardcoded to `api.github.com`, no
  configurable base URL), multiple simultaneous accounts, and there's no
  paid tier — everything here is free and client-side by design.

## Develop

```bash
npm install
npm run dev      # Vite dev server with HMR for the extension
npm run build    # production build to dist/
```

Load `dist/` as an unpacked extension via `chrome://extensions` → Developer
mode → Load unpacked.

## Settings

Open the extension's options page to optionally add:
- A **GitHub Personal Access Token** (no scopes needed for public repos) —
  raises the API rate limit from 60 to 5,000 requests/hour.
- An **LLM API key** (Anthropic or OpenAI) — unlocks Purpose, What Breaks,
  What Should I Test, and the Find X narrative.

Both are optional. Core graph features (Core Systems, Repo Map, referenced-by,
impact analysis, flow diagrams, PR review) work with neither.
