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

// Never let a single unexpected throw here abort the rest of this script —
// if it did, none of the listeners below would ever get registered, and the
// sidebar would be permanently gone for the remainder of this page load.
function safeSync() {
  try {
    sync()
  } catch (e) {
    console.error('Code Navigator sync failed', e)
  }
}

safeSync()

// GitHub navigates via Turbo (a client-side SPA router), which can swap the DOM
// and update the URL in either order — relying solely on a body MutationObserver
// to infer "the URL changed" is unreliable because a DOM mutation can fire before
// window.location has actually updated, silently missing the remount. Turbo's own
// `turbo:load` event fires once a navigation has fully completed (DOM + URL both
// settled), so it's the correct signal. popstate covers back/forward browser nav.
// A MutationObserver stays as a defensive fallback in case some navigation path
// (or a future GitHub redesign) doesn't dispatch turbo:load.
document.addEventListener('turbo:load', safeSync)
window.addEventListener('popstate', safeSync)

// Manual escape hatch: clicking the toolbar icon (background/index.ts) force-remounts
// the sidebar if it's ever silently missing despite being on a repo page — e.g. a
// future GitHub DOM change that breaks the automatic signals above.
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type !== 'force-mount') return
  document.getElementById(HOST_ID)?.remove()
  safeSync()
})

/**
 * Self-heals the sidebar's presence on ANY DOM churn, not just path changes.
 * The previous version only re-checked on a path change, so if GitHub's own
 * scripts ever removed our host node as a side effect of unrelated page
 * updates (lazy-loaded README/Actions/Discussions content, live badge
 * updates, etc.) — without a navigation — the sidebar could vanish and never
 * come back until the user manually navigated. This is cheap (one
 * getElementById check) and debounced so bursts of unrelated mutations don't
 * cause repeated work.
 */
let healTimer: ReturnType<typeof setTimeout> | null = null
function scheduleHealthCheck() {
  if (healTimer) return
  healTimer = setTimeout(() => {
    healTimer = null
    if (isRepoPage() && !document.getElementById(HOST_ID)) mount()
  }, 300)
}

let lastPath = window.location.pathname
new MutationObserver(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname
    safeSync()
  } else {
    scheduleHealthCheck()
  }
  // subtree:true (not just body's direct children) because Turbo and GitHub's
  // own scripts typically replace nested containers, not body itself — the
  // previous subtree:false config meant this observer almost never fired for
  // real navigations, silently defeating its purpose as a fallback.
}).observe(document.body, { childList: true, subtree: true })

// One-off safety net: some repo pages (e.g. large READMEs, empty repos with a
// different quick-setup layout) finish rendering shortly after document_idle
// and can disturb the DOM in ways the observer above might race with.
setTimeout(scheduleHealthCheck, 1500)
