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

// recordVisit is a read-modify-write on chrome.storage and now fires on every
// navigation — two quick navigations could otherwise both read the same list
// and the second write would clobber the first, losing an entry. Chaining the
// writes serializes them so each sees the previous one's result.
let writeChain: Promise<void> = Promise.resolve()

/** Records a visit, moving an already-present URL to the front instead of duplicating it. */
export function recordVisit(url: string, title: string): Promise<void> {
  writeChain = writeChain.then(() => doRecordVisit(url, title)).catch((e) => {
    console.error('Code Navigator failed to record visit', e)
  })
  return writeChain
}

async function doRecordVisit(url: string, title: string): Promise<void> {
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

/** Same reasoning as bookmarks.ts's onBookmarksChanged — HistoryPanel stays mounted across tab switches now, so it needs a real change signal instead of relying on remount-as-refresh. */
export function onHistoryChanged(cb: () => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && STORAGE_KEY in changes) cb()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
