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

export interface RepoGraph {
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
}
