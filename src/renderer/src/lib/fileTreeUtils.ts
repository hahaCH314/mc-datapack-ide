import type { FileNode } from '@shared/types'

export function collectFilePaths(node: FileNode, out: string[] = []): string[] {
  if (!node.isDir) {
    out.push(node.relPath)
    return out
  }
  for (const child of node.children ?? []) collectFilePaths(child, out)
  return out
}

export function findNodeByRelPath(node: FileNode, relPath: string): FileNode | null {
  if (node.relPath === relPath) return node
  for (const child of node.children ?? []) {
    const found = findNodeByRelPath(child, relPath)
    if (found) return found
  }
  return null
}
