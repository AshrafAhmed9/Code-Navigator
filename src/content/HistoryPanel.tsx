import { useEffect, useState } from 'react'
import { getHistory, clearHistory, type HistoryEntry } from '../lib/history'

const KIND_LABEL: Record<HistoryEntry['kind'], string> = {
  file: 'File',
  issue: 'Issue',
  pull: 'Pull Request',
  repo: 'Repo',
  page: 'Page',
}

export function HistoryPanel({ repoKey }: { repoKey: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    getHistory().then(setEntries)
  }, [])

  async function onClear() {
    await clearHistory()
    setEntries([])
  }

  const scoped = entries.filter((e) => e.repoKey === repoKey)

  if (scoped.length === 0) {
    return <div className="cn-muted">No recent activity in this repo yet.</div>
  }

  return (
    <div>
      <div className="cn-bookmark-group">
        {scoped.map((e) => (
          <div key={e.url} className="cn-bookmark-row">
            <a href={e.url} className="cn-bookmark-link" title={e.url}>
              <span className="cn-badge">{KIND_LABEL[e.kind]}</span>
              <span className="cn-file-path">{e.title}</span>
            </a>
          </div>
        ))}
      </div>
      <button className="cn-flow-btn" style={{ marginTop: 8 }} onClick={onClear}>
        Clear recent activity
      </button>
    </div>
  )
}
