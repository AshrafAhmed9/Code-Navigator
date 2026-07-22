# Chrome Web Store listing — draft copy

## Short description (132 char max)
Understand any GitHub repo in 15 minutes. Dependency graphs, impact analysis, PR summaries — client-side, bring your own key.

## Detailed description

Every developer has joined a repo with no idea where to start. Code Navigator
turns github.com into a guided map of the codebase you're looking at — right
where you already are, with no server, no signup, and no data leaving your
browser.

**Before you edit anything**
- Dependency graph and impact analysis — see everything a file transitively
  affects before you touch it, with a risk tier and related tests.
- Safe Change Checklist — a concrete, evidence-backed checklist for the file
  you're about to change.
- "Why is this here?" and "What breaks if I change this?" — grounded LLM
  narration on top of the real dependency graph (never a guess pretending to
  be a fact).

**Get productive fast**
- Core Systems detection — Authentication, API, Database, Payments, and more,
  auto-detected with an honest confidence score, not false certainty.
- Guided reading tours through a system, in dependency order, with time
  estimates.
- ⌘K search across the whole repo.
- File tree, mermaid architecture diagrams, and criticality ratings
  (commits/contributors) fetched on demand.

**Reviewing a PR**
- Explain this PR — a grounded summary of what changed, which systems are
  affected, overall risk, and a suggested review order.
- Per-file impact and related-test counts for every changed file.

**Stays out of your way**
- Fully client-side — no Code Navigator servers exist.
- Bring your own GitHub token and LLM key (Anthropic, OpenAI, Groq, Gemini —
  auto-detected — or any other OpenAI-compatible endpoint) — both stored only
  in your browser, never sent anywhere else. See the
  [privacy policy](./privacy.md).
- Works keyless within GitHub's public rate limit; graph features never
  require an LLM key.
- Live GitHub API budget tracking so you're never stranded mid-session.

## Screenshots to capture (5, 1280×800)
1. Map tab — Core Systems with confidence scores, on a well-known repo
   (e.g. expressjs/express).
2. A file panel — Safe Change Checklist + impact analysis + risk tier.
3. "Explain this PR" panel on a real pull request.
4. A guided tour (Step X of Y) mid-flow.
5. Mermaid flow diagram, zoomed to fit, showing a real call chain.

## Demo GIF shot list (15–20s)
1. Open a repo → sidebar appears, Core Systems populate.
2. Click a file → Safe Change Checklist + impact analysis appear.
3. ⌘K → search → jump to a file.
4. Open a PR → "Explain this PR" streams in.

## Category
Developer Tools

## Tightened one-line description (matches manifest.config.ts)
"Navigate, understand, and safely change any GitHub repo. Dependency graphs,
impact analysis, and architecture tours — right inside github.com."
