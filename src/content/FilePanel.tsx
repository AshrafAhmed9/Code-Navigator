import { useMemo } from 'react'
import type { RepoGraph } from '../lib/types'
import { computeImpact } from '../lib/graphBuilder'
import { PurposePanel } from './PurposePanel'

export function FilePanel({ graph, path }: { graph: RepoGraph; path: string }) {
  const file = graph.files[path]
  const impact = useMemo(() => computeImpact(graph, path), [graph, path])

  if (!file) return null

  return (
    <div>
      <h3 className="cn-h3" title={path}>
        {path.split('/').pop()}
      </h3>
      <div className="cn-muted" style={{ wordBreak: 'break-all' }}>
        {path}
      </div>

      <PurposePanel graph={graph} path={path} />

      <div className="cn-section">
        <div className="cn-label">
          Referenced by <span className="cn-badge">{file.importedBy.length}</span>
        </div>
        {file.importedBy.length === 0 && <div className="cn-muted">No known in-repo importers.</div>}
        {file.importedBy.slice(0, 8).map((p) => (
          <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)}>
            {p}
          </a>
        ))}
      </div>

      <div className="cn-section">
        <div className="cn-label">
          Imports <span className="cn-badge">{file.imports.length}</span>
        </div>
        {file.imports.slice(0, 8).map((p) => (
          <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)}>
            {p}
          </a>
        ))}
      </div>

      <div className="cn-section">
        <div className="cn-label">
          Impact analysis
          <span className={`cn-risk cn-risk-${impact.risk.toLowerCase()}`}>{impact.risk}</span>
        </div>
        <div className="cn-muted">
          Changing this file transitively affects <strong>{impact.affected.length}</strong> other
          file{impact.affected.length === 1 ? '' : 's'} (evidence: import graph).
        </div>
        {impact.affected.length > 0 && (
          <details style={{ marginTop: 6 }}>
            <summary className="cn-link">Show affected files</summary>
            {impact.affected.slice(0, 30).map((p) => (
              <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)}>
                {p}
              </a>
            ))}
          </details>
        )}
      </div>

      {file.exportedSymbols.length > 0 && (
        <div className="cn-section">
          <div className="cn-label">Exported symbols</div>
          {file.exportedSymbols.slice(0, 15).map((s) => (
            <div key={s} className="cn-file-row">
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function blobUrl(graph: RepoGraph, path: string): string {
  const [owner, repo] = graph.repoKey.split('/')
  return `https://github.com/${owner}/${repo}/blob/${graph.commitSha}/${path}`
}
