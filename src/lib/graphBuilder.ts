import type { RepoRef, RepoTree, RepoGraph, FileNode } from './types'
import { detectLanguage, isVendoredOrGenerated, isLikelyTestFile, CODE_EXTENSIONS } from './language'
import { extractImportSpecifiers, resolveRelativeImport, extractExportedSymbols } from './importExtract'
import { fetchManyFiles } from './github'

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
  const codePaths = tree.entries
    .filter((e) => e.type === 'blob')
    .map((e) => e.path)
    .filter((p) => !isVendoredOrGenerated(p))
    .filter((p) => CODE_EXTENSIONS.has(p.split('.').pop()?.toLowerCase() ?? ''))

  const allPathSet = new Set(codePaths)
  const contents = await fetchManyFiles(ref, commitSha, codePaths, pat, 8, onProgress)

  const files: Record<string, FileNode> = {}
  const languageBreakdown: Record<string, number> = {}

  for (const path of codePaths) {
    const source = contents.get(path)
    const language = detectLanguage(path)
    languageBreakdown[language] = (languageBreakdown[language] ?? 0) + 1
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
    repoKey: `${ref.owner}/${ref.repo}`,
    commitSha,
    builtAt: Date.now(),
    files,
    entryPoints,
    languageBreakdown,
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
