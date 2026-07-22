import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { RepoGraph } from './types'
import { REPO_GRAPH_SCHEMA_VERSION } from './types'

interface CacheSchema extends DBSchema {
  graphs: {
    key: string // `${owner}/${repo}@${commitSha}`
    value: RepoGraph
  }
}

let dbPromise: Promise<IDBPDatabase<CacheSchema>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CacheSchema>('code-navigator', 1, {
      upgrade(db) {
        db.createObjectStore('graphs')
      },
    })
  }
  return dbPromise
}

export function graphKey(owner: string, repo: string, commitSha: string): string {
  return `${owner}/${repo}@${commitSha}`
}

export async function getCachedGraph(key: string): Promise<RepoGraph | undefined> {
  const db = await getDb()
  const graph = await db.get('graphs', key)
  // A graph cached under an older RepoGraph shape (e.g. before a field like
  // allPaths existed) must never be handed to current code — reading a
  // missing field crashes deep in a component render with an uncaught
  // "X is not iterable", which unmounts the entire sidebar. Discarding it
  // here just forces a normal rebuild instead, same as a first-ever visit.
  if (graph && graph.schemaVersion !== REPO_GRAPH_SCHEMA_VERSION) {
    await db.delete('graphs', key)
    return undefined
  }
  return graph
}

export async function putCachedGraph(key: string, graph: RepoGraph): Promise<void> {
  const db = await getDb()
  await db.put('graphs', graph, key)
}

/** Hot in-memory layer so re-rendering the sidebar for the same repo never hits IndexedDB. */
const memCache = new Map<string, RepoGraph>()

export async function getGraph(key: string): Promise<RepoGraph | undefined> {
  const hot = memCache.get(key)
  if (hot) return hot
  const cold = await getCachedGraph(key)
  if (cold) memCache.set(key, cold)
  return cold
}

export async function setGraph(key: string, graph: RepoGraph): Promise<void> {
  memCache.set(key, graph)
  await putCachedGraph(key, graph)
}

/** Used by the sidebar's error-boundary retry action to force a clean rebuild. */
export async function deleteGraph(key: string): Promise<void> {
  memCache.delete(key)
  const db = await getDb()
  await db.delete('graphs', key)
}

export async function clearAllGraphs(): Promise<void> {
  memCache.clear()
  const db = await getDb()
  await db.clear('graphs')
}

/**
 * "Clear cache" in Settings can't touch this cache directly — IndexedDB
 * accessed from a content script is scoped to github.com's origin, not the
 * extension's own storage, and the options page runs in a completely
 * different origin (chrome-extension://...) with no access to it. Settings
 * signals through chrome.storage.local instead (genuinely shared across
 * every extension context), and each content script clears its own
 * in-page IndexedDB when it sees the signal. Two keys (requested/handled)
 * so this works whether a github.com tab is open right now (handled
 * immediately via onCacheClearRequested) or not (honored on next load).
 */
const CLEAR_REQUESTED_KEY = 'cn-clear-cache-requested-at'
const CLEAR_HANDLED_KEY = 'cn-cache-last-cleared-at'

export async function requestCacheClear(): Promise<void> {
  await chrome.storage.local.set({ [CLEAR_REQUESTED_KEY]: Date.now() })
}

/** Called once per content-script load — honors a pending clear exactly once, whenever it actually arrived. */
export async function honorPendingCacheClear(): Promise<void> {
  const result = await chrome.storage.local.get([CLEAR_REQUESTED_KEY, CLEAR_HANDLED_KEY])
  const requestedAt = result[CLEAR_REQUESTED_KEY] as number | undefined
  const handledAt = result[CLEAR_HANDLED_KEY] as number | undefined
  if (!requestedAt || (handledAt && handledAt >= requestedAt)) return
  await clearAllGraphs()
  await chrome.storage.local.set({ [CLEAR_HANDLED_KEY]: Date.now() })
}

export function onCacheClearRequested(cb: () => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && CLEAR_REQUESTED_KEY in changes) cb()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
