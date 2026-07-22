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
 *
 * Also bump this on a pure correctness fix to how `imports`/`importedBy`
 * are computed (not just a shape change) — e.g. v3 -> v4 was import
 * resolution learning to handle Java/Python/Ruby's non-relative in-repo
 * imports; v4 -> v5 added Go module-path resolution via go.mod. The shape
 * didn't change either time, but every previously cached graph's edges were
 * silently wrong/incomplete, and a shape-only version check would have kept
 * serving that stale (structurally valid but wrong) data forever.
 */
export const REPO_GRAPH_SCHEMA_VERSION = 5

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
  /** How many code files actually had their content fetched/parsed — may be less than totalCodeFileCount on very large repos. */
  indexedFileCount: number
  /** Code files that matched an indexable extension, before any size cap was applied. */
  totalCodeFileCount: number
}

export interface Settings {
  githubPat?: string
  /** Provider is auto-detected from the key's own format at call time — see detectProvider() in lib/llm.ts. */
  llmApiKey?: string
  /** Only needed (and only shown in Settings) when the key doesn't match a recognized provider — the endpoint for any OpenAI-compatible API. */
  llmBaseUrl?: string
  /** Optional override of the provider's default model; required when llmBaseUrl is set (a custom endpoint has no sensible default to guess). */
  llmModel?: string
  dockSide?: 'left' | 'right'
  codeFont?: 'sans' | 'mono'
  onboardedAt?: number
}
