# Code Navigator

A Chrome extension that overlays github.com and answers the architecture
questions you actually have when dropped into an unfamiliar repo: *Where does
this start? Who depends on this? What breaks if I change it?*

It builds a real import/dependency graph client-side (no backend, no hosting
cost) and optionally uses your own LLM API key (Anthropic or OpenAI) to add
natural-language explanations grounded in that graph.

## Status

Early MVP: import-graph construction, a Repo Map sidebar (entry points, most
depended-on files, language breakdown), and per-file impact analysis
(referenced-by / transitive impact / risk tier). LLM narratives, "Find X"
search, and architecture-flow diagrams are not wired up yet.

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
- An **LLM API key** (Anthropic or OpenAI) — unlocks natural-language
  explanations layered on top of the dependency graph.

Both are optional. Core graph features work with neither.
