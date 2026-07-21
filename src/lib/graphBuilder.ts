import type { RepoRef, RepoTree, RepoGraph, FileNode } from './types'
import { REPO_GRAPH_SCHEMA_VERSION } from './types'
import { detectLanguage, isVendoredOrGenerated, isLikelyTestFile, CODE_EXTENSIONS } from './language'
import { extractImportSpecifiers, resolveRelativeImport, extractExportedSymbols } from './importExtract'
import { fetchManyFiles } from './github'

/**
 * A graph with the full file tree (allPaths) but no import/content data yet —
 * available the moment the repo tree is fetched, well before per-file content
 * indexing finishes. Lets the sidebar's Tree/Bookmarks/Recent tabs (which only
 * need allPaths/repoKey, not the import graph) become usable immediately
 * instead of being blocked behind the slowest part of indexing.
 */
export function buildSkeletonGraph(ref: Pick<RepoRef, 'owner' | 'repo'>, commitSha: string, tree: RepoTree): RepoGraph {
  return {
    schemaVersion: REPO_GRAPH_SCHEMA_VERSION,
    repoKey: `${ref.owner}/${ref.repo}`,
    commitSha,
    builtAt: Date.now(),
    files: {},
    entryPoints: [],
    languageBreakdown: {},
    allPaths: tree.entries.filter((e) => e.type === 'blob').map((e) => e.path),
    indexedFileCount: 0,
    totalCodeFileCount: 0,
  }
}

/**
 * Fetching and parsing every code file is one HTTP round-trip each — on a
 * repo with tens of thousands of files, no realistic concurrency finishes in
 * a reasonable time, and pushing concurrency higher risks tripping GitHub's
 * secondary (abuse-detection) rate limit regardless of the primary budget.
 * Past this many code files, indexing is bounded to a prioritized subset
 * instead of "eventually, everything" — reliability means a predictable
 * finish time on any repo size, not a technically-complete graph that never
 * arrives.
 */
const MAX_INDEXED_FILES = 1500

/** Entry-point-shaped files first, then shallower paths — a cheap proxy for "more central" before any real graph data exists yet. */
function prioritizeForIndexing(paths: string[]): string[] {
  const ENTRY_HINT = /(^|\/)(main|index|app|server|cmd)\.[a-z]+$/i
  return [...paths].sort((a, b) => {
    const aEntry = ENTRY_HINT.test(a) ? 0 : 1
    const bEntry = ENTRY_HINT.test(b) ? 0 : 1
    if (aEntry !== bEntry) return aEntry - bEntry
    const depthDiff = a.split('/').length - b.split('/').length
    if (depthDiff !== 0) return depthDiff
    return a.localeCompare(b)
  })
}

/**
 * Builds the file-level import graph for a repo. This is the "cheap, reliable,
 * high-value" layer from the plan — it never requires parsing every file's full
 * AST, just import statements, so it stays fast even on large repos.
 */
