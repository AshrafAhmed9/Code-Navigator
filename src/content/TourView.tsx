import { useMemo, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { buildTour } from '../lib/tour'

function blobUrl(graph: RepoGraph, path: string): string {
  const [owner, repo] = graph.repoKey.split('/')
  return `https://github.com/${owner}/${repo}/blob/${graph.commitSha}/${path}`
}

export function TourView({ graph, root, label, onClose }: { graph: RepoGraph; root: string; label?: string; onClose: () => void }) {
  const tour = useMemo(() => buildTour(graph, root), [graph, root])
  const [readSteps, setReadSteps] = useState<Set<number>>(new Set())

  function toggleRead(order: number) {
    setReadSteps((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
  }

  const progressPct = tour.steps.length > 0 ? Math.round((readSteps.size / tour.steps.length) * 100) : 0

  return (
    <div className="cn-modal-backdrop" onClick={onClose}>
      <div className="cn-modal cn-tour-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cn-flow-header">
          <div>
            <div className="cn-h3" style={{ marginBottom: 2 }}>
              📚 Learn {label ?? root.split('/').pop()}
            </div>
            <div className="cn-muted">
              {tour.steps.length} steps · ~{tour.totalMinutes} min · ordered by how the code actually pulls itself in
            </div>
          </div>
          <button className="cn-close" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>

        <div className="cn-progress-track" style={{ marginBottom: 14 }}>
          <div className="cn-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="cn-tour-steps">
          {tour.steps.map((step) => (
            <div key={step.path} className={`cn-tour-step ${readSteps.has(step.order) ? 'cn-tour-step-done' : ''}`}>
              <button className="cn-tour-check" onClick={() => toggleRead(step.order)} title="Mark as read">
                {readSteps.has(step.order) ? '✓' : step.order}
              </button>
              <div className="cn-tour-step-body">
                <a className="cn-tour-step-path" href={blobUrl(graph, step.path)}>
                  {step.path}
                </a>
                <div className="cn-muted">
                  {step.reason} · ~{step.minutes} min
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
