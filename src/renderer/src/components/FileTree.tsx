import { useState } from 'react'
import type { FileNode } from '@shared/types'
import { detectResourceKind, iconForKind } from '../lib/resourceKind'

interface Props {
  node: FileNode
  depth?: number
  activePath: string | null
  onOpenFile: (node: FileNode) => void
  onAction: (action: TreeAction) => void
}

export type TreeAction =
  | { type: 'newFile'; dirPath: string; dirRelPath: string }
  | { type: 'newFolder'; dirPath: string; dirRelPath: string }
  | { type: 'rename'; node: FileNode }
  | { type: 'delete'; node: FileNode }

interface MenuState {
  x: number
  y: number
  node: FileNode
}

export default function FileTree(props: Props): JSX.Element {
  const [menu, setMenu] = useState<MenuState | null>(null)
  return (
    <div onClick={() => menu && setMenu(null)}>
      <TreeNode {...props} depth={props.depth ?? 0} menu={menu} setMenu={setMenu} />
      {menu && (
        <ContextMenu
          menu={menu}
          onClose={() => setMenu(null)}
          onAction={(a) => {
            props.onAction(a)
            setMenu(null)
          }}
        />
      )}
    </div>
  )
}

function ContextMenu({
  menu,
  onClose,
  onAction
}: {
  menu: MenuState
  onClose: () => void
  onAction: (a: TreeAction) => void
}): JSX.Element {
  const { node } = menu
  const dirPath = node.isDir ? node.path : node.path.substring(0, node.path.lastIndexOf(node.name))
  const dirRelPath = node.isDir
    ? node.relPath
    : node.relPath.substring(0, node.relPath.length - node.name.length - 1)

  return (
    <div
      style={{
        position: 'fixed',
        top: menu.y,
        left: menu.x,
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 1000,
        minWidth: 160,
        padding: 4
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {node.isDir && (
        <>
          <MenuItem
            label="新規ファイル"
            onClick={() => onAction({ type: 'newFile', dirPath: node.path, dirRelPath: node.relPath })}
          />
          <MenuItem
            label="新規フォルダ"
            onClick={() => onAction({ type: 'newFolder', dirPath: node.path, dirRelPath: node.relPath })}
          />
        </>
      )}
      {!node.isDir && (
        <MenuItem label="新規ファイル (同階層)" onClick={() => onAction({ type: 'newFile', dirPath, dirRelPath })} />
      )}
      <MenuItem label="名前を変更" onClick={() => onAction({ type: 'rename', node })} />
      <MenuItem label="削除" danger onClick={() => onAction({ type: 'delete', node })} />
      <div style={{ display: 'none' }} onClick={onClose} />
    </div>
  )
}

function MenuItem({
  label,
  onClick,
  danger
}: {
  label: string
  onClick: () => void
  danger?: boolean
}): JSX.Element {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 4,
        cursor: 'pointer',
        color: danger ? 'var(--danger)' : 'var(--text-0)',
        fontSize: 12.5
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-3)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {label}
    </div>
  )
}

function TreeNode(
  props: Props & { menu: MenuState | null; setMenu: (m: MenuState | null) => void }
): JSX.Element {
  const { node, depth = 0, activePath, onOpenFile, menu, setMenu } = props
  const [expanded, setExpanded] = useState(depth < 2)
  const isActive = activePath === node.path

  const kind = node.isDir ? null : detectResourceKind(node.relPath)
  const icon = node.isDir ? (expanded ? '📂' : '📁') : iconForKind(kind!)

  return (
    <div>
      <div
        onClick={() => (node.isDir ? setExpanded((v) => !v) : onOpenFile(node))}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setMenu({ x: e.clientX, y: e.clientY, node })
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 6px',
          paddingLeft: 8 + depth * 14,
          cursor: 'pointer',
          borderRadius: 4,
          background: isActive ? 'var(--bg-3)' : 'transparent',
          color: isActive ? 'var(--text-0)' : 'var(--text-1)',
          whiteSpace: 'nowrap'
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'var(--bg-2)'
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ fontSize: 11, width: 16, textAlign: 'center' }}>{icon}</span>
        <span style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {node.name}
        </span>
      </div>
      {node.isDir &&
        expanded &&
        node.children?.map((child) => (
          <TreeNode
            key={child.path}
            {...props}
            node={child}
            depth={depth + 1}
            menu={menu}
            setMenu={setMenu}
          />
        ))}
    </div>
  )
}
