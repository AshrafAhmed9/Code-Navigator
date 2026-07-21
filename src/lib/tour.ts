import type { RepoGraph } from './types'
import { traceFlow } from './flow'

export interface TourStep {
  path: string
  order: number
  minutes: number
  reason: string
}

export interface Tour {
  root: string
  steps: TourStep[]
  totalMinutes: number
}

/** Rough reading-speed heuristic for skimming code, not prose: ~800 chars/minute. */
function estimateMinutes(sizeChars: number): number {
  return Math.max(1, Math.round(sizeChars / 800))
}

/**
 * Turns the import graph into an ordered reading list instead of a pile of
 * files: start at the entry point, then read what it pulls in, in the order
 * it's discovered — the same order you'd naturally trace through the code by
 * hand, just done for you. Reuses traceFlow's BFS (flow.ts) so the ordering
 * and bounding logic (readable node/depth caps) stays in one place.
 */
export function buildTour(graph: RepoGraph, root: string, maxSteps = 8): Tour {
  const trace = traceFlow(graph, root, maxSteps, 4)
  const nodeIndex = new Map(trace.nodes.map((n, i) => [n, i]))

  // For each file, remember which earlier-in-the-tour file is the reason it's
  // here — the edge whose source appears earliest in the reading order.
  const introducedBy = new Map<string, string>()
  for (const edge of trace.edges) {
    if (edge.to === root) continue
    const existingSource = introducedBy.get(edge.to)
    const candidateRank = nodeIndex.get(edge.from) ?? Infinity
    const existingRank = existingSource ? (nodeIndex.get(existingSource) ?? Infinity) : Infinity
    if (candidateRank < existingRank) introducedBy.set(edge.to, edge.from)
  }

  const steps: TourStep[] = trace.nodes.map((path, i) => {
    const file = graph.files[path]
    const minutes = estimateMinutes(file?.size ?? 0)
    const parent = introducedBy.get(path)
    const reason = i === 0 ? 'Entry point — start here' : `Used by ${parent ? parent.split('/').pop() : 'the previous step'}`
    return { path, order: i + 1, minutes, reason }
  })

  return { root, steps, totalMinutes: steps.reduce((sum, s) => sum + s.minutes, 0) }
}
