import { useEffect, useMemo, useState } from 'react'
import { parsePullRequestUrl, fetchPrInfo, resolveCommitSha, fetchRepoTree, type PrRef } from '../lib/github'
import { buildImportGraph, computeImpact } from '../lib/graphBuilder'
import { relatedTests } from '../lib/graphBuilder'
import { getGraph, setGraph, graphKey } from '../lib/cache'
import { getSettings } from '../lib/settings'
import { detectCoreSystems } from '../lib/systems'
import { buildExplainPrPrompt } from '../lib/prompts'
import { NarrativePanel } from './NarrativePanel'
import type { RepoGraph } from '../lib/types'

type Status = 'idle' | 'loading' | 'ready' | 'error'

interface PrImpact {
  changedFile: string
  affectedCount: number
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
  testCount: number
  inGraph: boolean
}

export function PrPanel({ pr }: { pr: PrRef }) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<PrImpact[]>([])
  const [graph, setGraphState] = useState<RepoGraph | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [prMeta, setPrMeta] = useState({ title: '', body: '' })

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        setStatus('loading')
        const settings = await getSettings()
        const { headSha, changedFiles, title, body } = await fetchPrInfo(pr, settings.githubPat)
        if (cancelled) return
        setPrMeta({ title, body })

        const key = graphKey(pr.owner, pr.repo, headSha)
        let g = await getGraph(key)
        if (!g) {
          const commitSha = headSha || (await resolveCommitSha({ ...pr, ref: 'HEAD' }, settings.githubPat))
          const tree = await fetchRepoTree(pr, commitSha, settings.githubPat)
          g = await buildImportGraph(pr, commitSha, tree, settings.githubPat, (done, total) => {
            if (!cancelled) setProgress({ done, total })
          })
          if (cancelled) return
          await setGraph(key, g)
        }
        if (cancelled) return
        setGraphState(g)

        const impactRows: PrImpact[] = changedFiles.map((path) => {
          const inGraph = !!g!.files[path]
          if (!inGraph) return { changedFile: path, affectedCount: 0, risk: 'LOW', testCount: 0, inGraph: false }
          const impact = computeImpact(g!, path)
          const tests = relatedTests(g!, path, impact.affected)
          return { changedFile: path, affectedCount: impact.affected.length, risk: impact.risk, testCount: tests.length, inGraph: true }
        })
        impactRows.sort((a, b) => b.affectedCount - a.affectedCount)
        if (!cancelled) {
          setRows(impactRows)
          setStatus('ready')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [pr])

  const totalAffected = new Set(
    rows.flatMap((r) => (r.inGraph && graph ? computeImpact(graph, r.changedFile).affected : [])),
  ).size
  const totalTests = new Set(
    rows.flatMap((r) => (r.inGraph && graph ? relatedTests(graph, r.changedFile, computeImpact(graph, r.changedFile).affected) : [])),
  ).size
  const overallRisk = rows.some((r) => r.risk === 'HIGH') ? 'HIGH' : rows.some((r) => r.risk === 'MEDIUM') ? 'MEDIUM' : 'LOW'

  const changedPaths = new Set(rows.map((r) => r.changedFile))
  const affectedSystems = useMemo(
    () => (graph ? detectCoreSystems(graph).filter((s) => s.files.some((f) => changedPaths.has(f.path))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, rows],
  )
  const reviewOrder = rows.map((r) => r.changedFile) // already sorted by affectedCount desc

  return (
    <div>
      <h3 className="cn-h3">PR Impact</h3>
      <div className="cn-muted">
        #{pr.number} — {pr.owner}/{pr.repo}
      </div>

      {status === 'loading' && (
        <p className="cn-muted">
          {progress.total > 0 ? `Indexing ${progress.done}/${progress.total} files…` : 'Loading PR…'}
        </p>
      )}
      {status === 'error' && <p className="cn-error">{error}</p>}

      {status === 'ready' && (
        <>
          <NarrativePanel
            label="Explain this PR"
            deps={[graph, rows, prMeta]}
            buildRequest={() =>
              buildExplainPrPrompt(
                prMeta.title,
                prMeta.body,
                rows.map((r) => ({ path: r.changedFile, risk: r.risk, affectedCount: r.affectedCount })),
                affectedSystems,
                reviewOrder,
              )
            }
          />

          <div className="cn-section">
            <div className="cn-label">
              Overall risk
              <span className={`cn-risk cn-risk-${overallRisk.toLowerCase()}`}>{overallRisk}</span>
            </div>
            <div className="cn-muted">
              This PR touches {rows.length} file{rows.length === 1 ? '' : 's'}, affecting{' '}
              <strong>{totalAffected}</strong> other file{totalAffected === 1 ? '' : 's'} and{' '}
              <strong>{totalTests}</strong> related test{totalTests === 1 ? '' : 's'} by import-graph evidence.
            </div>
          </div>

          <div className="cn-section">
            <div className="cn-label">Changed files</div>
            {rows.map((r) => (
              <div key={r.changedFile} className="cn-pr-row">
                <a
                  className="cn-file-row cn-link"
                  href={`https://github.com/${pr.owner}/${pr.repo}/blob/${graph?.commitSha ?? ''}/${r.changedFile}`}
                  title={r.changedFile}
                >
                  <span className="cn-file-path">{r.changedFile}</span>
                </a>
                {r.inGraph ? (
                  <span className={`cn-risk cn-risk-${r.risk.toLowerCase()}`}>
                    {r.affectedCount} affected · {r.testCount} tests
                  </span>
                ) : (
                  <span className="cn-muted">not indexed (non-code or too large)</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function usePrRef(): PrRef | null {
  const [pr, setPr] = useState<PrRef | null>(() => parsePullRequestUrl(window.location.href))
  useEffect(() => {
    const check = () => setPr(parsePullRequestUrl(window.location.href))
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true, subtree: false })
    window.addEventListener('popstate', check)
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', check)
    }
  }, [])
  return pr
}
