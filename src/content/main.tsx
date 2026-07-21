import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import { recordVisit } from '../lib/history'

const HOST_ID = 'code-navigator-host'

function mount() {
  if (document.getElementById(HOST_ID)) return // avoid double-mount

  try {
    const host = document.createElement('div')
    host.id = HOST_ID
    document.body.appendChild(host)

    // Shadow DOM isolates our styles from GitHub's — never break or bleed into the host page.
    const shadow = host.attachShadow({ mode: 'open' })
    const mountPoint = document.createElement('div')
    shadow.appendChild(mountPoint)

    const root = createRoot(mountPoint)
    root.render(<Sidebar />)
  } catch (e) {
    // A render failure here must never leave a half-attached host behind —
    // that would make sync()'s "host exists" check lie, permanently blocking
    // future mount attempts (including the manual toolbar-click fallback).
    document.getElementById(HOST_ID)?.remove()
    console.error('Code Navigator failed to mount', e)
  }
}

function isRepoPage(): boolean {
  // matches /owner/repo or /owner/repo/... but not github.com/settings etc.
  return /^\/[^/]+\/[^/]+/.test(window.location.pathname) &&
    !['settings', 'notifications', 'marketplace', 'sponsors', 'orgs'].includes(
      window.location.pathname.split('/')[1],
    )
}

/**
 * Reconciles the sidebar's presence with the current URL. Idempotent and
 * safe to call redundantly from multiple signals — it only acts when reality
 * actually needs to change, so overlapping triggers never fight each other.
 */
function sync() {
  const host = document.getElementById(HOST_ID)
  const shouldExist = isRepoPage()

  if (shouldExist && !host) {
    mount()
  } else if (!shouldExist && host) {
    host.remove()
  }
  // If shouldExist && host already present, leave it — Sidebar's own effects
  // pick up URL changes within the same repo (e.g. opening a different file).

  if (shouldExist) {
    const title = document.title.replace(/\s*·\s*GitHub.*$/, '')
    recordVisit(window.location.href.split('#')[0], title)
  }
}

sync()

// GitHub navigates via Turbo (a client-side SPA router), which can swap the DOM
// and update the URL in either order — relying solely on a body MutationObserver
// to infer "the URL changed" is unreliable because a DOM mutation can fire before
// window.location has actually updated, silently missing the remount. Turbo's own
// `turbo:load` event fires once a navigation has fully completed (DOM + URL both
// settled), so it's the correct signal. popstate covers back/forward browser nav.
// A MutationObserver stays as a defensive fallback in case some navigation path
// (or a future GitHub redesign) doesn't dispatch turbo:load.
document.addEventListener('turbo:load', sync)
window.addEventListener('popstate', sync)

// Manual escape hatch: clicking the toolbar icon (background/index.ts) force-remounts
// the sidebar if it's ever silently missing despite being on a repo page — e.g. a
// future GitHub DOM change that breaks the automatic signals above.
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type !== 'force-mount') return
  document.getElementById(HOST_ID)?.remove()
  sync()
})

let lastPath = window.location.pathname
new MutationObserver(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname
    sync()
  }
}).observe(document.body, { childList: true, subtree: false })
