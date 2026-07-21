import { createRoot } from 'react-dom/client'
import { Sidebar } from './Sidebar'

const HOST_ID = 'code-navigator-host'

function mount() {
  if (document.getElementById(HOST_ID)) return // avoid double-mount on GitHub's SPA navigation

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

function tryMount() {
  if (isRepoPage()) mount()
}

tryMount()

// GitHub is a soft-navigation SPA (pjax/turbo) — watch for URL changes to remount on repo switch.
let lastPath = window.location.pathname
new MutationObserver(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname
    document.getElementById(HOST_ID)?.remove()
    tryMount()
  }
}).observe(document.body, { childList: true, subtree: true })
