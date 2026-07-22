import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseRepoUrl, parsePullRequestUrl, resolveCommitSha, fetchRepoTree, type PrRef } from '../lib/github'
import { buildImportGraph, buildSkeletonGraph, mostDependedOn } from '../lib/graphBuilder'
import { getGraph, setGraph, deleteGraph, graphKey } from '../lib/cache'
import { getSettings, saveSettings } from '../lib/settings'
import { detectCoreSystems } from '../lib/systems'
import { detectGitHubTheme, watchGitHubTheme, type Theme } from '../lib/githubTheme'
import { classifyUrl, isBookmarked, toggleBookmark, type Bookmark } from '../lib/bookmarks'
import { getCurrentHref, onNavigate } from '../lib/navigation'
import { recordVisit } from '../lib/history'
import type { RepoGraph } from '../lib/types'
import { FilePanel } from './FilePanel'
import { FlowView } from './FlowView'
import { CommandPalette } from './CommandPalette'
import { PrPanel } from './PrPanel'
import { FileTree } from './FileTree'
import { BookmarksPanel } from './BookmarksPanel'
import { HistoryPanel } from './HistoryPanel'
import { OnboardingPanel } from './OnboardingPanel'
import { ErrorBoundary } from './ErrorBoundary'
import { openOptionsPage } from '../lib/openOptions'
import { RateLimitFooter } from './RateLimitFooter'
import { TourView } from './TourView'
import { styles } from './styles'

type Status = 'idle' | 'resolving' | 'indexing' | 'ready' | 'error'
type View =
  | { kind: 'repo-map' }
  | { kind: 'file'; path: string }
  | { kind: 'flow'; root: string }
  | { kind: 'tour'; root: string; label?: string }
type HomeTab = 'map' | 'tree' | 'bookmarks' | 'recent'

