import type { Language } from './types'

type SupportedLang = 'javascript' | 'typescript' | 'tsx'

const LANGUAGE_MAP: Partial<Record<Language, SupportedLang>> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
}

export function isTreeSitterSupported(lang: Language): boolean {
  return lang in LANGUAGE_MAP
}

export interface ParsedDefinition {
  name: string
  kind: 'function' | 'method' | 'class' | 'arrow'
  startLine: number
  endLine: number
}

export interface ParsedCallSite {
  name: string
  line: number
}

export interface ParseResult {
  path: string
  definitions: ParsedDefinition[]
  callSites: ParsedCallSite[]
}

// Node type names are shared across the javascript/typescript/tsx tree-sitter
// grammars (typescript and tsx are built as supersets of javascript's grammar),
// so one query set covers all three languages we support.
const DEFINITIONS_QUERY = `
(function_declaration name: (identifier) @name) @def.function
(method_definition name: (property_identifier) @name) @def.method
(class_declaration name: (_) @name) @def.class
(variable_declarator name: (identifier) @name value: (arrow_function)) @def.arrow
(variable_declarator name: (identifier) @name value: (function_expression)) @def.function
`

const CALLS_QUERY = `
(call_expression function: (identifier) @call)
(call_expression function: (member_expression property: (property_identifier) @call))
`

/**
 * Runs directly on the content script's main thread — NOT in a Web Worker.
 * github.com's own Content-Security-Policy restricts worker-src to GitHub's
 * own asset domains (github.githubassets.com, github.com/assets-cdn/worker/,
 * ...), which blocks *any* extension-created Worker outright, blob: URL or
 * otherwise — confirmed via a real console error, not a guess. That's a page
 * restriction we can't configure around from the extension side. Since this
 * only ever parses one already-fetched file at a time (never a repo-wide
 * crawl), running it on the main thread is an acceptable, fast tradeoff.
 */
let treeSitterModule: typeof import('web-tree-sitter') | null = null
let initPromise: Promise<void> | null = null
const languageCache = new Map<SupportedLang, InstanceType<typeof import('web-tree-sitter').Language>>()
const queryCache = new Map<
  InstanceType<typeof import('web-tree-sitter').Language>,
  { definitions: InstanceType<typeof import('web-tree-sitter').Query>; calls: InstanceType<typeof import('web-tree-sitter').Query> }
>()

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = import('web-tree-sitter').then(async (mod) => {
      treeSitterModule = mod
      await mod.Parser.init({
        locateFile: (path: string) => (path.endsWith('.wasm') ? chrome.runtime.getURL('wasm/web-tree-sitter.wasm') : path),
      })
    })
  }
  await initPromise
}

const LANG_WASM_PATH: Record<SupportedLang, string> = {
  javascript: 'wasm/tree-sitter-javascript.wasm',
  typescript: 'wasm/tree-sitter-typescript.wasm',
  tsx: 'wasm/tree-sitter-tsx.wasm',
}

async function getLanguage(lang: SupportedLang) {
  const cached = languageCache.get(lang)
  if (cached) return cached
  const language = await treeSitterModule!.Language.load(chrome.runtime.getURL(LANG_WASM_PATH[lang]))
  languageCache.set(lang, language)
  return language
}

function getQueries(language: InstanceType<typeof import('web-tree-sitter').Language>) {
  const cached = queryCache.get(language)
  if (cached) return cached
  const Query = treeSitterModule!.Query
  const queries = { definitions: new Query(language, DEFINITIONS_QUERY), calls: new Query(language, CALLS_QUERY) }
  queryCache.set(language, queries)
  return queries
}

/**
 * Real AST-based function/call extraction for the currently-open file, as an
 * upgrade over the regex-based exportedSymbols already in the import graph.
 * Scoped deliberately to one file at a time (not a repo-wide crawl) and never
 * throws — any failure (unsupported language, wasm load error, parse error)
 * resolves to null so a caller can fall back to what it already shows.
 */
export async function parseFileSymbols(path: string, source: string, lang: Language): Promise<ParseResult | null> {
  const supported = LANGUAGE_MAP[lang]
  if (!supported) return null

  try {
    await ensureInit()
    const language = await getLanguage(supported)
    const parser = new treeSitterModule!.Parser()
    parser.setLanguage(language)
    const tree = parser.parse(source)
    if (!tree) throw new Error('parse produced no tree')

    const { definitions: defQuery, calls: callQuery } = getQueries(language)

    const definitions: ParsedDefinition[] = []
    for (const match of defQuery.matches(tree.rootNode)) {
      const nameCapture = match.captures.find((c) => c.name === 'name')
      const kindCapture = match.captures.find((c) => c.name.startsWith('def.'))
      if (!nameCapture || !kindCapture) continue
      const kind = kindCapture.name.split('.')[1] as ParsedDefinition['kind']
      definitions.push({
        name: nameCapture.node.text,
        kind,
        startLine: kindCapture.node.startPosition.row + 1,
        endLine: kindCapture.node.endPosition.row + 1,
      })
    }

    const callSites: ParsedCallSite[] = []
    for (const capture of callQuery.captures(tree.rootNode)) {
      callSites.push({ name: capture.node.text, line: capture.node.startPosition.row + 1 })
    }

    return { path, definitions, callSites }
  } catch (err) {
    console.warn(`[Code Navigator] tree-sitter parse failed for ${path}:`, err)
    return null
  }
}
