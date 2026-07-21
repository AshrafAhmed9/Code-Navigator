import type { RepoGraph } from './types'

export interface FlowEdge {
  from: string
  to: string
}

export interface FlowTrace {
  root: string
  nodes: string[]
  edges: FlowEdge[]
  truncated: boolean
}

/**
 * BFS outward from an entry point through the import graph, bounded in both
 * depth and node count so it stays a readable diagram, not a hairball.
 */
export function traceFlow(graph: RepoGraph, root: string, maxNodes = 18, maxDepth = 4): FlowTrace {
  const nodes: string[] = []
  const edges: FlowEdge[] = []
  const visited = new Set<string>([root])
  const queue: Array<{ path: string; depth: number }> = [{ path: root, depth: 0 }]
  let truncated = false

  while (queue.length > 0 && nodes.length < maxNodes) {
    const { path, depth } = queue.shift()!
    nodes.push(path)
    if (depth >= maxDepth) continue

    const file = graph.files[path]
    if (!file) continue
    for (const imp of file.imports) {
      if (nodes.length + queue.length >= maxNodes) {
        truncated = true
        break
      }
      edges.push({ from: path, to: imp })
      if (!visited.has(imp)) {
        visited.add(imp)
        queue.push({ path: imp, depth: depth + 1 })
      }
    }
  }

  return { root, nodes, edges, truncated: truncated || queue.length > 0 }
}

function mermaidId(path: string): string {
  return 'n' + path.replace(/[^a-zA-Z0-9]/g, '_')
}

function shortLabel(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.length > 28 ? base.slice(0, 25) + '…' : base
}

export function flowToMermaid(trace: FlowTrace): string {
  const lines = ['flowchart TD']
  for (const node of trace.nodes) {
    const id = mermaidId(node)
    const label = shortLabel(node).replace(/"/g, "'")
    const shape = node === trace.root ? `${id}(["${label}"])` : `${id}["${label}"]`
    lines.push(`  ${shape}`)
  }
  for (const edge of trace.edges) {
    if (!trace.nodes.includes(edge.from) || !trace.nodes.includes(edge.to)) continue
    lines.push(`  ${mermaidId(edge.from)} --> ${mermaidId(edge.to)}`)
  }
  if (trace.truncated) {
    lines.push(`  ${mermaidId(trace.root)}_more["… more not shown"]`)
    lines.push(`  ${mermaidId(trace.root)} -.-> ${mermaidId(trace.root)}_more`)
  }
  return lines.join('\n')
}
