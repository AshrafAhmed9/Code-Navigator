import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'

const HOST_ID = 'code-navigator-host'

function mount() {
  if (document.getElementById(HOST_ID)) return // avoid double-mount

  const host = document.createElement('div')
  host.id = HOST_ID
  document.body.appendChild(host)

  // Shadow DOM isolates our styles from GitHub's — never break or bleed into the host page.
  const shadow = host.attachShadow({ mode: 'open' })
  const mountPoint = document.createElement('div')
  shadow.appendChild(mountPoint)

  const root = createRoot(mountPoint)
  root.render(<Sidebar />)
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

let lastPath = window.location.pathname
new MutationObserver(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname
    sync()
  }
}).observe(document.body, { childList: true, subtree: false })
