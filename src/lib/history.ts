import { classifyUrl, type Bookmark } from './bookmarks'

export interface HistoryEntry {
  url: string
  title: string
  repoKey: string
  kind: Bookmark['kind']
  visitedAt: number
}

const STORAGE_KEY = 'cn-history'
const MAX_ENTRIES = 25

export async function getHistory(): Promise<HistoryEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as HistoryEntry[] | undefined) ?? []
}

/** Records a visit, moving an already-present URL to the front instead of duplicating it. */
export async function recordVisit(url: string, title: string): Promise<void> {
  const classified = classifyUrl(url)
  if (!classified || classified.kind === 'page') return // skip settings/marketplace/etc noise

  const entries = await getHistory()
  const withoutThisUrl = entries.filter((e) => e.url !== url)
  const entry: HistoryEntry = { url, title, repoKey: classified.repoKey, kind: classified.kind, visitedAt: Date.now() }
  await chrome.storage.local.set({ [STORAGE_KEY]: [entry, ...withoutThisUrl].slice(0, MAX_ENTRIES) })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: [] })
}
