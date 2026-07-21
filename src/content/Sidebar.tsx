import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseRepoUrl, resolveCommitSha, fetchRepoTree } from '../lib/github'
import { buildImportGraph, mostDependedOn } from '../lib/graphBuilder'
import { getGraph, setGraph, graphKey } from '../lib/cache'
import { getSettings, saveSettings } from '../lib/settings'
import { detectCoreSystems } from '../lib/systems'
import { detectGitHubTheme, watchGitHubTheme, type Theme } from '../lib/githubTheme'
import { classifyUrl, isBookmarked, toggleBookmark, type Bookmark } from '../lib/bookmarks'
import type { RepoGraph } from '../lib/types'
import { FilePanel } from './FilePanel'
import { FlowView } from './FlowView'
import { CommandPalette } from './CommandPalette'
import { PrPanel, usePrRef } from './PrPanel'
import { FileTree } from './FileTree'
import { BookmarksPanel } from './BookmarksPanel'
import { RateLimitFooter } from './RateLimitFooter'
import { styles } from './styles'

type Status = 'idle' | 'resolving' | 'indexing' | 'ready' | 'error'
type View = { kind: 'repo-map' } | { kind: 'file'; path: string } | { kind: 'flow'; root: string }
type HomeTab = 'map' | 'tree' | 'bookmarks'

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
  const [dockSide, setDockSide] = useState<'left' | 'right'>('right')
  const [codeFont, setCodeFont] = useState<'sans' | 'mono'>('sans')
  const [theme, setTheme] = useState<Theme>(() => detectGitHubTheme())
  const [pinned, setPinned] = useState(() => localStorage.getItem('cn-pinned') === '1')
  const [pinnedWidth, setPinnedWidth] = useState(() => Number(localStorage.getItem('cn-pinned-width')) || 480)
  const pinnedWidthRef = useRef(pinnedWidth)
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null)

  const prRef = usePrRef()
  const ref = useMemo(() => parseRepoUrl(window.location.href), [])
  const initialFilePath = useMemo(() => extractFilePathFromUrl(window.location.pathname, ref), [ref])

  useEffect(() => {
    if (initialFilePath) setView({ kind: 'file', path: initialFilePath })
  }, [initialFilePath])

  useEffect(() => {
    getSettings().then((s) => {
      if (s.dockSide) setDockSide(s.dockSide)
      if (s.codeFont) setCodeFont(s.codeFont)
    })
  }, [])

  useEffect(() => watchGitHubTheme(setTheme), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((p) => !p)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  useEffect(() => {
    if (!ref || prRef) return
    let cancelled = false

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
    if (pinned && !collapsed) {
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
  }, [pinned, collapsed, dockSide, pinnedWidth])

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

            {!prRef && status === 'ready' && graph && view.kind !== 'file' && (
              <div className="cn-tabs">
                <button className={`cn-tab ${homeTab === 'map' ? 'cn-tab-active' : ''}`} onClick={() => setHomeTab('map')}>
                  Map
                </button>
                <button className={`cn-tab ${homeTab === 'tree' ? 'cn-tab-active' : ''}`} onClick={() => setHomeTab('tree')}>
                  Tree
                </button>
                <button className={`cn-tab ${homeTab === 'bookmarks' ? 'cn-tab-active' : ''}`} onClick={() => setHomeTab('bookmarks')}>
                  Bookmarks
                </button>
              </div>
            )}

            <div className="cn-body">
              {prRef ? (
                <PrPanel pr={prRef} />
              ) : (
                <>
                  {status === 'resolving' && (
                    <div className="cn-loading">
                      <span className="cn-spinner" />
                      Resolving repository…
                    </div>
                  )}
                  {status === 'indexing' && (
                    <div className="cn-loading-block">
                      <div className="cn-loading">
                        <span className="cn-spinner" />
                        Indexing {progress.done}/{progress.total} files…
                      </div>
                      <div className="cn-progress-track">
                        <div className="cn-progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      {!hasPat && (
                        <a href="#" onClick={openOptions} className="cn-link cn-hint">
                          Add a token for 83× faster indexing →
                        </a>
                      )}
                    </div>
                  )}
                  {status === 'error' && <div className="cn-error-block">{error}</div>}
                  {status === 'ready' && graph && (
                    <>
                      {view.kind === 'file' && graph.files[view.path] ? (
                        <FilePanel graph={graph} path={view.path} />
                      ) : (
                        <>
                          <button className="cn-search-trigger" onClick={() => setPaletteOpen(true)}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="7" />
                              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                            </svg>
                            <span>Find anything…</span>
                            <span className="cn-kbd">⌘K</span>
                          </button>
                          {homeTab === 'tree' ? (
                            <FileTree graph={graph} />
                          ) : homeTab === 'bookmarks' ? (
                            <BookmarksPanel repoKey={graph.repoKey} />
                          ) : (
                            <RepoMapView graph={graph} onOpenFlow={(root) => setView({ kind: 'flow', root })} />
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
            <RateLimitFooter onOpenOptions={() => chrome.runtime.openOptionsPage()} />
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
    </>
  )
}

function PageBookmarkButton() {
  const url = window.location.href.split('#')[0]
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

function RepoMapView({ graph, onOpenFlow }: { graph: RepoGraph; onOpenFlow: (root: string) => void }) {
  const topFiles = mostDependedOn(graph, 5)
  const totalFiles = Object.keys(graph.files).length
  const systems = useMemo(() => detectCoreSystems(graph), [graph])

  return (
    <div>
      <h3 className="cn-h3">Understand this repository</h3>
      <div className="cn-stat">{totalFiles} files indexed</div>

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
                <div className="cn-system-name">{s.name}</div>
                {s.files.slice(0, 3).map((f) => (
                  <div key={f.path} className="cn-file-row cn-system-file">
                    {f.path}
                  </div>
                ))}
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
              <button className="cn-flow-btn" title="Trace flow from here" onClick={() => onOpenFlow(p)}>
                ⤳ flow
              </button>
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
  chrome.runtime.openOptionsPage()
}
