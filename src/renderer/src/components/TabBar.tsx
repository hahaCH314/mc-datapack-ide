import { iconForKind } from '../lib/resourceKind'
import type { ResourceKind } from '@shared/types'

export interface TabInfo {
  path: string
  relPath: string
  name: string
  kind: ResourceKind
  dirty: boolean
}

interface Props {
  tabs: TabInfo[]
  activePath: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

export default function TabBar({ tabs, activePath, onSelect, onClose }: Props): JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        overflowX: 'auto',
        background: 'var(--bg-1)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath
        return (
          <div
            key={tab.path}
            onClick={() => onSelect(tab.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRight: '1px solid var(--border)',
              background: active ? 'var(--bg-0)' : 'transparent',
              color: active ? 'var(--text-0)' : 'var(--text-1)',
              cursor: 'pointer',
              fontSize: 12.5,
              whiteSpace: 'nowrap',
              borderTop: active ? '2px solid var(--accent-2)' : '2px solid transparent'
            }}
          >
            <span style={{ fontSize: 11 }}>{iconForKind(tab.kind)}</span>
            <span>
              {tab.name}
              {tab.dirty ? ' •' : ''}
            </span>
            <span
              className="btn-icon"
              style={{ padding: '0 4px', fontSize: 11 }}
              onClick={(e) => {
                e.stopPropagation()
                onClose(tab.path)
              }}
            >
              ✕
            </span>
          </div>
        )
      })}
    </div>
  )
}
