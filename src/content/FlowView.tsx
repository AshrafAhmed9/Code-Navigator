import { useEffect, useRef, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { traceFlow, flowToMermaid } from '../lib/flow'

let mermaidReady: Promise<typeof import('mermaid').default> | null = null
function loadMermaid() {
  // Lazy-loaded so the always-shipped content-script bundle stays small — mermaid
  // pulls in every diagram type (gantt, sequence, C4, ...) we don't use.
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then((mod) => {
      const mermaid = mod.default
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
      return mermaid
    })
  }
  return mermaidReady
}

export function FlowView({ graph, root, onClose }: { graph: RepoGraph; root: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string>('')
  const [loadingLib, setLoadingLib] = useState(true)

  useEffect(() => {
    const trace = traceFlow(graph, root)
    const definition = flowToMermaid(trace)
    const renderId = 'cn-flow-' + Math.random().toString(36).slice(2)

    let cancelled = false
    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return
        setLoadingLib(false)
        return mermaid.render(renderId, definition)
      })
      .then((result) => {
        if (!cancelled && result && containerRef.current) containerRef.current.innerHTML = result.svg
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [graph, root])

  return (
    <div>
      <div className="cn-flow-header">
        <div className="cn-label">Architecture flow from {root.split('/').pop()}</div>
        <button className="cn-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="cn-muted" style={{ marginBottom: 8 }}>
        Traced from the import graph — an edge means "imports," bounded to keep it readable.
      </div>
      {error ? (
        <div className="cn-error">{error}</div>
      ) : (
        <>
          {loadingLib && <div className="cn-muted">Loading diagram renderer…</div>}
          <div ref={containerRef} className="cn-flow-svg" />
        </>
      )}
    </div>
  )
}
