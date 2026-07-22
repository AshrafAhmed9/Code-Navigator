/**
 * Single source of truth for "what URL are we on", resilient to GitHub's Turbo
 * SPA navigation — the root cause of the sidebar going stale or vanishing until
 * a manual refresh.
 *
 * Why this is needed: an isolated content script cannot observe the page's own
 * `history.pushState`/`replaceState` calls (those run in the page's main world,
 * behind an isolation boundary we can't patch), and Turbo does not reliably
 * fire the same event for every kind of navigation. Relying on any single
 * signal — or on a `MutationObserver` bound to `document.body`, which Turbo
 * *replaces* on navigation, silently killing the observer — is exactly what
 * made this flaky. This combines every DOM/window signal we CAN observe with a
 * low-frequency polling fallback that just compares `location.href`. The poll
 * is the bulletproof catch-all: even a navigation that fires no event at all is
 * caught within half a second, guaranteeing we never get permanently stuck.
 */
type Listener = (href: string) => void

const listeners = new Set<Listener>()
let currentHref = typeof location !== 'undefined' ? location.href : ''
let started = false

function checkForChange(): void {
  if (typeof location === 'undefined') return
  if (location.href === currentHref) return
  currentHref = location.href
  for (const l of listeners) {
    try {
      l(currentHref)
    } catch (e) {
      console.error('Code Navigator navigation listener failed', e)
    }
  }
}

function start(): void {
  if (started || typeof window === 'undefined') return
  started = true
  // Real DOM/window events an isolated content script can actually receive.
  document.addEventListener('turbo:load', checkForChange)
  document.addEventListener('turbo:render', checkForChange)
  window.addEventListener('popstate', checkForChange)
  window.addEventListener('hashchange', checkForChange)
  window.addEventListener('pageshow', checkForChange) // bfcache back/forward restores
  // Bulletproof fallback for any navigation that fires none of the above.
  setInterval(checkForChange, 500)
}

export function getCurrentHref(): string {
  return currentHref
}

/** Subscribe to URL changes. Returns an unsubscribe function. Starts tracking on first use. */
export function onNavigate(listener: Listener): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}
