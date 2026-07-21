import type { Language } from './types'

/** Raw import specifiers extracted from source text, before path resolution. */
export function extractImportSpecifiers(source: string, lang: Language): string[] {
  const specs: string[] = []
  switch (lang) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx': {
      // import ... from 'x'; export ... from 'x'; require('x'); dynamic import('x')
      const re = /(?:import|export)\s+(?:[^'"]*?from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)|import\(\s*['"]([^'"]+)['"]\s*\)/g
      for (const m of source.matchAll(re)) specs.push(m[1] || m[2] || m[3])
      break
    }
    case 'py': {
      // import x.y; from x.y import z
      const re = /^\s*(?:from\s+([.\w]+)\s+import|import\s+([.\w]+))/gm
      for (const m of source.matchAll(re)) specs.push(m[1] || m[2])
      break
    }
    case 'go': {
      // single: import "pkg"  or block: import ( "a" "b" )
      const block = source.match(/import\s*\(([^)]*)\)/)
      if (block) {
        for (const m of block[1].matchAll(/"([^"]+)"/g)) specs.push(m[1])
      }
      for (const m of source.matchAll(/^\s*import\s+"([^"]+)"/gm)) specs.push(m[1])
      break
    }
    case 'java': {
      for (const m of source.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+)(?:\.\*)?;/gm)) specs.push(m[1])
      break
    }
    case 'rb': {
      for (const m of source.matchAll(/^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/gm)) specs.push(m[1])
      break
    }
    case 'rs': {
      for (const m of source.matchAll(/^\s*use\s+([\w:]+)/gm)) specs.push(m[1])
      break
    }
  }
  return specs
}

/**
 * Filename → full-path index, used to resolve "absolute-style" specifiers
 * (Java's fully-qualified class names, Python's dotted module paths, Ruby's
 * load-path-relative requires) that don't start with '.' — these are real
 * in-repo imports, not external packages, but their source root (e.g.
 * `src/main/java/`) is virtually never the repo root, so a naive dot-to-slash
 * path can't be checked for exact membership; it has to be matched as a
 * suffix of some real path instead. Built once per graph build, reused across
 * every file's imports.
 */
export interface ImportIndex {
  allPaths: Set<string>
  byFilename: Map<string, string[]>
}

export function buildImportIndex(paths: string[]): ImportIndex {
  const byFilename = new Map<string, string[]>()
  for (const p of paths) {
    const name = p.slice(p.lastIndexOf('/') + 1)
    const existing = byFilename.get(name)
    if (existing) existing.push(p)
    else byFilename.set(name, [p])
  }
  return { allPaths: new Set(paths), byFilename }
}

/** Resolves `suffix` (e.g. "com/foo/Bar.java") to the one real path ending with it — null if zero or multiple candidates match, rather than guessing wrong. */
function resolveBySuffix(suffix: string, index: ImportIndex): string | null {
  const filename = suffix.slice(suffix.lastIndexOf('/') + 1)
  const candidates = index.byFilename.get(filename)
  if (!candidates) return null
  const matches = candidates.filter((p) => p === suffix || p.endsWith('/' + suffix))
  return matches.length === 1 ? matches[0] : null
}

/** JS/TS-style relative resolution: specifier is a slash-separated path relative to fromPath's directory. */
function resolveJsRelative(fromPath: string, specifier: string, allPaths: Set<string>): string | null {
  const fromDir = fromPath.split('/').slice(0, -1)
  const parts = specifier.split('/')
  const stack = [...fromDir]
  for (const part of parts) {
    if (part === '.' || part === '') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  const base = stack.join('/')
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
    `${base}/index.jsx`,
  ]
  for (const c of candidates) if (allPaths.has(c)) return c
  return null
}

/**
 * Python relative imports count leading dots (one dot = this file's own
 * package, each extra dot climbs one more directory) — a completely
 * different scheme from JS's slash-based '../', so it needs its own walker
 * rather than reusing resolveJsRelative.
 */
function resolvePythonRelative(fromPath: string, specifier: string, allPaths: Set<string>): string | null {
  const fromDir = fromPath.split('/').slice(0, -1)
  let i = 0
  while (specifier[i] === '.') i++
  const stack = [...fromDir]
  for (let d = 1; d < i; d++) stack.pop()
  const rest = specifier.slice(i)
  if (rest) stack.push(...rest.split('.'))
  const base = stack.join('/')
  if (allPaths.has(`${base}.py`)) return `${base}.py`
  if (allPaths.has(`${base}/__init__.py`)) return `${base}/__init__.py`
  return null
}

/**
 * Resolves an import specifier to a repo-relative file path, best-effort.
 * JS/TS specifiers are relative-path-only by convention, so a bare specifier
 * (no leading '.') is a real external package there. Java, Python, and Ruby
 * commonly import their OWN in-repo files without a leading '.' too (fully
 * qualified class names, absolute module paths, load-path-relative
 * requires) — treating every bare specifier as "external" for those
 * languages was silently dropping the large majority of their real edges.
 * Go and Rust also use bare module/crate paths for in-repo imports, but
 * resolving those correctly needs the module's declared root (go.mod's
 * `module` line, Cargo's crate name) which isn't parsed here — left
 * unresolved rather than guessed.
 */
export function resolveImportPath(
  fromPath: string,
  specifier: string,
  lang: Language,
  index: ImportIndex,
): string | null {
  if (specifier.startsWith('.')) {
    return lang === 'py' ? resolvePythonRelative(fromPath, specifier, index.allPaths) : resolveJsRelative(fromPath, specifier, index.allPaths)
  }
  if (lang === 'java') return resolveBySuffix(`${specifier.replace(/\./g, '/')}.java`, index)
  if (lang === 'py') {
    const converted = specifier.replace(/\./g, '/')
    return resolveBySuffix(`${converted}.py`, index) ?? resolveBySuffix(`${converted}/__init__.py`, index)
  }
  if (lang === 'rb') return resolveBySuffix(`${specifier}.rb`, index)
  return null // external package (JS/TS), or Go/Rust module path (unresolved — see above)
}

/** Best-effort export symbol extraction (JS/TS only for the fast first pass). */
export function extractExportedSymbols(source: string, lang: Language): string[] {
  if (lang !== 'ts' && lang !== 'tsx' && lang !== 'js' && lang !== 'jsx') return []
  const symbols: string[] = []
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g
  for (const m of source.matchAll(re)) symbols.push(m[1])
  return symbols
}
