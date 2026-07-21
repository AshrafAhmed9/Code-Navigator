import type { Language } from './types'
import type { ParseResult } from '../content/parser.worker'

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

let worker: Worker | null = null
let requestSeq = 0
const pending = new Map<number, { resolve: (r: ParseResult) => void; reject: (e: Error) => void }>()

function getWorker(): Worker {
  if (worker) return worker

  worker = new Worker(new URL('../content/parser.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<ParseResult>) => {
    const entry = pending.get(e.data.requestId)
    if (!entry) return
    pending.delete(e.data.requestId)
    entry.resolve(e.data)
  }
  worker.onerror = () => {
    // A worker-level (not per-parse) failure — e.g. the wasm bundle itself
    // failed to load. Reject everything currently in flight so callers don't
    // hang forever; future calls will spawn a fresh worker and try again.
    for (const [, entry] of pending) entry.reject(new Error('parser worker crashed'))
    pending.clear()
    worker = null
  }

  worker.postMessage({
    type: 'init',
    runtimeWasmUrl: chrome.runtime.getURL('wasm/web-tree-sitter.wasm'),
    langWasmUrls: {
      javascript: chrome.runtime.getURL('wasm/tree-sitter-javascript.wasm'),
      typescript: chrome.runtime.getURL('wasm/tree-sitter-typescript.wasm'),
      tsx: chrome.runtime.getURL('wasm/tree-sitter-tsx.wasm'),
    },
  })

  return worker
}

const PARSE_TIMEOUT_MS = 8000

/**
 * Real AST-based function/call extraction for the currently-open file, as an
 * upgrade over the regex-based exportedSymbols already in the import graph.
 * Scoped deliberately to one file at a time (not a repo-wide crawl) and never
 * throws — any failure (unsupported language, wasm load error, parse timeout)
 * resolves to null so a caller can fall back to what it already shows.
 */
export async function parseFileSymbols(path: string, source: string, lang: Language): Promise<ParseResult | null> {
  const supported = LANGUAGE_MAP[lang]
  if (!supported) return null

  try {
    const w = getWorker()
    const requestId = ++requestSeq
    const result = await new Promise<ParseResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId)
        reject(new Error('parse timed out'))
      }, PARSE_TIMEOUT_MS)
      pending.set(requestId, {
        resolve: (r) => {
          clearTimeout(timeout)
          resolve(r)
        },
        reject: (e) => {
          clearTimeout(timeout)
          reject(e)
        },
      })
      w.postMessage({ type: 'parse', requestId, path, source, lang: supported })
    })
    return result.ok ? result : null
  } catch {
    return null
  }
}
