import { useEffect, useMemo, useRef, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { findFiles, type FindResult } from '../lib/find'
import { detectCoreSystems } from '../lib/systems'
import { getSettings } from '../lib/settings'
import { isLlmConfigured, streamCompletion } from '../lib/llm'
import { buildFindPrompt } from '../lib/prompts'

export function CommandPalette({
  graph,
  onClose,
  onOpenFlow,
  onOpenFile,
}: {
  graph: RepoGraph
  onClose: () => void
  onOpenFlow: (path: string) => void
  onOpenFile: (path: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FindResult[]>([])
  const [narrative, setNarrative] = useState<{ text: string; streaming: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const narrativeToken = useRef(0)

  // Memoized — detectCoreSystems scans every file in the graph, and without
  // this it re-ran on every keystroke (each query update re-renders).
  const systems = useMemo(() => detectCoreSystems(graph), [graph])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function runQuery(q: string) {
    setQuery(q)
    setNarrative(null)
    if (!q.trim()) {
      setResults([])
      return
    }
    const found = findFiles(graph, q)
    setResults(found)

    const token = ++narrativeToken.current
    if (found.length > 0) {
      getSettings().then(async (settings) => {
        if (!isLlmConfigured(settings) || narrativeToken.current !== token) return
        try {
          setNarrative({ text: '', streaming: true })
          const req = buildFindPrompt(graph, q, found.map((r) => r.file.path))
          let acc = ''
          for await (const delta of streamCompletion(settings, req)) {
            if (narrativeToken.current !== token) return
            acc += delta
            setNarrative({ text: acc, streaming: true })
          }
          if (narrativeToken.current === token) setNarrative({ text: acc, streaming: false })
        } catch {
          if (narrativeToken.current === token) setNarrative(null)
        }
      })
    }
  }

  return (
    <div className="cn-modal-backdrop" onClick={onClose}>
      <div className="cn-modal" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cn-search-input"
          placeholder="Find Authentication, Database, a file, a function…"
          value={query}
          onChange={(e) => runQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />

        {!query && systems.length > 0 && (
          <div className="cn-chip-row">
            {systems.map((s) => (
              <button key={s.name} className="cn-chip" onClick={() => runQuery(s.name)}>
                {s.name}
              </button>
            ))}
          </div>
        )}

        {narrative && (
          <div className="cn-narrative">
            {narrative.text || '…'}
            {narrative.streaming && <span className="cn-cursor">▍</span>}
          </div>
        )}

        <div className="cn-results">
          {results.map((r) => (
            <div key={r.file.path} className="cn-result-row">
              <button className="cn-result-main" onClick={() => onOpenFile(r.file.path)}>
                <span className="cn-result-path">{r.file.path}</span>
                <span className="cn-muted"> — {r.reason}</span>
              </button>
              {r.file.imports.length > 0 && (
                <button className="cn-flow-btn" title="Trace flow from here" onClick={() => onOpenFlow(r.file.path)}>
                  ⤳ flow
                </button>
              )}
            </div>
          ))}
          {query && results.length === 0 && <div className="cn-muted">No matches in the indexed graph.</div>}
        </div>
      </div>
    </div>
  )
}
