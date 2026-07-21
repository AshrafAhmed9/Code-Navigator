/// <reference lib="webworker" />
import { Parser, Language, Query } from 'web-tree-sitter'

type SupportedLang = 'javascript' | 'typescript' | 'tsx'

interface InitMessage {
  type: 'init'
  runtimeWasmUrl: string
  langWasmUrls: Record<SupportedLang, string>
}

interface ParseMessage {
  type: 'parse'
  requestId: number
  path: string
  source: string
  lang: SupportedLang
}

type InMessage = InitMessage | ParseMessage

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
  requestId: number
  path: string
  ok: boolean
  definitions: ParsedDefinition[]
  callSites: ParsedCallSite[]
  error?: string
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

let initPromise: Promise<void> | null = null
const languageCache = new Map<SupportedLang, Language>()
const queryCache = new Map<Language, { definitions: Query; calls: Query }>()
let langWasmUrls: Record<SupportedLang, string> | null = null

async function ensureInit(msg: InitMessage): Promise<void> {
  if (!initPromise) {
    langWasmUrls = msg.langWasmUrls
    initPromise = Parser.init({
      locateFile: (path: string) => (path.endsWith('.wasm') ? msg.runtimeWasmUrl : path),
    })
  }
  await initPromise
}

async function getLanguage(lang: SupportedLang): Promise<Language> {
  const cached = languageCache.get(lang)
  if (cached) return cached
  if (!langWasmUrls) throw new Error('parser not initialized')
  const language = await Language.load(langWasmUrls[lang])
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

async function parse(msg: ParseMessage): Promise<ParseResult> {
  const language = await getLanguage(msg.lang)
  const parser = new Parser()
  parser.setLanguage(language)
  const tree = parser.parse(msg.source)
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

  return { requestId: msg.requestId, path: msg.path, ok: true, definitions, callSites }
}

self.onmessage = async (e: MessageEvent<InMessage>) => {
  const msg = e.data

  if (msg.type === 'init') {
    // Errors here are swallowed on purpose — the first 'parse' request will
    // see initPromise reject and report a clean per-file failure instead of
    // this crashing the worker or the tab.
    ensureInit(msg).catch(() => {})
    return
  }

  try {
    if (!initPromise) throw new Error('parser worker received a parse request before init')
    await initPromise
    const result = await parse(msg)
    self.postMessage(result)
  } catch (err) {
    const result: ParseResult = {
      requestId: msg.requestId,
      path: msg.path,
      ok: false,
      definitions: [],
      callSites: [],
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(result)
  }
}