export async function buildImportGraph(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  commitSha: string,
  tree: RepoTree,
  pat: string | undefined,
  onProgress?: (done: number, total: number) => void,
): Promise<RepoGraph> {
  const allPaths = tree.entries.filter((e) => e.type === 'blob').map((e) => e.path)

  const codePaths = allPaths
    .filter((p) => !isVendoredOrGenerated(p))
    .filter((p) => CODE_EXTENSIONS.has(p.split('.').pop()?.toLowerCase() ?? ''))

  const totalCodeFileCount = codePaths.length
  const pathsToFetch = totalCodeFileCount > MAX_INDEXED_FILES
    ? prioritizeForIndexing(codePaths).slice(0, MAX_INDEXED_FILES)
    : codePaths
  const fetchSet = new Set(pathsToFetch)

  // Every code path counts as a valid import-resolution target, even the ones
  // whose own content isn't being fetched this pass — otherwise a fetched
  // file that imports a skipped one would silently lose that edge instead of
  // just not knowing the skipped file's own imports.
  const allPathSet = new Set(codePaths)
  // Each file is its own HTTP round-trip, so concurrency — not bandwidth — is
  // what dominates wall-clock time on large repos. A PAT'd request uses the
  // authenticated Contents API (5,000/hr budget), so it can run noticeably
  // more parallel fetches than the unauthenticated raw.githubusercontent.com
  // path without either one starving the other's separate rate limit.
  const concurrency = pat ? 24 : 12
  const contents = await fetchManyFiles(ref, commitSha, pathsToFetch, pat, concurrency, onProgress)

  const files: Record<string, FileNode> = {}
  const languageBreakdown: Record<string, number> = {}

  for (const path of codePaths) {
    const language = detectLanguage(path)
    languageBreakdown[language] = (languageBreakdown[language] ?? 0) + 1

    const source = fetchSet.has(path) ? contents.get(path) : undefined
    if (source === undefined) {
      files[path] = { path, language, imports: [], importedBy: [], exportedSymbols: [], size: 0 }
      continue
    }
    const specifiers = extractImportSpecifiers(source, language)
    const imports = specifiers
      .map((s) => resolveRelativeImport(path, s, allPathSet))
      .filter((p): p is string => p !== null)
    files[path] = {
      path,
      language,
      imports,
      importedBy: [],
      exportedSymbols: extractExportedSymbols(source, language),
      size: source.length,
    }
  }

  // reverse edges
  for (const file of Object.values(files)) {
    for (const imp of file.imports) {
      files[imp]?.importedBy.push(file.path)
    }
  }

  const entryPoints = detectEntryPoints(files)

  return {
    schemaVersion: REPO_GRAPH_SCHEMA_VERSION,
    repoKey: `${ref.owner}/${ref.repo}`,
    commitSha,
    builtAt: Date.now(),
    files,
    entryPoints,
    languageBreakdown,
    allPaths,
    indexedFileCount: pathsToFetch.length,
    totalCodeFileCount,
  }
}

function detectEntryPoints(files: Record<string, FileNode>): string[] {
  const NAME_HINTS = /(^|\/)(main|index|app|server|cmd)\.(ts|js|tsx|jsx|py|go|java)$/i
  const candidates = Object.values(files).filter(
    (f) => NAME_HINTS.test(f.path) || (f.importedBy.length === 0 && f.imports.length > 0),
  )
  return candidates
    .sort((a, b) => b.imports.length - a.imports.length)
    .slice(0, 10)
    .map((f) => f.path)
}

/** Files ranked by how many other files depend on them — the "load-bearing" files. */
export function mostDependedOn(graph: RepoGraph, limit = 5): FileNode[] {
  return Object.values(graph.files)
    .filter((f) => f.importedBy.length > 0)
    .sort((a, b) => b.importedBy.length - a.importedBy.length)
    .slice(0, limit)
}

/** Transitive closure of everything that (directly or indirectly) depends on `path`. */
export function computeImpact(graph: RepoGraph, path: string): { affected: string[]; risk: 'LOW' | 'MEDIUM' | 'HIGH' } {
  const visited = new Set<string>()
  const queue = [path]
  while (queue.length) {
    const cur = queue.shift()!
    const node = graph.files[cur]
    if (!node) continue
    for (const dependent of node.importedBy) {
      if (!visited.has(dependent)) {
        visited.add(dependent)
        queue.push(dependent)
      }
    }
  }
  const affected = Array.from(visited)
  const risk = affected.length > 15 ? 'HIGH' : affected.length > 5 ? 'MEDIUM' : 'LOW'
  return { affected, risk }
}

/**
 * Test files that directly import the changed file or anything in its impact
 * set — graph evidence for "what should I test?", not a guess.
 */
export function relatedTests(graph: RepoGraph, path: string, affected: string[]): string[] {
  const relevant = new Set([path, ...affected])
  const tests = new Set<string>()
  for (const file of Object.values(graph.files)) {
    if (!isLikelyTestFile(file.path)) continue
    if (file.imports.some((imp) => relevant.has(imp))) tests.add(file.path)
  }
  return Array.from(tests)
}
