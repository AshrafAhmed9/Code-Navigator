# Code Navigator

A Chrome extension that overlays github.com and answers the architecture
questions you actually have when dropped into an unfamiliar repo: *Where does
this start? Who depends on this? What breaks if I change it?*

It builds a real import/dependency graph client-side (no backend, no hosting
cost) and optionally uses your own LLM API key (Anthropic or OpenAI) to add
natural-language explanations grounded in that graph.

> Best tried on a real, unfamiliar repo (e.g. `expressjs/express`), not a
> small one — the value is orienting you in a codebase too large to read file
> by file.

## Status

### Built
- **Import-graph construction** — file-level dependency graph via the GitHub
  API, regex-based import extraction for TS/JS, Python, Go, Java, Ruby, Rust.
  Cached in IndexedDB keyed by commit SHA.
- **Repo Map sidebar** — entry points, most depended-on files, language
  breakdown. Shown on landing on any repo.
- **Per-file impact analysis** — referenced-by, imports, transitive impact
  count with a LOW/MEDIUM/HIGH risk tier, exported symbols. Every claim links
  to the actual file on GitHub.
- **BYOK LLM "Purpose" panel** — a grounded, streamed explanation of what a
  file is responsible for, based strictly on its imports/importers/exports/
  source excerpt (Anthropic or OpenAI, your own key, called directly from the
  browser). Labeled "LLM-inferred" to stay visually distinct from graph facts.
- **Zero-setup**: works fully keyless on public repos (60 req/hr); a GitHub
  token (no scopes needed) raises that to 5,000/hr; an LLM key is separately
  optional and only gates the Purpose panel.

### Not built yet
This is still a data-dump MVP, not the full experience in the plan:
- **Architecture flow diagrams** (mermaid) tracing an entry point through the
  graph — the actual "wow in 30 seconds" visual, not a flat file list.
- **"Find X" semantic search** (e.g. "Find Authentication"), LLM-ranked over
  graph edges + name/content matching.
- **"What breaks if I change this?" / "What should I test?"** LLM narratives
  over the impact set (impact *counts* exist today; the narrative doesn't).
- **PR review mode** — impact analysis overlaid on pull-request diffs.
- **⌘K command palette.**
- Import extraction is regex-based, not AST-based (tree-sitter) — fast and
  broad-language but less precise than a real parser; call-graph (not just
  file-level import graph) isn't built.

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
- An **LLM API key** (Anthropic or OpenAI) — unlocks the Purpose panel's
  natural-language explanations.

Both are optional. Core graph features (Repo Map, referenced-by, impact
analysis) work with neither.
