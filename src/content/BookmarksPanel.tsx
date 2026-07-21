import { useEffect, useState } from 'react'
import { getBookmarks, removeBookmark, type Bookmark } from '../lib/bookmarks'

const KIND_LABEL: Record<Bookmark['kind'], string> = {
  file: 'File',
  issue: 'Issue',
  pull: 'Pull Request',
  repo: 'Repo',
  page: 'Page',
}

export function BookmarksPanel({ repoKey }: { repoKey?: string }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    getBookmarks().then(setBookmarks)
  }, [])

  async function onRemove(url: string) {
    await removeBookmark(url)
    setBookmarks((prev) => prev.filter((b) => b.url !== url))
  }

  const scoped = repoKey ? bookmarks.filter((b) => b.repoKey === repoKey) : bookmarks
  const others = repoKey ? bookmarks.filter((b) => b.repoKey !== repoKey) : []

  if (bookmarks.length === 0) {
    return <div className="cn-muted">No bookmarks yet. Star a file in the tree, or use ⌘K.</div>
  }

  return (
    <div>
      {scoped.length > 0 && (
        <div className="cn-bookmark-group">
          {scoped.map((b) => (
            <BookmarkRow key={b.url} bookmark={b} onRemove={onRemove} />
          ))}
        </div>
      )}
      {others.length > 0 && (
        <>
          <div className="cn-label" style={{ marginTop: 14 }}>
            Other repos
          </div>
          <div className="cn-bookmark-group">
            {others.map((b) => (
              <BookmarkRow key={b.url} bookmark={b} onRemove={onRemove} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function BookmarkRow({ bookmark, onRemove }: { bookmark: Bookmark; onRemove: (url: string) => void }) {
  return (
    <div className="cn-bookmark-row">
      <a href={bookmark.url} className="cn-bookmark-link" title={bookmark.url}>
        <span className="cn-badge">{KIND_LABEL[bookmark.kind]}</span>
        <span className="cn-file-path">{bookmark.title}</span>
      </a>
      <button className="cn-close" onClick={() => onRemove(bookmark.url)} title="Remove bookmark">
        ✕
      </button>
    </div>
  )
}
