import { useEffect, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { fetchFileContent } from '../lib/github'
import { getSettings } from '../lib/settings'
import { isTreeSitterSupported, parseFileSymbols } from '../lib/symbols'
import type { ParsedDefinition } from './parser.worker'

const KIND_LABEL: Record<ParsedDefinition['kind'], string> = {
  function: 'function',
  method: 'method',
  class: 'class',
  arrow: 'const →',
}

/**
 * Real AST-parsed functions/methods/classes for the open file (tree-sitter),
 * distinct from the regex-based "Exported symbols" list elsewhere in
 * FilePanel — labeled explicitly so the two are never confused. Scoped to
 * one file at a time; any parse failure here is silent (returns nothing)
 * rather than surfacing an error, since this is a bonus view, not core data.
 */
export function SymbolsPanel({ graph, path }: { graph: RepoGraph; path: string }) {
  const file = graph.files[path]
  const [state, setState] = useState<'loading' | 'unsupported' | 'failed' | 'done'>('loading')
  const [definitions, setDefinitions] = useState<ParsedDefinition[]>([])
  const [callCount, setCallCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    if (!file || !isTreeSitterSupported(file.language)) {
      setState('unsupported')
      return
    }

    setState('loading')
    async function run() {
      const settings = await getSettings()
      const [owner, repo] = graph.repoKey.split('/')
      try {
        const source = await fetchFileContent({ owner, repo }, graph.commitSha, path, settings.githubPat)
        if (cancelled) return
        const result = await parseFileSymbols(path, source, file!.language)
        if (cancelled) return
        if (!result) {
          setState('failed')
          return
        }
        setDefinitions(result.definitions)
        setCallCount(result.callSites.length)
        setState('done')
      } catch {
        if (!cancelled) setState('failed')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [graph, path, file])

  if (!file || state === 'unsupported' || state === 'failed') return null

  return (
    <div className="cn-section">
      <div className="cn-label">
        Functions &amp; classes
        <span className="cn-badge-inferred" style={{ background: 'var(--cn-success-soft)', color: 'var(--cn-success)' }}>
          AST-parsed
        </span>
      </div>
      {state === 'loading' && <div className="cn-muted">Parsing…</div>}
      {state === 'done' && (
        <>
          <div className="cn-muted" style={{ marginBottom: 6 }}>
            {definitions.length} definition{definitions.length === 1 ? '' : 's'} · {callCount} call
            {callCount === 1 ? '' : 's'} made in this file
          </div>
          {definitions.slice(0, 20).map((d, i) => (
            <a
              key={`${d.name}-${d.startLine}-${i}`}
              className="cn-file-row cn-link"
              href={`${blobUrl(graph, path)}#L${d.startLine}`}
            >
              <span className="cn-muted" style={{ marginRight: 6 }}>
                {KIND_LABEL[d.kind]}
              </span>
              {d.name}
            </a>
          ))}
        </>
      )}
    </div>
  )
}

function blobUrl(graph: RepoGraph, path: string): string {
  const [owner, repo] = graph.repoKey.split('/')
  return `https://github.com/${owner}/${repo}/blob/${graph.commitSha}/${path}`
}