/** GitHub's own top-level routes that share the `/{first}/{second}` shape of a repo URL but aren't repos. */
const RESERVED_OWNERS = new Set([
  'settings', 'notifications', 'marketplace', 'sponsors', 'orgs', 'features',
  'pricing', 'about', 'explore', 'topics', 'trending', 'collections', 'events',
  'codespaces', 'new', 'login', 'join', 'search', 'pulls', 'issues', 'dashboard',
  'account', 'apps', 'organizations', 'watching', 'stars',
])

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cn-collapsed') === '1')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [graph, setGraphState] = useState<RepoGraph | null>(null)
  const [error, setError] = useState<string>('')
  const [hasPat, setHasPat] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [view, setView] = useState<View>({ kind: 'repo-map' })
  const [homeTab, setHomeTab] = useState<HomeTab>('tree')
  // Tabs mount once, on first visit, and then stay mounted (hidden via CSS)
  // rather than being torn down when you switch away — see the render below.
  // On a huge repo, FileTree rebuilds its whole nested structure from
  // scratch on mount; unmounting it on every tab switch (the previous
  // ternary-based approach) meant that cost was paid again on every single
  // switch back, which is what actually made large repos feel laggy —
  // nothing to do with network or the data cache, which was already fine.
  const [visitedTabs, setVisitedTabs] = useState<Set<HomeTab>>(() => new Set(['tree']))
  function selectTab(tab: HomeTab) {
    setHomeTab(tab)
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right')
  const [codeFont, setCodeFont] = useState<'sans' | 'mono'>('sans')
  const [theme, setTheme] = useState<Theme>(() => detectGitHubTheme())
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [pinned, setPinned] = useState(() => localStorage.getItem('cn-pinned') === '1')
  const [pinnedWidth, setPinnedWidth] = useState(() => Number(localStorage.getItem('cn-pinned-width')) || 480)
  const pinnedWidthRef = useRef(pinnedWidth)
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null)

  // Reactive to Turbo SPA navigation — never read the URL only once, or the
  // sidebar shows stale data (or nothing) after an in-page navigation until a
  // manual refresh. See src/lib/navigation.ts.
  const href = useCurrentHref()

  // `ref` keeps a stable identity while you're within one repo (only its
  // owner/repo matter), so navigating between files in the same repo doesn't
  // needlessly re-trigger the indexing effect below; it changes only when the
  // repo actually changes.
  const repoSlug = useMemo(() => {
    const r = parseRepoUrl(href)
    // Exclude GitHub's own top-level routes that happen to look like
    // `/owner/repo` (e.g. /orgs/x, /settings/y, /marketplace/z) — indexing
    // those as if they were repos just produces a 404.
    if (!r || RESERVED_OWNERS.has(r.owner.toLowerCase())) return null
    return `${r.owner}/${r.repo}`
  }, [href])
  const ref = useMemo(
    () => (repoSlug ? { owner: repoSlug.split('/')[0], repo: repoSlug.split('/')[1], ref: 'HEAD' } : null),
    [repoSlug],
  )
  const prNumber = useMemo(() => parsePullRequestUrl(href)?.number ?? null, [href])
  const prRef = useMemo<PrRef | null>(
    () => (repoSlug && prNumber != null ? { owner: repoSlug.split('/')[0], repo: repoSlug.split('/')[1], number: prNumber } : null),
    [repoSlug, prNumber],
  )

  // Keep the in-panel view in sync with the page URL: show the file panel on a
  // blob URL, otherwise fall back to the repo map — but leave internal overlay
  // views (flow/tour, opened from inside the sidebar without a URL change)
  // untouched.
  useEffect(() => {
    const filePath = ref ? extractFilePathFromUrl(new URL(href).pathname, ref) : null
    if (filePath) setView({ kind: 'file', path: filePath })
    else setView((v) => (v.kind === 'file' ? { kind: 'repo-map' } : v))
  }, [href, ref])

  // Record the visit for the Recent tab whenever we land on a repo page.
  useEffect(() => {
    if (!ref) return
    const title = document.title.replace(/\s*·\s*GitHub.*$/, '')
    recordVisit(href.split('#')[0], title)
  }, [href, ref])

  useEffect(() => {
    getSettings().then((s) => {
      if (s.dockSide) setDockSide(s.dockSide)
      if (s.codeFont) setCodeFont(s.codeFont)
      // Only a genuinely first-time user (no token, no LLM key, never dismissed)
      // should see this — someone who already configured settings directly via
      // the options page (skipping the onboarding button) shouldn't see it pop
      // up on every visit just because onboardedAt was never separately set.
      if (!s.onboardedAt && !s.githubPat && !s.llmApiKey) setShowOnboarding(true)
    })
  }, [])

  useEffect(() => watchGitHubTheme(setTheme), [])

  useEffect(() => {
    // Only hijack ⌘K on repo pages — we now mount on every github.com page, and
    // stealing the shortcut on pages where the palette can't even open would be
    // an unwelcome surprise.
    if (!ref) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((p) => !p)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [ref])

  useEffect(() => {
    if (!ref || prRef) return
    let cancelled = false

    // Synchronously clear the previous repo's graph so navigating between repos
    // never briefly shows the old repo's data under the new repo's header.
    setStatus('resolving')
    setGraphState(null)
    setProgress({ done: 0, total: 0 })

    async function run() {
      try {
        const settings = await getSettings()
        setHasPat(!!settings.githubPat)
        setStatus('resolving')
        const commitSha = await resolveCommitSha(ref!, settings.githubPat)
        const key = graphKey(ref!.owner, ref!.repo, commitSha)

        const cached = await getGraph(key)
        if (cached && !cancelled) {
          setGraphState(cached)
          setStatus('ready')
          return
        }

        setStatus('indexing')
        const tree = await fetchRepoTree(ref!, commitSha, settings.githubPat)
        if (cancelled) return
        // The full file tree is known now, well before per-file content
        // indexing (the slow part) finishes — surface it immediately so
        // Tree/Bookmarks/Recent are usable while indexing runs in the
        // background, instead of blocking the whole panel on it.
        setGraphState(buildSkeletonGraph(ref!, commitSha, tree))
        const built = await buildImportGraph(ref!, commitSha, tree, settings.githubPat, (done, total) => {
          if (!cancelled) setProgress({ done, total })
        })
        if (cancelled) return
        await setGraph(key, built)
        setGraphState(built)
        setStatus('ready')
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [ref, prRef])

  function invalidateGraph(repoKey: string, commitSha: string) {
    const [owner, repo] = repoKey.split('/')
    deleteGraph(graphKey(owner, repo, commitSha)).finally(() => window.location.reload())
  }

  function toggle() {
    setCollapsed((c) => {
      localStorage.setItem('cn-collapsed', c ? '0' : '1')
      return !c
    })
  }

  function toggleDock() {
    setDockSide((d) => {
      const next = d === 'left' ? 'right' : 'left'
      saveSettings({ dockSide: next })
      return next
    })
  }

  function togglePinned() {
    setPinned((p) => {
      const next = !p
      localStorage.setItem('cn-pinned', next ? '1' : '0')
      return next
    })
  }

  // Pinned mode pushes GitHub's own page content over to reserve room for the
  // sidebar (like Octotree's pin), instead of floating on top of it — and the
  // panel itself widens (drag-resizable) rather than staying the same size.
  useEffect(() => {
    const html = document.documentElement
    const marginProp = dockSide === 'left' ? 'marginLeft' : 'marginRight'
    // `ref &&` guard: we mount on every github.com page, but the sidebar is only
    // visible on repo pages — never push the page content over for an invisible
    // panel on a non-repo page.
    if (ref && pinned && !collapsed) {
      html.style[marginProp] = `${pinnedWidth + 42}px`
      html.style.transition = resizeState.current ? 'none' : 'margin 0.2s ease'
    } else {
      html.style.marginLeft = ''
      html.style.marginRight = ''
    }
    return () => {
      html.style.marginLeft = ''
      html.style.marginRight = ''
    }
  }, [ref, pinned, collapsed, dockSide, pinnedWidth])

  const MIN_PINNED_WIDTH = 340
  const MAX_PINNED_WIDTH = 880

  const onResizeMove = useCallback(
    (e: PointerEvent) => {
      if (!resizeState.current) return
      const delta = dockSide === 'left' ? e.clientX - resizeState.current.startX : resizeState.current.startX - e.clientX
      const next = Math.min(MAX_PINNED_WIDTH, Math.max(MIN_PINNED_WIDTH, resizeState.current.startWidth + delta))
      pinnedWidthRef.current = next
      setPinnedWidth(next)
    },
    [dockSide],
  )
  const onResizeUp = useCallback(() => {
    resizeState.current = null
    document.body.style.userSelect = ''
    localStorage.setItem('cn-pinned-width', String(pinnedWidthRef.current))
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResizeMove])

  function onResizeDown(e: React.PointerEvent) {
    resizeState.current = { startX: e.clientX, startWidth: pinnedWidth }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', onResizeUp)
  }

  if (!ref) return null

  const showBack = !prRef && view.kind !== 'repo-map'
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <style>{styles}</style>
      <div
        className={`cn-root ${collapsed ? 'cn-collapsed' : ''} ${dockSide === 'left' ? 'cn-dock-left' : ''} ${
          codeFont === 'mono' ? 'cn-font-mono' : ''
        } ${pinned && !collapsed ? 'cn-pinned' : ''}`}
        data-theme={theme}
      >
        <button className="cn-toggle" onClick={toggle} title="Code Navigator (⌘K to search)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
          </svg>
        </button>
        {!collapsed && (
          <div className="cn-panel" style={pinned ? { width: pinnedWidth } : undefined}>
            {pinned && (
              <div
                className={`cn-resize-handle ${dockSide === 'left' ? 'cn-resize-handle-left' : ''}`}
                onPointerDown={onResizeDown}
                title="Drag to resize"
              />
            )}
            <div className="cn-header">
              {showBack ? (
                <button className="cn-back" onClick={() => setView({ kind: 'repo-map' })}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back
                </button>
              ) : (
                <div className="cn-brand">
                  <span className="cn-brand-dot" />
                  Code Navigator
                </div>
              )}
              <div className="cn-header-actions">
                <PageBookmarkButton />
                <button className="cn-collapse-btn" onClick={openOptionsPage} title="Settings — GitHub token & LLM key">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  className={`cn-collapse-btn ${pinned ? 'cn-pin-active' : ''}`}
                  onClick={togglePinned}
                  title={pinned ? 'Unpin (float over page)' : 'Pin sidebar (push page content over)'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M12 13v8" strokeLinecap="round" />
                  </svg>
                </button>
                <button className="cn-collapse-btn" onClick={toggleDock} title="Switch side">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 4v16M17 4v16" strokeLinecap="round" />
                    <path d={dockSide === 'left' ? 'M14 9l3 3-3 3' : 'M10 9l-3 3 3 3'} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button className="cn-collapse-btn" onClick={toggle} title="Collapse">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            {!prRef && (status === 'ready' || status === 'indexing') && graph && view.kind !== 'file' && (
              <div className="cn-tabs">
                <button className={`cn-tab ${homeTab === 'map' ? 'cn-tab-active' : ''}`} onClick={() => selectTab('map')}>
                  Map
                </button>
                <button className={`cn-tab ${homeTab === 'tree' ? 'cn-tab-active' : ''}`} onClick={() => selectTab('tree')}>
                  Tree
                </button>
                <button className={`cn-tab ${homeTab === 'bookmarks' ? 'cn-tab-active' : ''}`} onClick={() => selectTab('bookmarks')}>
                  Bookmarks
                </button>
                <button className={`cn-tab ${homeTab === 'recent' ? 'cn-tab-active' : ''}`} onClick={() => selectTab('recent')}>
                  Recent
                </button>
              </div>
            )}

            <div className="cn-body">
              {showOnboarding && <OnboardingPanel onDismiss={() => setShowOnboarding(false)} />}
              {prRef ? (
                <ErrorBoundary key={`${prRef.owner}/${prRef.repo}#${prRef.number}`}>
                  <PrPanel pr={prRef} />
                </ErrorBoundary>
              ) : (
                <>
                  {status === 'resolving' && (
                    <div className="cn-loading">
                      <span className="cn-spinner" />
                      Resolving repository…
                    </div>
                  )}
                  {status === 'indexing' && !graph && (
                    <div className="cn-loading">
                      <span className="cn-spinner" />
                      Loading file tree…
                    </div>
                  )}
                  {status === 'error' && <div className="cn-error-block">{error}</div>}
                  {(status === 'indexing' || status === 'ready') && graph && (
                    <ErrorBoundary key={graph.repoKey + graph.commitSha} onReset={() => invalidateGraph(graph.repoKey, graph.commitSha)}>
                      {view.kind === 'file' && graph.files[view.path] ? (
                        <FilePanel graph={graph} path={view.path} />
                      ) : view.kind === 'file' ? (
                        <div className="cn-muted">Still indexing — file details will appear once ready.</div>
                      ) : (
                        <>
                          {status === 'indexing' && (
                            <div className="cn-index-banner">
                              <div className="cn-loading">
                                <span className="cn-spinner" />
                                Indexing {progress.done}/{progress.total} files… browse below, results fill in as they're ready
                              </div>
                              <div className="cn-progress-track">
                                <div className="cn-progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              {!hasPat && (
                                <a href="#" onClick={openOptions} className="cn-link cn-hint">
                                  Add a token for faster indexing →
                                </a>
                              )}
                            </div>
                          )}
                          <button className="cn-search-trigger" onClick={() => setPaletteOpen(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="7" />
                              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                            </svg>
                            <span>Find anything…</span>
                            <span className="cn-kbd">⌘K</span>
                          </button>
                          {visitedTabs.has('tree') && (
                            <div style={{ display: homeTab === 'tree' ? 'block' : 'none' }}>
                              <FileTree graph={graph} />
                            </div>
                          )}
                          {visitedTabs.has('bookmarks') && (
                            <div style={{ display: homeTab === 'bookmarks' ? 'block' : 'none' }}>
                              <BookmarksPanel repoKey={graph.repoKey} />
                            </div>
                          )}
                          {visitedTabs.has('recent') && (
                            <div style={{ display: homeTab === 'recent' ? 'block' : 'none' }}>
                              <HistoryPanel repoKey={graph.repoKey} />
                            </div>
                          )}
                          {visitedTabs.has('map') && (
                            <div style={{ display: homeTab === 'map' ? 'block' : 'none' }}>
                              {status === 'indexing' ? (
                                <div className="cn-muted">Map view will be available once indexing finishes.</div>
                              ) : (
                                <RepoMapView
                                  graph={graph}
                                  hasPat={hasPat}
                                  onOpenFlow={(root) => setView({ kind: 'flow', root })}
                                  onOpenTour={(root, label) => setView({ kind: 'tour', root, label })}
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </ErrorBoundary>
                  )}
                </>
              )}
            </div>
            <RateLimitFooter onOpenOptions={openOptionsPage} />
          </div>
        )}
      </div>
      {paletteOpen && graph && (
        <CommandPalette
          graph={graph}
          onClose={() => setPaletteOpen(false)}
          onOpenFile={(path) => {
            setView({ kind: 'file', path })
            setPaletteOpen(false)
          }}
          onOpenFlow={(root) => {
            setView({ kind: 'flow', root })
            setPaletteOpen(false)
          }}
        />
      )}
      {view.kind === 'flow' && graph && (
        <FlowView graph={graph} root={view.root} onClose={() => setView({ kind: 'repo-map' })} />
      )}
      {view.kind === 'tour' && graph && (
        <TourView graph={graph} root={view.root} label={view.label} onClose={() => setView({ kind: 'repo-map' })} />
      )}
    </>
  )
}

function PageBookmarkButton() {
  const href = useCurrentHref()
  const url = href.split('#')[0]
  const classified = useMemo(() => classifyUrl(url), [url])
  const [marked, setMarked] = useState(false)

  useEffect(() => {
    isBookmarked(url).then(setMarked)
  }, [url])

  if (!classified) return null

  async function onClick() {
    const bookmark: Bookmark = {
      url,
      title: document.title.replace(/\s*·\s*GitHub.*$/, ''),
      repoKey: classified!.repoKey,
      kind: classified!.kind,
      addedAt: Date.now(),
    }
    const next = await toggleBookmark(bookmark)
    setMarked(next)
  }

  return (
    <button className={`cn-collapse-btn ${marked ? 'cn-bookmark-active' : ''}`} onClick={onClick} title="Bookmark this page">
      <svg width="14" height="14" viewBox="0 0 24 24" fill={marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

/** Re-renders the subscribing component whenever the page URL changes (Turbo-aware). */
function useCurrentHref(): string {
  const [href, setHref] = useState(getCurrentHref)
  useEffect(() => onNavigate(setHref), [])
  return href
}

function RepoMapView({
  graph,
  hasPat,
  onOpenFlow,
  onOpenTour,
}: {
  graph: RepoGraph
  hasPat: boolean
  onOpenFlow: (root: string) => void
  onOpenTour: (root: string, label?: string) => void
}) {
  const topFiles = mostDependedOn(graph, 5)
  const totalFiles = Object.keys(graph.files).length
  const capped = graph.totalCodeFileCount > graph.indexedFileCount
  const systems = useMemo(() => detectCoreSystems(graph), [graph])

  return (
    <div>
      <h3 className="cn-h3">Understand this repository</h3>
      <div className="cn-stat">{totalFiles} files indexed</div>
      {capped && (
        <div className="cn-muted" style={{ marginBottom: 8 }}>
          Repo has {graph.totalCodeFileCount.toLocaleString()} code files — too many to fully index quickly, so
          the {graph.indexedFileCount.toLocaleString()} most likely-central files (entry points and shallower
          paths first) were prioritized. The dependency graph and impact analysis only cover those.
          {!hasPat && (
            <>
              {' '}
              <a href="#" onClick={openOptions} className="cn-link">
                Add a GitHub token
              </a>{' '}
              to raise the indexed-file cap from 1,500 to 20,000.
            </>
          )}
        </div>
      )}

      {systems.length > 0 && (
        <div className="cn-section">
          <div className="cn-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
            Core systems
          </div>
          <div className="cn-card">
            {systems.map((s) => (
              <div key={s.name} className="cn-system-row">
                <div className="cn-system-header">
                  <div className="cn-system-name">{s.name}</div>
                  <span className={`cn-confidence cn-confidence-${s.confidenceLabel.toLowerCase()}`}>
                    {s.confidenceLabel} confidence
                  </span>
                </div>
                <div className="cn-confidence-reason">{s.reason}</div>
                {s.files.slice(0, 3).map((f) => (
                  <div key={f.path} className="cn-file-row cn-system-file">
                    <span className="cn-file-path" title={f.path}>{f.path}</span>
                  </div>
                ))}
                <button className="cn-flow-btn cn-tour-trigger" onClick={() => onOpenTour(s.files[0].path, s.name)}>
                  📚 Learn {s.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cn-section">
        <div className="cn-label">Entry points</div>
        <div className="cn-card">
          {graph.entryPoints.slice(0, 5).map((p) => (
            <div key={p} className="cn-file-row cn-entry-row">
              <span className="cn-file-path">{p}</span>
              <span style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="cn-flow-btn" title="Take a guided reading tour from here" onClick={() => onOpenTour(p)}>
                  📚 tour
                </button>
                <button className="cn-flow-btn" title="Trace flow from here" onClick={() => onOpenFlow(p)}>
                  ⤳ flow
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="cn-section">
        <div className="cn-label">Most depended-on files</div>
        <div className="cn-card">
          {topFiles.map((f) => (
            <div key={f.path} className="cn-file-row">
              <span className="cn-file-path">{f.path}</span> <span className="cn-badge">{f.importedBy.length}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cn-section">
        <div className="cn-label">Language breakdown</div>
        <div className="cn-card cn-lang-row">
          {Object.entries(graph.languageBreakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([lang, count]) => (
              <span key={lang} className="cn-lang-pill">
                {lang} <span className="cn-badge">{count}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

function extractFilePathFromUrl(pathname: string, ref: ReturnType<typeof parseRepoUrl>): string | null {
  if (!ref) return null
  const prefix = `/${ref.owner}/${ref.repo}/blob/`
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  const parts = rest.split('/')
  return parts.slice(1).join('/') // drop branch segment
}

function openOptions(e: React.MouseEvent) {
  e.preventDefault()
  openOptionsPage()
}
