import { useMemo } from 'react'
import type { RepoGraph } from '../lib/types'
import { computeImpact, relatedTests } from '../lib/graphBuilder'
import { PurposePanel } from './PurposePanel'
import { NarrativePanel } from './NarrativePanel'
import { SymbolsPanel } from './SymbolsPanel'
import { CriticalityPanel } from './CriticalityPanel'
import { SafeChangeChecklist, type ChecklistItem } from './SafeChangeChecklist'
import { buildWhatBreaksPrompt, buildWhatToTestPrompt, buildWhyIsThisHerePrompt } from '../lib/prompts'

/** Groups affected paths by their top directory so "27 files" reads as areas, not a number. */
function groupByArea(paths: string[]): Array<{ area: string; paths: string[] }> {
  const groups = new Map<string, string[]>()
  for (const p of paths) {
    const parts = p.split('/')
    const area = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
    if (!groups.has(area)) groups.set(area, [])
    groups.get(area)!.push(p)
  }
  return Array.from(groups.entries())
    .map(([area, ps]) => ({ area, paths: ps }))
    .sort((a, b) => b.paths.length - a.paths.length)
}

export function FilePanel({ graph, path }: { graph: RepoGraph; path: string }) {
  const file = graph.files[path]
  const impact = useMemo(() => computeImpact(graph, path), [graph, path])
  const tests = useMemo(() => relatedTests(graph, path, impact.affected), [graph, path, impact.affected])
  const areas = useMemo(() => groupByArea(impact.affected), [impact.affected])

  const checklistItems = useMemo((): ChecklistItem[] => {
    const items: ChecklistItem[] = [{ id: 'read-file', label: `Read ${path.split('/').pop()}` }]
    if (file?.importedBy.length) {
      items.push({
        id: 'check-consumers',
        label: `Check ${file.importedBy.length} consumer${file.importedBy.length === 1 ? '' : 's'}`,
        href: blobUrl(graph, file.importedBy[0]),
      })
    }
    if (areas.length > 0) {
      items.push({ id: 'review-impact', label: `Review impact across ${areas.length} area${areas.length === 1 ? '' : 's'}` })
    }
    if (tests.length > 0) {
      items.push({ id: 'run-tests', label: `Run ${tests.length} related test${tests.length === 1 ? '' : 's'}`, href: blobUrl(graph, tests[0]) })
    }
    return items
  }, [graph, path, file, areas, tests])

  if (!file) return null

  return (
    <div>
      <h3 className="cn-h3" title={path}>
        {path.split('/').pop()}
      </h3>
      <div className="cn-muted" style={{ wordBreak: 'break-all' }}>
        {path}
      </div>

      <SafeChangeChecklist items={checklistItems} risk={impact.risk} />

      <PurposePanel graph={graph} path={path} />
      <SymbolsPanel graph={graph} path={path} />
      <CriticalityPanel graph={graph} path={path} />

      <div className="cn-section">
        <div className="cn-label">
          Referenced by <span className="cn-badge">{file.importedBy.length}</span>
        </div>
        {file.importedBy.length === 0 && <div className="cn-muted">No known in-repo importers.</div>}
        {file.importedBy.slice(0, 8).map((p) => (
          <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)} title={p}>
            <span className="cn-file-path">{p}</span>
          </a>
        ))}
      </div>

      <div className="cn-section">
        <div className="cn-label">
          Imports <span className="cn-badge">{file.imports.length}</span>
        </div>
        {file.imports.slice(0, 8).map((p) => (
          <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)} title={p}>
            <span className="cn-file-path">{p}</span>
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
          file{impact.affected.length === 1 ? '' : 's'} across {areas.length} area
          {areas.length === 1 ? '' : 's'} (evidence: import graph).
        </div>
        {areas.length > 0 && (
          <details style={{ marginTop: 6 }}>
            <summary className="cn-link">Show affected areas</summary>
            {areas.slice(0, 12).map((g) => (
              <div key={g.area} style={{ marginTop: 6 }}>
                <div className="cn-area-label">
                  {g.area} <span className="cn-badge">{g.paths.length}</span>
                </div>
                {g.paths.slice(0, 6).map((p) => (
                  <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)} title={p}>
                    <span className="cn-file-path">{p}</span>
                  </a>
                ))}
              </div>
            ))}
          </details>
        )}
      </div>

      <div className="cn-section">
        <div className="cn-label">
          Related tests <span className="cn-badge">{tests.length}</span>
        </div>
        {tests.length === 0 && (
          <div className="cn-muted">No test file imports this or an affected file, by the import graph.</div>
        )}
        {tests.map((p) => (
          <a key={p} className="cn-file-row cn-link" href={blobUrl(graph, p)} title={p}>
            <span className="cn-file-path">{p}</span>
          </a>
        ))}
      </div>

      <NarrativePanel
        label="Why is this here?"
        deps={[graph, path]}
        buildRequest={() => buildWhyIsThisHerePrompt(graph, path)}
      />

      <NarrativePanel
        label="What breaks if I change this?"
        deps={[graph, path]}
        buildRequest={() => buildWhatBreaksPrompt(path, impact.affected, impact.risk)}
      />

      <NarrativePanel
        label="What should I test?"
        deps={[graph, path]}
        buildRequest={() => buildWhatToTestPrompt(path, impact.affected, tests)}
      />

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
