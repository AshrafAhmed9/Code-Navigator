import { useEffect, useMemo, useState } from 'react'
import { parseRepoUrl, resolveCommitSha, fetchRepoTree } from '../lib/github'
import { buildImportGraph, mostDependedOn } from '../lib/graphBuilder'
import { getGraph, setGraph, graphKey } from '../lib/cache'
import { getSettings } from '../lib/settings'
import type { RepoGraph } from '../lib/types'
import { FilePanel } from './FilePanel'
import { styles } from './styles'

type Status = 'idle' | 'resolving' | 'indexing' | 'ready' | 'error'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cn-collapsed') === '1')
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [graph, setGraphState] = useState<RepoGraph | null>(null)
  const [error, setError] = useState<string>('')
  const [hasPat, setHasPat] = useState(false)

  const ref = useMemo(() => parseRepoUrl(window.location.href), [])
  const currentFilePath = useMemo(() => extractFilePathFromUrl(window.location.pathname, ref), [ref])

  useEffect(() => {
    if (!ref) return
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
  }, [ref])

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
        <button className="cn-toggle" onClick={toggle} title="Code Navigator">
          {collapsed ? '◀' : '▶'} {!collapsed && 'Code Navigator'}
        </button>
        {!collapsed && (
          <div className="cn-panel">
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
              <RepoMapView graph={graph} currentFilePath={currentFilePath} />
            )}
          </div>
        )}
      </div>
    </>
  )
}

function RepoMapView({ graph, currentFilePath }: { graph: RepoGraph; currentFilePath: string | null }) {
  const topFiles = mostDependedOn(graph, 5)
  const totalFiles = Object.keys(graph.files).length

  return (
    <div>
      {currentFilePath && graph.files[currentFilePath] ? (
        <FilePanel graph={graph} path={currentFilePath} />
      ) : (
        <>
          <h3 className="cn-h3">Repo Map</h3>
          <div className="cn-stat">{totalFiles} files indexed</div>

          <div className="cn-section">
            <div className="cn-label">Entry points</div>
            {graph.entryPoints.slice(0, 5).map((p) => (
              <div key={p} className="cn-file-row">
                {p}
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
        </>
      )}
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
