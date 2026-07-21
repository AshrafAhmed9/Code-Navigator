import { useEffect, useMemo, useState } from 'react'
import { parseRepoUrl, resolveCommitSha, fetchRepoTree } from '../lib/github'
import { buildImportGraph, mostDependedOn } from '../lib/graphBuilder'
import { getGraph, setGraph, graphKey } from '../lib/cache'
import { getSettings } from '../lib/settings'
import { detectCoreSystems } from '../lib/systems'
import type { RepoGraph } from '../lib/types'
import { FilePanel } from './FilePanel'
import { FlowView } from './FlowView'
import { CommandPalette } from './CommandPalette'
import { PrPanel, usePrRef } from './PrPanel'
import { styles } from './styles'

type Status = 'idle' | 'resolving' | 'indexing' | 'ready' | 'error'
type View = { kind: 'repo-map' } | { kind: 'file'; path: string } | { kind: 'flow'; root: string }

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cn-collapsed') === '1')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [graph, setGraphState] = useState<RepoGraph | null>(null)
  const [error, setError] = useState<string>('')
  const [hasPat, setHasPat] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [view, setView] = useState<View>({ kind: 'repo-map' })

  const prRef = usePrRef()
  const ref = useMemo(() => parseRepoUrl(window.location.href), [])
  const initialFilePath = useMemo(() => extractFilePathFromUrl(window.location.pathname, ref), [ref])

  useEffect(() => {
    if (initialFilePath) setView({ kind: 'file', path: initialFilePath })
  }, [initialFilePath])

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

  if (!ref) return null

  return (
    <>
      <style>{styles}</style>
      <div className={`cn-root ${collapsed ? 'cn-collapsed' : ''}`}>
        <button className="cn-toggle" onClick={toggle} title="Code Navigator (⌘K to search)">
          {collapsed ? '◀' : '▶'} {!collapsed && 'Code Navigator'}
        </button>
        {!collapsed && (
          <div className="cn-panel">
            {prRef ? (
              <PrPanel pr={prRef} />
            ) : (
              <>
                {status === 'resolving' && <p className="cn-muted">Resolving repo…</p>}
                {status === 'indexing' && (
                  <p className="cn-muted">
                    Indexing {progress.done}/{progress.total} files…
                    {!hasPat && (
                      <>
                        {' '}
                        <a href="#" onClick={openOptions} className="cn-link">
                          Add a token for 83× faster indexing
                        </a>
                      </>
                    )}
                  </p>
                )}
                {status === 'error' && <p className="cn-error">{error}</p>}
                {status === 'ready' && graph && (
                  <>
                    <button className="cn-search-trigger" onClick={() => setPaletteOpen(true)}>
                      🔍 Find anything… <span className="cn-kbd">⌘K</span>
                    </button>
                    {view.kind === 'flow' ? (
                      <FlowView graph={graph} root={view.root} onClose={() => setView({ kind: 'repo-map' })} />
                    ) : view.kind === 'file' && graph.files[view.path] ? (
                      <FilePanel graph={graph} path={view.path} />
                    ) : (
                      <RepoMapView graph={graph} onOpenFlow={(root) => setView({ kind: 'flow', root })} />
                    )}
                  </>
                )}
              </>
            )}
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
    </>
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
          <div className="cn-label">Core systems</div>
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
      )}

      <div className="cn-section">
        <div className="cn-label">Entry points</div>
        {graph.entryPoints.slice(0, 5).map((p) => (
          <div key={p} className="cn-file-row cn-entry-row">
            <span>{p}</span>
            <button className="cn-flow-btn" title="Trace flow from here" onClick={() => onOpenFlow(p)}>
              ⤳ flow
            </button>
          </div>
        ))}
      </div>

      <div className="cn-section">
        <div className="cn-label">Most depended-on files</div>
        {topFiles.map((f) => (
          <div key={f.path} className="cn-file-row">
            {f.path} <span className="cn-badge">{f.importedBy.length}</span>
          </div>
        ))}
      </div>

      <div className="cn-section">
        <div className="cn-label">Language breakdown</div>
        {Object.entries(graph.languageBreakdown)
          .sort((a, b) => b[1] - a[1])
          .map(([lang, count]) => (
            <div key={lang} className="cn-file-row">
              {lang} <span className="cn-badge">{count}</span>
            </div>
          ))}
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
