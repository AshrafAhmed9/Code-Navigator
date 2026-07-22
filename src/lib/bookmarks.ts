export interface Bookmark {
  url: string
  title: string
  repoKey: string // owner/repo
  kind: 'file' | 'issue' | 'pull' | 'repo' | 'page'
  addedAt: number
}

const STORAGE_KEY = 'cn-bookmarks'

export async function getBookmarks(): Promise<Bookmark[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return (result[STORAGE_KEY] as Bookmark[] | undefined) ?? []
}

export async function isBookmarked(url: string): Promise<boolean> {
  const marks = await getBookmarks()
  return marks.some((b) => b.url === url)
}

/**
 * BookmarksPanel now stays mounted across tab switches (see Sidebar.tsx) for
 * performance, instead of remounting — which used to double as an accidental
 * "refresh on tab visit." This is the real, deliberate replacement: reactive
 * to actual storage changes, so a bookmark added from anywhere (the star
 * button, ⌘K, even a second github.com tab) shows up without needing a remount.
 */
export function onBookmarksChanged(cb: () => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && STORAGE_KEY in changes) cb()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// Serialize all mutations: each is a read-modify-write on chrome.storage, so
// two quick stars/unstars could otherwise both read the same list and the
// second write would clobber the first. Chaining makes each see the prior result.
let writeChain: Promise<unknown> = Promise.resolve()
function enqueue<T>(op: () => Promise<T>): Promise<T> {
  const next = writeChain.then(op)
  writeChain = next.catch(() => {})
  return next
}

export function removeBookmark(url: string): Promise<void> {
  return enqueue(async () => {
    const marks = await getBookmarks()
    await chrome.storage.local.set({ [STORAGE_KEY]: marks.filter((b) => b.url !== url) })
  })
}

export function toggleBookmark(bookmark: Bookmark): Promise<boolean> {
  return enqueue(async () => {
    const marks = await getBookmarks()
    if (marks.some((b) => b.url === bookmark.url)) {
      await chrome.storage.local.set({ [STORAGE_KEY]: marks.filter((b) => b.url !== bookmark.url) })
      return false
    }
    await chrome.storage.local.set({ [STORAGE_KEY]: [bookmark, ...marks] })
    return true
  })
}

export function classifyUrl(url: string): { kind: Bookmark['kind']; repoKey: string } | null {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)(\/.*)?$/)
  if (!m) return null
  const repoKey = `${m[1]}/${m[2]}`
  const rest = m[3] ?? ''
  if (/^\/blob\//.test(rest)) return { kind: 'file', repoKey }
  if (/^\/issues\/\d+/.test(rest)) return { kind: 'issue', repoKey }
  if (/^\/pull\/\d+/.test(rest)) return { kind: 'pull', repoKey }
  if (rest === '' || rest === '/') return { kind: 'repo', repoKey }
  return { kind: 'page', repoKey }
}
