import { useEffect, useRef, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { getSettings } from '../lib/settings'
import { isLlmConfigured, streamCompletion } from '../lib/llm'
import { buildFilePurposePrompt } from '../lib/prompts'
import { fetchFileContent } from '../lib/github'

type State =
  | { kind: 'unconfigured' }
  | { kind: 'loading' }
  | { kind: 'streaming'; text: string }
  | { kind: 'done'; text: string }
  | { kind: 'error'; message: string }

export function PurposePanel({ graph, path }: { graph: RepoGraph; path: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const cancelledRef = useRef(false)

  useEffect(() => {
    cancelledRef.current = false
    setState({ kind: 'loading' })

    async function run() {
      const settings = await getSettings()
      if (!isLlmConfigured(settings)) {
        if (!cancelledRef.current) setState({ kind: 'unconfigured' })
        return
      }
      try {
        const [owner, repo] = graph.repoKey.split('/')
        const source = await fetchFileContent({ owner, repo }, graph.commitSha, path, settings.githubPat)
        if (cancelledRef.current) return

        const req = buildFilePurposePrompt(graph, path, source)
        let acc = ''
        setState({ kind: 'streaming', text: '' })
        for await (const delta of streamCompletion(settings, req)) {
          if (cancelledRef.current) return
          acc += delta
          setState({ kind: 'streaming', text: acc })
        }
        if (!cancelledRef.current) setState({ kind: 'done', text: acc })
      } catch (e) {
        if (!cancelledRef.current) {
          setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) })
        }
      }
    }

    run()
    return () => {
      cancelledRef.current = true
    }
  }, [graph, path])

  if (state.kind === 'unconfigured') {
    return (
      <div className="cn-section">
        <div className="cn-label">Purpose</div>
        <div className="cn-muted">
          <a href="#" onClick={openOptions} className="cn-link">
            Add an LLM key
          </a>{' '}
          to unlock a grounded explanation of this file.
        </div>
      </div>
    )
  }

  return (
    <div className="cn-section">
      <div className="cn-label">
        Purpose
        {state.kind !== 'error' && <span className="cn-badge cn-badge-inferred">LLM-inferred</span>}
      </div>
      {state.kind === 'loading' && <div className="cn-muted">Reading file…</div>}
      {(state.kind === 'streaming' || state.kind === 'done') && (
        <div className="cn-purpose-text">
          {state.text || '…'}
          {state.kind === 'streaming' && <span className="cn-cursor">▍</span>}
        </div>
      )}
      {state.kind === 'error' && <div className="cn-error">{state.message}</div>}
    </div>
  )
}

function openOptions(e: React.MouseEvent) {
  e.preventDefault()
  chrome.runtime.openOptionsPage()
}
