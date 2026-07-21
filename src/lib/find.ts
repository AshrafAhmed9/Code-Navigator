import type { RepoGraph, FileNode } from './types'

export interface FindResult {
  file: FileNode
  score: number
  reason: string
}

/**
 * Heuristic search: filename/path/exported-symbol match, weighted by how
 * central the file is in the import graph (more-depended-on = more likely to
 * be the real entry point for a concept, not a leaf helper).
 */
export function findFiles(graph: RepoGraph, query: string, limit = 8): FindResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (terms.length === 0) return []

  const results: FindResult[] = []
  for (const file of Object.values(graph.files)) {
    const pathLower = file.path.toLowerCase()
    let score = 0
    let reason = ''

    for (const term of terms) {
      if (pathLower.includes(term)) {
        score += 10
        reason = 'path match'
      }
      const symbolHit = file.exportedSymbols.find((s) => s.toLowerCase().includes(term))
      if (symbolHit) {
        score += 8
        reason = `exports ${symbolHit}`
      }
    }
    if (score === 0) continue
    score += Math.min(file.importedBy.length, 10) // centrality bonus, capped
    results.push({ file, score, reason })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
