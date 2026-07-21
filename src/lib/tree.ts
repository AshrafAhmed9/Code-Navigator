export interface TreeFileNode {
  kind: 'file'
  name: string
  path: string
}

export interface TreeFolderNode {
  kind: 'folder'
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = TreeFileNode | TreeFolderNode

/** Builds a nested folder/file tree from flat repo paths, folders-first then alphabetical, like a classic IDE explorer. */
export function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeFolderNode = { kind: 'folder', name: '', path: '', children: [] }

  for (const path of paths) {
    const parts = path.split('/')
    let cursor = root
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isLeaf = i === parts.length - 1
      const nodePath = parts.slice(0, i + 1).join('/')

      if (isLeaf) {
        cursor.children.push({ kind: 'file', name, path: nodePath })
        continue
      }

      let next = cursor.children.find((c) => c.kind === 'folder' && c.name === name) as
        | TreeFolderNode
        | undefined
      if (!next) {
        next = { kind: 'folder', name, path: nodePath, children: [] }
        cursor.children.push(next)
      }
      cursor = next
    }
  }

  sortTree(root)
  return root.children
}

function sortTree(node: TreeFolderNode) {
  node.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const child of node.children) {
    if (child.kind === 'folder') sortTree(child)
  }
}

/** All ancestor folder paths of a given path — used to auto-expand search matches. */
export function ancestorPaths(path: string): string[] {
  const parts = path.split('/')
  const ancestors: string[] = []
  for (let i = 1; i < parts.length; i++) ancestors.push(parts.slice(0, i).join('/'))
  return ancestors
}
