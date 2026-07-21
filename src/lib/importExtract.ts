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

/** Best-effort resolution of a relative import specifier to a repo-relative file path. */
export function resolveRelativeImport(
  fromPath: string,
  specifier: string,
  allPaths: Set<string>,
): string | null {
  if (!specifier.startsWith('.')) return null // external package, not in-repo
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
    `${base}.py`,
    `${base}.go`,
  ]
  for (const c of candidates) if (allPaths.has(c)) return c
  return null
}

/** Best-effort export symbol extraction (JS/TS only for the fast first pass). */
export function extractExportedSymbols(source: string, lang: Language): string[] {
  if (lang !== 'ts' && lang !== 'tsx' && lang !== 'js' && lang !== 'jsx') return []
  const symbols: string[] = []
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g
  for (const m of source.matchAll(re)) symbols.push(m[1])
  return symbols
}
