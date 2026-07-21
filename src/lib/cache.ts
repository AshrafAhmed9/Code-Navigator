import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { RepoGraph } from './types'

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
  return db.get('graphs', key)
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
