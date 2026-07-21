import { useEffect, useMemo, useState } from 'react'
import type { RepoGraph } from '../lib/types'
import { buildFileTree, ancestorPaths, type TreeNode } from '../lib/tree'
import { toggleBookmark, isBookmarked, type Bookmark } from '../lib/bookmarks'
import { detectLanguage } from '../lib/language'

const LANG_COLOR: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f1c40f',
  jsx: '#f1c40f',
  py: '#3572A5',
  go: '#00ADD8',
  java: '#e76f00',
  rb: '#cc342d',
  rs: '#dea584',
  other: '#8b8b96',
}

function blobUrl(graph: RepoGraph, path: string): string {
  const [owner, repo] = graph.repoKey.split('/')
  return `https://github.com/${owner}/${repo}/blob/${graph.commitSha}/${path}`
}

export function FileTree({ graph }: { graph: RepoGraph }) {
  const tree = useMemo(() => buildFileTree(graph.allPaths ?? []), [graph])
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Closed by default — on a repo with several root folders, auto-expanding
    // the top level turned the tree into a long wall of rows the user had to
    // scroll past just to see the folder list. A saved expansion state (from
    // manually opening folders on a previous visit) still takes precedence.
    try {
      const saved = localStorage.getItem(`cn-tree-expanded:${graph.repoKey}`)
      return saved ? new Set(JSON.parse(saved)) : new Set<string>()
    } catch {
      return new Set<string>()
    }
  })

  useEffect(() => {
    localStorage.setItem(`cn-tree-expanded:${graph.repoKey}`, JSON.stringify(Array.from(expanded)))
  }, [expanded, graph.repoKey])

  const matchSet = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    const matches = new Set<string>()
    const autoExpand = new Set<string>()
    for (const path of graph.allPaths) {
      if (path.toLowerCase().includes(q)) {
        matches.add(path)
        for (const a of ancestorPaths(path)) autoExpand.add(a)
      }
    }
    return { matches, autoExpand }
  }, [query, graph.allPaths])

  function toggleFolder(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div>
      <div className="cn-tree-search-row">
        <a className="cn-tree-home" href={`https://github.com/${graph.repoKey}`} title={`Back to ${graph.repoKey}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5z" strokeLinejoin="round" />
          </svg>
        </a>
        <input
          className="cn-tree-search"
          placeholder="Filter files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="cn-tree">
        {tree.map((node) => (
          <TreeRow key={node.path} node={node} graph={graph} expanded={expanded} onToggleFolder={toggleFolder} matchSet={matchSet} />
        ))}
      </div>
    </div>
  )
}

function TreeRow({
  node,
  graph,
  expanded,
  onToggleFolder,
  matchSet,
}: {
  node: TreeNode
  graph: RepoGraph
  expanded: Set<string>
  onToggleFolder: (path: string) => void
  matchSet: { matches: Set<string>; autoExpand: Set<string> } | null
}) {
  if (matchSet) {
    if (node.kind === 'file' && !matchSet.matches.has(node.path)) return null
    if (node.kind === 'folder' && !matchSet.autoExpand.has(node.path) && !hasMatchingDescendant(node, matchSet.matches))
      return null
  }

  if (node.kind === 'file') {
    const language = detectLanguage(node.name)
    return (
      <div className="cn-tree-row">
        <span className="cn-tree-dot" style={{ background: LANG_COLOR[language] ?? LANG_COLOR.other }} />
        <a className="cn-tree-file-link" href={blobUrl(graph, node.path)} title={node.path}>
          {node.name}
        </a>
        <BookmarkStar graph={graph} path={node.path} />
      </div>
    )
  }

  const isOpen = matchSet ? true : expanded.has(node.path)
  return (
    <div className="cn-tree-node">
      <button className="cn-tree-row cn-tree-folder" onClick={() => onToggleFolder(node.path)}>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className={`cn-tree-chevron ${isOpen ? 'cn-tree-chevron-open' : ''}`}
        >
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <FolderIcon open={isOpen} />
        <span className="cn-tree-folder-name">{node.name}</span>
        {node.children.length > 0 && <span className="cn-tree-count">{node.children.length}</span>}
      </button>
      <div className={`cn-tree-children-wrap ${isOpen ? 'cn-open' : ''}`}>
        <div className="cn-tree-children-inner">
          <div className="cn-tree-children">
            {node.children.map((child) => (
              <TreeRow key={child.path} node={child} graph={graph} expanded={expanded} onToggleFolder={onToggleFolder} matchSet={matchSet} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function FolderIcon({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="cn-tree-folder-icon">
      {open ? (
        <path
          d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7z M3 10h20l-2 9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          fill="currentColor"
          fillRule="evenodd"
        />
      ) : (
        <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" fill="currentColor" />
      )}
    </svg>
  )
}

function hasMatchingDescendant(node: TreeNode, matches: Set<string>): boolean {
  if (node.kind === 'file') return matches.has(node.path)
  return node.children.some((c) => hasMatchingDescendant(c, matches))
}

function BookmarkStar({ graph, path }: { graph: RepoGraph; path: string }) {
  const url = blobUrl(graph, path)
  const [marked, setMarked] = useState(false)

  useEffect(() => {
    isBookmarked(url).then(setMarked)
  }, [url])

  async function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const bookmark: Bookmark = { url, title: path, repoKey: graph.repoKey, kind: 'file', addedAt: Date.now() }
    const next = await toggleBookmark(bookmark)
    setMarked(next)
  }

  return (
    <button className={`cn-tree-star ${marked ? 'cn-tree-star-on' : ''}`} onClick={onClick} title="Bookmark">
      <svg width="12" height="12" viewBox="0 0 24 24" fill={marked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
