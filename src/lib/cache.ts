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
