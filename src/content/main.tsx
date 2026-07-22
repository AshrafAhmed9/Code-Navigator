import { createRoot, type Root } from 'react-dom/client'
import { Sidebar } from './Sidebar'
import { onNavigate } from '../lib/navigation'

const HOST_ID = 'code-navigator-host'
let currentRoot: Root | null = null

function mount() {
  if (document.getElementById(HOST_ID) || !document.body) return // already mounted, or body not ready

  // A previous root whose host node was torn out by a Turbo <body> swap is now
  // orphaned — release it (runs its cleanup effects) before creating a new one,
  // so React roots don't accumulate across navigations.
  if (currentRoot) {
    try {
      currentRoot.unmount()
    } catch {
      /* container already gone — nothing to clean up */
    }
    currentRoot = null
  }

  try {
    const host = document.createElement('div')
    host.id = HOST_ID
    document.body.appendChild(host)

    // Shadow DOM isolates our styles from GitHub's — never break or bleed into the host page.
    const shadow = host.attachShadow({ mode: 'open' })
    const mountPoint = document.createElement('div')
    shadow.appendChild(mountPoint)

    currentRoot = createRoot(mountPoint)
    currentRoot.render(<Sidebar />)
  } catch (e) {
    // A render failure must never leave a half-attached host behind — that
    // would make the "host already exists" check below lie, permanently
    // blocking every future mount attempt (including the toolbar fallback).
    document.getElementById(HOST_ID)?.remove()
    currentRoot = null
    console.error('Code Navigator failed to mount', e)
  }
}

/**
 * Keeps our host node present on the page. Mounted unconditionally on any
 * github.com page — the Sidebar itself decides whether to show anything (it
 * renders nothing when the URL isn't a repo), so we never have to correctly
 * predict "is this a repo page?" at exactly the right moment just to stay
 * alive. That prediction, across Turbo's inconsistent navigation events, was a
 * whole class of "the sidebar didn't show up, I had to refresh" bugs.
 *
 * Turbo replaces `document.body` on navigation, which removes our host; this
 * re-appends it. Driven by both the navigation signal (immediate) and a steady
 * interval (guaranteed catch-all), so a missing host is always restored within
 * a second without the user ever needing to refresh.
 */
function ensureMounted() {
  if (document.body && !document.getElementById(HOST_ID)) mount()
}

ensureMounted()
onNavigate(ensureMounted)
setInterval(ensureMounted, 1000)

// Manual escape hatch: clicking the toolbar icon (background/index.ts) force-
// remounts the sidebar as an absolute last resort.
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type !== 'force-mount') return
  document.getElementById(HOST_ID)?.remove()
  currentRoot?.unmount()
  currentRoot = null
  mount()
})
