import { useCallback, useEffect, useRef, useState } from 'react'
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
        flowchart: { htmlLabels: true, curve: 'basis', nodeSpacing: 40, rankSpacing: 60, padding: 20, wrappingWidth: 260 },
      })
      return mermaid
    })
  }
  return mermaidReady
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 4
const FIT_MARGIN = 0.9 // leave a little breathing room around the diagram

/**
 * Rendered as a full-screen overlay (not embedded in the narrow sidebar) so the
 * diagram has real room. Diagrams range from 2 nodes to dozens, so the initial
 * zoom is computed to fit the actual rendered SVG to the viewport instead of a
 * fixed scale (some were tiny, some overflowed). Panning is drag-based, like a
 * canvas, since native scroll fights with a scale transform.
 */
export function FlowView({ graph, root, onClose }: { graph: RepoGraph; root: string; onClose: () => void }) {
  const svgHostRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const naturalSize = useRef({ width: 0, height: 0 })
  const [error, setError] = useState<string>('')
  const [loadingLib, setLoadingLib] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current
    const { width, height } = naturalSize.current
    if (!viewport || !width || !height) return
    const scale = Math.min((viewport.clientWidth / width) * FIT_MARGIN, (viewport.clientHeight / height) * FIT_MARGIN)
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale)))
    setPan({ x: 0, y: 0 })
  }, [])

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
        if (cancelled || !result || !svgHostRef.current) return
        svgHostRef.current.innerHTML = result.svg
        const svgEl = svgHostRef.current.querySelector('svg')
        if (svgEl) {
          const viewBox = svgEl.getAttribute('viewBox')?.split(/\s+/).map(Number)
          const width = viewBox?.[2] || svgEl.getBoundingClientRect().width || 800
          const height = viewBox?.[3] || svgEl.getBoundingClientRect().height || 400
          naturalSize.current = { width, height }
          setZoom(0.5)
          setPan({ x: 0, y: 0 })
        }
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

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setDragging(true)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setPan({ x: dragState.current.panX + dx, y: dragState.current.panY + dy })
  }
  function onPointerUp() {
    dragState.current = null
    setDragging(false)
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY * 0.0015
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + z * delta)))
  }

  return (
    <div className="cn-modal-backdrop" onClick={onClose}>
      <div className="cn-flow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cn-flow-header">
          <div>
            <div className="cn-h3" style={{ marginBottom: 2 }}>
              Architecture flow
            </div>
            <div className="cn-muted">
              from <strong style={{ color: '#c9d1d9' }}>{root}</strong> — drag to pan, scroll to zoom
            </div>
          </div>
          <div className="cn-flow-controls">
            <button className="cn-flow-btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.2))}>
              −
            </button>
            <span className="cn-muted" style={{ minWidth: 38, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="cn-flow-btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))}>
              +
            </button>
            <button className="cn-flow-btn" onClick={fitToViewport} title="Fit to screen">
              Fit
            </button>
            <button className="cn-close" onClick={onClose} title="Close (Esc)">
              ✕
            </button>
          </div>
        </div>

        {error ? (
          <div className="cn-error-block">{error}</div>
        ) : (
          <div
            ref={viewportRef}
            className={`cn-flow-viewport ${dragging ? 'cn-flow-dragging' : ''}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onWheel={onWheel}
          >
            {loadingLib && (
              <div className="cn-loading" style={{ padding: 24 }}>
                <span className="cn-spinner" />
                Loading diagram renderer…
              </div>
            )}
            <div
              ref={svgHostRef}
              className="cn-flow-svg"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
