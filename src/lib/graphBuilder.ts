import type { RepoRef, RepoTree, RepoGraph, FileNode } from './types'
import { REPO_GRAPH_SCHEMA_VERSION } from './types'
import { detectLanguage, isVendoredOrGenerated, isLikelyTestFile, CODE_EXTENSIONS } from './language'
import {
  extractImportSpecifiers,
  resolveImportPath,
  buildImportIndex,
  extractExportedSymbols,
  parseTsConfig,
  type TsPathConfig,
} from './importExtract'
import { fetchManyFiles, fetchManyFilesGraphQL, fetchFileContent } from './github'

/**
 * Reads the root tsconfig.json (or jsconfig.json), following one `extends`
 * hop for the common monorepo pattern of a package config extending a shared
 * base config — a real path-alias config split across two files is still
 * usable, not silently ignored. Only ever looks at the repo root; a config
 * that lives elsewhere (e.g. a workspace member's own tsconfig with its own
 * aliases) isn't found, same limitation as go.mod's root-only lookup.
 */
async function loadTsPathConfig(
  ref: Pick<RepoRef, 'owner' | 'repo'>,
  commitSha: string,
  pat: string | undefined,
  codePaths: string[],
): Promise<TsPathConfig | null> {
  if (!codePaths.some((p) => /\.(ts|tsx|js|jsx)$/.test(p))) return null

  for (const filename of ['tsconfig.json', 'jsconfig.json']) {
    let text: string
    try {
      text = await fetchFileContent(ref, commitSha, filename, pat)
    } catch {
      continue // try the next filename
    }

    let parsed = parseTsConfig(text)
    if (!parsed) continue

    if (parsed.baseUrl === undefined && !parsed.paths && parsed.extends?.startsWith('.')) {
      try {
        const extPath = parsed.extends.replace(/^\.\//, '').replace(/\.json$/, '') + '.json'
        const extText = await fetchFileContent(ref, commitSha, extPath, pat)
        parsed = parseTsConfig(extText) ?? parsed
      } catch {
        // extended config not found/fetchable — fall through with whatever the base config had (likely nothing)
      }
    }

    if (parsed.baseUrl !== undefined || (parsed.paths && Object.keys(parsed.paths).length > 0)) {
      return { baseUrl: parsed.baseUrl ?? '', paths: parsed.paths ?? {} }
    }
  }
  return null
}

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
 * With a token, indexing goes through GitHub's GraphQL API (fetchManyFilesGraphQL),
 * which batches ~80 files into a single HTTP request — the request-count
 * bottleneck that justified a low cap essentially disappears (a 20,000-file
 * repo is ~250 requests, not 20,000), so the cap can be raised by more than
 * an order of magnitude. Without a token, GraphQL isn't available at all
 * (no anonymous tier) and indexing falls back to one REST request per file,
 * where the original, tighter cap still applies — that path is both more
 * request-expensive AND more exposed to GitHub's secondary abuse-detection
 * limit under high concurrency.
 */
const MAX_INDEXED_FILES_WITH_TOKEN = 20000
const MAX_INDEXED_FILES_WITHOUT_TOKEN = 1500

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

  const maxIndexedFiles = pat ? MAX_INDEXED_FILES_WITH_TOKEN : MAX_INDEXED_FILES_WITHOUT_TOKEN
  const totalCodeFileCount = codePaths.length
  const pathsToFetch = totalCodeFileCount > maxIndexedFiles
    ? prioritizeForIndexing(codePaths).slice(0, maxIndexedFiles)
    : codePaths
  const fetchSet = new Set(pathsToFetch)

  // Go imports are full module paths (e.g. "github.com/owner/repo/internal/foo"),
  // resolvable only by knowing the module's own declared root — fetch the
  // root go.mod once (cheap, cached like any other file) so Go's import
  // graph isn't silently empty. Absent/unparseable go.mod (multi-module
  // repo, non-standard layout) just leaves Go imports unresolved, same as
  // before this existed.
  let goModulePath: string | null = null
  if (codePaths.some((p) => p.endsWith('.go'))) {
    try {
      const goMod = await fetchFileContent(ref, commitSha, 'go.mod', pat)
      goModulePath = goMod.match(/^\s*module\s+(\S+)/m)?.[1] ?? null
    } catch {
      // no root go.mod, or fetch failed — leave Go imports unresolved
    }
  }

  // Path aliases (tsconfig/jsconfig "@/..." style) are real in-repo imports
  // that would otherwise be indistinguishable from an external npm package —
  // see loadTsPathConfig and resolveTsPathAlias.
  const tsPathConfig = await loadTsPathConfig(ref, commitSha, pat, codePaths)

  // Every code path counts as a valid import-resolution target, even the ones
  // whose own content isn't being fetched this pass — otherwise a fetched
  // file that imports a skipped one would silently lose that edge instead of
  // just not knowing the skipped file's own imports.
  const importIndex = buildImportIndex(codePaths, goModulePath, tsPathConfig)
  // GraphQL batching (~80 files/request) is the primary path whenever a token
  // is available — it's both dramatically faster (request count, not
  // concurrency, was always the real bottleneck) and lighter on the rate
  // limit than fetching one file per REST request. Falls back to the REST
  // concurrent pool if GraphQL comes back completely empty (e.g. a token
  // scoped without GraphQL access, or an org that disabled it) — a partial
  // graph from a fallback beats no graph at all.
  let contents: Map<string, string>
  if (pat) {
    contents = await fetchManyFilesGraphQL(ref, commitSha, pathsToFetch, pat, onProgress)
    if (contents.size === 0 && pathsToFetch.length > 0) {
      contents = await fetchManyFiles(ref, commitSha, pathsToFetch, pat, 24, onProgress)
    }
  } else {
    // No token means no GraphQL access at all (GitHub's GraphQL API has no
    // anonymous tier) — one REST request per file, at a lower concurrency to
    // stay further under the unauthenticated budget and abuse-detection limit.
    contents = await fetchManyFiles(ref, commitSha, pathsToFetch, pat, 12, onProgress)
  }

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
      .map((s) => resolveImportPath(path, s, language, importIndex))
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
