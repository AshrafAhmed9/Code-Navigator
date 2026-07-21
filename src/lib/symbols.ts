import type { Language } from './types'
import type { ParseSymbolsRequest, ParseSymbolsResult, ParsedDefinition, ParsedCallSite } from '../background/symbols'

export type { ParsedDefinition, ParsedCallSite }

type SupportedLang = ParseSymbolsRequest['lang']

const LANGUAGE_MAP: Partial<Record<Language, SupportedLang>> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
}

export function isTreeSitterSupported(lang: Language): boolean {
  return lang in LANGUAGE_MAP
}

export interface ParseResult {
  path: string
  definitions: ParsedDefinition[]
  callSites: ParsedCallSite[]
}

/**
 * Real AST-based function/call extraction for the currently-open file, as an
 * upgrade over the regex-based exportedSymbols already in the import graph.
 * The actual parsing runs in the background service worker, not here — see
 * src/background/symbols.ts for why (github.com's CSP blocks both Worker
 * creation and WebAssembly compilation from a content script, confirmed via
 * testing). This just relays the request and never throws: any failure
 * resolves to null so a caller can fall back to what it already shows.
 */
export async function parseFileSymbols(path: string, source: string, lang: Language): Promise<ParseResult | null> {
  const supported = LANGUAGE_MAP[lang]
  if (!supported) return null

  try {
    const request: ParseSymbolsRequest = { type: 'parse-symbols', path, source, lang: supported }
    const result: ParseSymbolsResult = await chrome.runtime.sendMessage(request)
    if (!result?.ok) {
      console.warn(`[Code Navigator] tree-sitter parse failed for ${path}:`, result?.error)
      return null
    }
    return { path: result.path, definitions: result.definitions, callSites: result.callSites }
  } catch (err) {
    console.warn(`[Code Navigator] tree-sitter message failed for ${path}:`, err)
    return null
  }
}
