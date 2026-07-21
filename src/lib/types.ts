export interface RepoRef {
  owner: string
  repo: string
  ref: string // branch, tag, or "HEAD"
}

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

export interface RepoTree {
  sha: string // resolved commit SHA — cache key
  entries: TreeEntry[]
  truncated: boolean
}

export interface FileNode {
  path: string
  language: Language
  imports: string[] // resolved paths this file imports (best-effort)
  importedBy: string[] // reverse edges, filled in after full graph build
  exportedSymbols: string[]
  size: number
}

export type Language =
  | 'ts'
  | 'js'
  | 'tsx'
  | 'jsx'
  | 'py'
  | 'go'
  | 'java'
  | 'rb'
  | 'rs'
  | 'other'

/**
 * Bump this whenever RepoGraph's shape changes (new/renamed/removed fields).
 * A graph cached under an older schema version is discarded rather than used
 * as-is — reading a stale shape (e.g. a graph cached before `allPaths`
 * existed) crashes downstream code with "X is not iterable" deep inside a
 * useMemo, which React has no way to recover from short of unmounting the
 * whole sidebar. See src/lib/cache.ts.
 */
export const REPO_GRAPH_SCHEMA_VERSION = 2

export interface RepoGraph {
  schemaVersion: number
  repoKey: string // owner/repo
  commitSha: string
  builtAt: number
  files: Record<string, FileNode>
  entryPoints: string[]
  languageBreakdown: Record<string, number>
  /** Every blob path in the repo tree, not just indexed code files — powers the file tree browser. */
  allPaths: string[]
}

export interface Settings {
  githubPat?: string
  llmProvider?: 'anthropic' | 'openai'
  llmApiKey?: string
  llmModel?: string
  dockSide?: 'left' | 'right'
  codeFont?: 'sans' | 'mono'
  onboardedAt?: number
}
