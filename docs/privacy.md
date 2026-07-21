# Privacy Policy — Code Navigator

Code Navigator is a fully client-side Chrome extension. There is no Code
Navigator server, no telemetry, and no analytics of any kind.

## What data the extension handles

- **GitHub Personal Access Token (optional)** — if you add one in Settings, it
  is stored only in `chrome.storage.local` on your device and sent only as an
  `Authorization` header on requests to `api.github.com`, to raise your GitHub
  API rate limit from 60 to 5,000 requests/hour. It is never sent anywhere
  else.
- **LLM API key (Anthropic or OpenAI, optional)** — stored only in
  `chrome.storage.local`. It is sent only to `api.anthropic.com` or
  `api.openai.com` (whichever you configure), directly from your browser, only
  when you trigger an LLM-powered explanation. If no key is configured, no LLM
  requests are ever made.
- **Repository data** — file trees, file contents, and commit metadata are
  fetched directly from `api.github.com` for repositories you visit, cached
  locally (IndexedDB) by commit SHA to avoid refetching, and never sent
  anywhere except back to your browser's own memory/cache.
- **Bookmarks and recent activity** — the URLs and titles of pages you
  bookmark or recently visited on github.com are stored only in
  `chrome.storage.local`, to power the Bookmarks and Recent tabs. This never
  leaves your device.

## What the extension does NOT do

- No Code Navigator servers exist — there is nothing to send data to even if
  we wanted to.
- No tracking, analytics, or telemetry of any kind.
- No data is sold, shared, or transmitted to any third party other than the
  GitHub and LLM API endpoints described above, which you explicitly
  configure.

## Permissions

- `storage` / `unlimitedStorage` — for the local caching and settings
  described above.
- Host access to `github.com` — to inject the sidebar UI.
- Host access to `api.github.com`, `api.anthropic.com`, `api.openai.com` — the
  only network destinations the extension ever talks to.

## Questions

Open an issue at
[github.com/AshrafAhmed9/Code-Navigator](https://github.com/AshrafAhmed9/Code-Navigator).
