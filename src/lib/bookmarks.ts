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

export async function addBookmark(bookmark: Bookmark): Promise<void> {
  const marks = await getBookmarks()
  if (marks.some((b) => b.url === bookmark.url)) return
  await chrome.storage.local.set({ [STORAGE_KEY]: [bookmark, ...marks] })
}

export async function removeBookmark(url: string): Promise<void> {
  const marks = await getBookmarks()
  await chrome.storage.local.set({ [STORAGE_KEY]: marks.filter((b) => b.url !== url) })
}

export async function toggleBookmark(bookmark: Bookmark): Promise<boolean> {
  const already = await isBookmarked(bookmark.url)
  if (already) {
    await removeBookmark(bookmark.url)
    return false
  }
  await addBookmark(bookmark)
  return true
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
