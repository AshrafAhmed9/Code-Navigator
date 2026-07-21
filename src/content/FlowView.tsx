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
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'strict',
        flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 40, rankSpacing: 60 },
        themeVariables: { fontSize: '16px' },
      })
      return mermaid
    })
  }
  return mermaidReady
}

const ZOOM_STEP = 0.2
const MIN_ZOOM = 0.4
const MAX_ZOOM = 3

/**
 * Rendered as a full-screen overlay (not embedded in the narrow sidebar) so the
 * diagram has real room — the sidebar is 340px wide, nowhere near enough for a
 * readable flowchart.
 */
export function FlowView({ graph, root, onClose }: { graph: RepoGraph; root: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string>('')
  const [loadingLib, setLoadingLib] = useState(true)
  const [zoom, setZoom] = useState(1.4)

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div className="cn-modal-backdrop" onClick={onClose}>
      <div className="cn-flow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cn-flow-header">
          <div>
            <div className="cn-h3" style={{ marginBottom: 2 }}>
              Architecture flow
            </div>
            <div className="cn-muted">
              from <strong style={{ color: '#c9d1d9' }}>{root}</strong> — traced from the import graph, an edge means
              "imports"
            </div>
          </div>
          <div className="cn-flow-controls">
            <button className="cn-flow-btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}>
              −
            </button>
            <span className="cn-muted" style={{ minWidth: 38, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="cn-flow-btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}>
              +
            </button>
            <button className="cn-close" onClick={onClose} title="Close (Esc)">
              ✕
            </button>
          </div>
        </div>

        {error ? (
          <div className="cn-error-block">{error}</div>
        ) : (
          <div className="cn-flow-viewport">
            {loadingLib && (
              <div className="cn-loading" style={{ padding: 24 }}>
                <span className="cn-spinner" />
                Loading diagram renderer…
              </div>
            )}
            <div ref={containerRef} className="cn-flow-svg" style={{ transform: `scale(${zoom})` }} />
          </div>
        )}
      </div>
    </div>
  )
}
