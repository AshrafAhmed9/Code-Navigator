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
  /** Present only when a root go.mod was found — see resolveGoImport. */
  go?: { modulePath: string; byDir: Map<string, string[]> }
}

export function buildImportIndex(paths: string[], goModulePath?: string | null): ImportIndex {
  const byFilename = new Map<string, string[]>()
  for (const p of paths) {
    const name = p.slice(p.lastIndexOf('/') + 1)
    const existing = byFilename.get(name)
    if (existing) existing.push(p)
    else byFilename.set(name, [p])
  }

  let go: ImportIndex['go']
  if (goModulePath) {
    const byDir = new Map<string, string[]>()
    for (const p of paths) {
      if (!p.endsWith('.go')) continue
      const slash = p.lastIndexOf('/')
      const dir = slash === -1 ? '' : p.slice(0, slash)
      const existing = byDir.get(dir)
      if (existing) existing.push(p)
      else byDir.set(dir, [p])
    }
    go = { modulePath: goModulePath, byDir }
  }

  return { allPaths: new Set(paths), byFilename, go }
}

/**
 * Go imports are full paths like "github.com/owner/repo/internal/foo" —
 * `github.com/owner/repo` is the module root declared in go.mod, and the
 * remainder is the repo-relative directory of the imported PACKAGE (Go
 * imports a package/directory, not a specific file). Resolves to one
 * representative non-test file in that directory so it still functions as a
 * usable graph edge; a real per-symbol call graph isn't attempted.
 */
function resolveGoImport(specifier: string, go: NonNullable<ImportIndex['go']>): string | null {
  let dir: string
  if (specifier === go.modulePath) dir = ''
  else if (specifier.startsWith(go.modulePath + '/')) dir = specifier.slice(go.modulePath.length + 1)
  else return null // external package (stdlib or a different module) — not in this repo

  const files = go.byDir.get(dir)
  if (!files || files.length === 0) return null
  const nonTest = files.filter((f) => !f.endsWith('_test.go'))
  return (nonTest.length > 0 ? nonTest : files).slice().sort()[0]
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
 * Rust's `use a::b::c;` doesn't syntactically distinguish a module path from
 * an imported ITEM name — unlike Python's `from X import Y` (whose regex
 * only captures X), the whole "a::b::c" is captured as one specifier, and
 * the trailing segment might be a submodule file OR a struct/fn/enum
 * defined inside the second-to-last segment's file. Tries the full path as
 * a module first, then the path with its last segment dropped (item inside
 * a module) — covers the overwhelmingly common "import one item" case
 * without deep ambiguity resolution.
 */
function tryRustPath(base: string, allPaths: Set<string>): string | null {
  if (allPaths.has(`${base}.rs`)) return `${base}.rs`
  if (allPaths.has(`${base}/mod.rs`)) return `${base}/mod.rs`
  return null
}

function resolveRustSegments(segments: string[], resolve: (base: string) => string | null): string | null {
  if (segments.length === 0) return null
  const full = resolve(segments.join('/'))
  if (full) return full
  if (segments.length > 1) return resolve(segments.slice(0, -1).join('/'))
  return null
}

/**
 * `use crate::a::b::Thing;` is absolute from the crate root, resolved the
 * same way as Java/Python — suffix-matched, since the crate root is
 * `src/lib.rs`/`src/main.rs`, never the repo root, and a workspace member
 * adds another directory level on top of that.
 */
function resolveRustCratePath(rest: string, index: ImportIndex): string | null {
  const segments = rest.split('::').filter(Boolean)
  return resolveRustSegments(segments, (base) => resolveBySuffix(`${base}.rs`, index) ?? resolveBySuffix(`${base}/mod.rs`, index))
}

/**
 * `self::` and `super::` are relative to the CURRENT file's position in the
 * module tree, which for a plain (non-mod.rs) file is just its own
 * directory — an approximation, since a `mod foo { ... }` block declared
 * inline in code (rather than as a separate file) has no filesystem
 * counterpart at all and isn't something this can see.
 */
function resolveRustModRelative(fromPath: string, rest: string, up: number, allPaths: Set<string>): string | null {
  const dir = fromPath.split('/').slice(0, -1 - up)
  const segments = rest.split('::').filter(Boolean)
  return resolveRustSegments(segments, (base) => tryRustPath([...dir, base].join('/'), allPaths))
}

/**
 * Resolves an import specifier to a repo-relative file path, best-effort.
 * JS/TS specifiers are relative-path-only by convention, so a bare specifier
 * (no leading '.') is a real external package there. Java, Python, Ruby, and
 * Rust's `crate::`/`self::`/`super::` paths commonly import their OWN
 * in-repo files without a leading '.' too (fully qualified class names,
 * absolute module paths, load-path-relative requires, crate-relative module
 * paths) — treating every bare specifier as "external" for those languages
 * was silently dropping the large majority of their real edges. Go also uses
 * bare module paths for in-repo imports, resolved via go.mod's declared
 * module root (see resolveGoImport/buildImportIndex) when a root go.mod was
 * found. A bare Rust specifier that isn't crate/self/super-relative (e.g.
 * `use serde::Deserialize;`) is a genuinely external crate, left unresolved.
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
  if (lang === 'go') return index.go ? resolveGoImport(specifier, index.go) : null
  if (lang === 'rs') {
    if (specifier === 'crate' || specifier.startsWith('crate::')) {
      return resolveRustCratePath(specifier.slice('crate'.length).replace(/^::/, ''), index)
    }
    if (specifier === 'self' || specifier.startsWith('self::')) {
      return resolveRustModRelative(fromPath, specifier.slice('self'.length).replace(/^::/, ''), 0, index.allPaths)
    }
    if (specifier === 'super' || specifier.startsWith('super::')) {
      return resolveRustModRelative(fromPath, specifier.slice('super'.length).replace(/^::/, ''), 1, index.allPaths)
    }
    return null // external crate or std/core — not in this repo
  }
  return null // external package (JS/TS)
}

/** Best-effort export symbol extraction (JS/TS only for the fast first pass). */
export function extractExportedSymbols(source: string, lang: Language): string[] {
  if (lang !== 'ts' && lang !== 'tsx' && lang !== 'js' && lang !== 'jsx') return []
  const symbols: string[] = []
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g
  for (const m of source.matchAll(re)) symbols.push(m[1])
  return symbols
}
