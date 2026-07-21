import { useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { fetchFileCriticality, type FileCriticality } from '../lib/github'
import { getSettings } from '../lib/settings'

/** Fan-in from the graph (free) combined with commit/contributor history (one lazy API call) into a star rating. */
function starRating(fanIn: number, criticality: FileCriticality): number {
  const score =
    Math.min(2, fanIn / 5) + Math.min(1.5, criticality.commitCount / 30) + Math.min(1.5, criticality.contributors / 5)
  return Math.max(1, Math.min(5, Math.round(score)))
}

export function CriticalityPanel({ graph, path }: { graph: RepoGraph; path: string }) {
  const file = graph.files[path]
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  const [data, setData] = useState<FileCriticality | null>(null)

  async function load() {
    if (state !== 'idle') return
    setState('loading')
    try {
      const settings = await getSettings()
      const [owner, repo] = graph.repoKey.split('/')
      const result = await fetchFileCriticality({ owner, repo }, path, graph.commitSha, settings.githubPat)
      setData(result)
      setState('done')
    } catch {
      setState('failed')
    }
  }

  if (!file) return null

  return (
    <div className="cn-section">
      <div className="cn-label">Criticality</div>
      {state === 'idle' && (
        <button className="cn-flow-btn" onClick={load}>
          Show criticality (1 API call)
        </button>
      )}
      {state === 'loading' && <div className="cn-muted">Loading…</div>}
      {state === 'failed' && <div className="cn-muted">Couldn't load history for this file.</div>}
      {state === 'done' && data && (
        <div className="cn-muted">
          <span style={{ color: 'var(--cn-warning)', letterSpacing: 1 }}>
            {'★'.repeat(starRating(file.importedBy.length, data))}
            {'☆'.repeat(5 - starRating(file.importedBy.length, data))}
          </span>
          <br />
          Referenced by {file.importedBy.length} · {data.commitCountIsExact ? '' : '≥'}
          {data.commitCount} commits · {data.contributorsIsExact ? '' : '≥'}
          {data.contributors} contributor{data.contributors === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}
