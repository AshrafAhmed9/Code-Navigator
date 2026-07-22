# Code Navigator

A Chrome extension that helps you understand an unfamiliar GitHub repo in
minutes instead of hours — right on github.com, with no account, no signup,
and nothing sent to any server but GitHub's.

Every developer has landed on a repo with no idea where to start. Code
Navigator adds a sidebar that maps out how the codebase actually fits
together: what the major systems are, what a file will break if you touch it,
and what to read first to get oriented — before you write a line of code.

> **Try it on a real repo you don't already know**, not a tiny personal
> project — that's where it actually earns its keep. `expressjs/express` is a
> good first try.

## Install

- **Chrome Web Store**: coming soon.
- **From source** (works today): see [For developers](#for-developers) below.

Nothing you type ever leaves your browser except to GitHub (and, only if you
choose to add one, your own AI provider). There's no Code Navigator server —
there's nothing *to* leak. See the [privacy policy](docs/privacy.md).

## Why not just ask Copilot or ChatGPT?

|  | Copilot / ChatGPT | Code Navigator |
|---|---|---|
| What it sees | One file at a time | The whole repo's structure, mapped once |
| Before you edit | Nothing — you find out what broke *after* | What a file affects, upfront, with a risk level |
| Trustworthiness | A guess dressed up as an answer | Every claim ties back to real code — anything unverifiable is flagged, not hidden |
| Cost | Per-message | The graph and map are free forever; AI explanations only cost you if you turn them on |

---

## What you get

### A map of the repo, on arrival
Open any repo and the sidebar shows you the big picture first: the major
systems (Authentication, API, Database, Payments, and so on) auto-detected
and confidence-rated — so a guess is labeled a guess, not presented as fact —
plus the entry points and the files everything else depends on. From there,
click **"Learn Authentication"** (or any system) for a guided reading list in
the right order, with time estimates, so you're not just handed a pile of
files and left to figure out where to start.

### Find anything, fast
Press **⌘K** (or Ctrl+K) and just ask — "Find Authentication," "Find
Database," or type what you're looking for. Results are ranked by relevance,
not just filename matches, and it can explain *why* a result is the right
starting point if you've connected an AI key.

### Know what a change will break — before you make it
Open any file and the sidebar leads with a plain checklist: what to read,
what depends on this file, how big the blast radius is, which tests to run.
No more guessing whether a "small" change is actually safe.

### Reviewing someone else's pull request?
Open any PR on GitHub and Code Navigator overlays what each changed file
actually affects, with a risk level per file — and, if you've added an AI
key, a plain-English summary of what the PR does and a sensible order to
review the files in.

### It feels like part of GitHub, not a bolt-on
- Full file tree browser, live search, bookmarks, and a "recently visited"
  list — usable the moment you open a repo.
- Matches GitHub's own light/dark theme automatically.
- Dock it to either side, pin it so it stays open while you browse, or drag
  it around and resize it to however you like to work.
- Interactive diagrams of how a system's files connect, if you want the
  visual version.

### Honest about what it doesn't know
When Code Navigator uses AI to explain something, that explanation is
double-checked against the real code afterward — if it mentions a file that
isn't actually part of the evidence it was given, that gets flagged right in
the answer instead of being presented with false confidence. Confidence
scores work the same way: a "Low confidence" label means the evidence was
thin, not that we're pretending otherwise.

---

## Do I need an API key?

**No.** The map, the file tree, impact analysis, the checklist, bookmarks,
search, and diagrams all work with zero setup, just by installing the
extension.

Two optional keys unlock more:

| Key | What it unlocks | Do you need it? |
|---|---|---|
| A free GitHub token | Raises how many requests you can make per hour (60 → 5,000) — mainly matters on very large repos, or if you're browsing a lot in one sitting. Also needed for private repos. | Optional |
| Your own AI key (Anthropic, OpenAI, Groq, Gemini — or any compatible provider) | Plain-English explanations of files and PRs, generated on top of the real dependency data (never invented from nothing) | Optional |

Paste in any key and Code Navigator figures out which provider it's from
automatically — no dropdown to configure. Both keys live only in your
browser's local storage and are sent only to their own provider, never
anywhere else.

---

## Known limitations

Being upfront about where this doesn't (yet) reach:

- Real function/class-level parsing currently covers the file you have open,
  in JavaScript/TypeScript — everywhere else, and across the whole repo,
  analysis works from the import graph rather than a full parse.
- Diagrams trace how files import each other, not what happens when the code
  actually runs.
- System detection (Authentication, Database, etc.) is a smart guess with a
  visible confidence score — not a guarantee.
- Search matches file names and exported names, not arbitrary code content.
- Private repos need a personal access token — there's no "Sign in with
  GitHub" flow yet.
- Not yet supported: GitHub Enterprise, multiple GitHub accounts at once.
- No paid tier, on purpose — everything here is free.
- On very large repos (1,500+ files), a representative subset is analyzed
  rather than every single file — the sidebar tells you plainly when this
  happens and how much was covered.

---

## Privacy

- No telemetry, no analytics, nothing tracked.
- Nothing is sent anywhere except GitHub's own API and — only if you add
  one — your chosen AI provider's API.
- Your GitHub token and AI key are stored locally in your browser profile.
  There's no Code Navigator server for them to be sent to.
- Full policy: [docs/privacy.md](docs/privacy.md).

---

## For developers

If you want to build from source, contribute, or just see how it's put
together:

```bash
npm install
npm run dev      # Vite dev server with HMR for the extension
npm run build    # production build to dist/
npm run test     # unit tests (vitest)
npm run lint     # oxlint
```

Load `dist/` as an unpacked extension: `chrome://extensions` → enable
Developer mode → **Load unpacked** → select `dist/`.

**Stack**: TypeScript, React 19, Vite + `@crxjs/vite-plugin` (MV3 bundling),
`idb` (IndexedDB), `mermaid` (lazy-loaded), `web-tree-sitter` for real AST
parsing.

**Architecture, in brief**: everything runs client-side in a content script
injected into github.com, inside an isolated shadow DOM. There's no backend —
repo data comes straight from GitHub's REST/GraphQL API, is turned into a
dependency graph in memory, and is cached locally by commit SHA so reopening
a repo is instant. AI calls (when configured) go straight from your browser
to your chosen provider; nothing is proxied through a server this project
runs, because no such server exists.

The codebase is organized as `src/lib/` (pure logic — the dependency graph,
import resolution, caching, GitHub/LLM API clients — independently testable,
no React) and `src/content/` (the React UI that renders it all into the
sidebar). See `src/lib/prompts.ts` for how AI narratives stay grounded in
real evidence, and `src/lib/grounding.ts` for the post-hoc check that flags
it when one doesn't.

Pull requests welcome. No formal contribution guide yet — open an issue
first for anything non-trivial.
