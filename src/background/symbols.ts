/**
 * Tree-sitter parsing lives here, in the background service worker, not the
 * content script. github.com's own page CSP blocks Worker creation entirely
 * (worker-src restricted to GitHub's own asset domains) and, separately,
 * blocks WebAssembly compilation on the main thread too (script-src without
 * wasm-unsafe-eval) — both confirmed via real console errors during testing,
 * not assumptions. Neither is something we can configure around from inside
 * a github.com content script.
 *
 * The background service worker is a completely different execution context:
 * it's not attached to any page, so github.com's CSP has no bearing on it —
 * only this extension's OWN CSP applies (see manifest.config.ts's
 * content_security_policy, which explicitly adds 'wasm-unsafe-eval').
 *
 * IMPORTANT: this uses a static top-level `import`, not a dynamic `import()`.
 * That's not a style choice — dynamic import() is disallowed inside a running
 * ServiceWorkerGlobalScope by the HTML spec itself (confirmed via a real
 * TypeError during testing: "import() is disallowed on ServiceWorkerGlobalScope
 * by the HTML specification", https://github.com/w3c/ServiceWorker/issues/1356).
 * A static import is resolved during initial module evaluation, before that
 * restriction applies, so it works — the tradeoff is web-tree-sitter's JS
 * loads into memory whenever the background script starts, not lazily only
 * when a file is actually parsed.
 */
import { Parser, Language, Query } from 'web-tree-sitter'

type SupportedLang = 'javascript' | 'typescript' | 'tsx'

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

export interface ParseSymbolsResult {
  ok: boolean
  path: string
  definitions: ParsedDefinition[]
  callSites: ParsedCallSite[]
  error?: string
}

export interface ParseSymbolsRequest {
  type: 'parse-symbols'
  path: string
  source: string
  lang: SupportedLang
}

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

const LANG_WASM_PATH: Record<SupportedLang, string> = {
  javascript: 'wasm/tree-sitter-javascript.wasm',
  typescript: 'wasm/tree-sitter-typescript.wasm',
  tsx: 'wasm/tree-sitter-tsx.wasm',
}

let initPromise: Promise<void> | null = null
const languageCache = new Map<SupportedLang, Language>()
const queryCache = new Map<Language, { definitions: Query; calls: Query }>()

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init({
      locateFile: (path: string) => (path.endsWith('.wasm') ? chrome.runtime.getURL('wasm/web-tree-sitter.wasm') : path),
    })
  }
  await initPromise
}

async function getLanguage(lang: SupportedLang): Promise<Language> {
  const cached = languageCache.get(lang)
  if (cached) return cached
  const language = await Language.load(chrome.runtime.getURL(LANG_WASM_PATH[lang]))
  languageCache.set(lang, language)
  return language
}

function getQueries(language: Language) {
  const cached = queryCache.get(language)
  if (cached) return cached
  const queries = { definitions: new Query(language, DEFINITIONS_QUERY), calls: new Query(language, CALLS_QUERY) }
  queryCache.set(language, queries)
  return queries
}

export async function handleParseSymbols(req: ParseSymbolsRequest): Promise<ParseSymbolsResult> {
  try {
    await ensureInit()
    const language = await getLanguage(req.lang)
    const parser = new Parser()
    parser.setLanguage(language)
    const tree = parser.parse(req.source)
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

    return { ok: true, path: req.path, definitions, callSites }
  } catch (err) {
    console.warn(`[Code Navigator] background tree-sitter parse failed for ${req.path}:`, err)
    // Include the stack, not just .message, so the page console (which is
    // what gets checked in practice) shows the real origin without needing
    // to separately open the background service worker's own console.
    const detail = err instanceof Error ? (err.stack ?? err.message) : String(err)
    return { ok: false, path: req.path, definitions: [], callSites: [], error: detail }
  }
}
