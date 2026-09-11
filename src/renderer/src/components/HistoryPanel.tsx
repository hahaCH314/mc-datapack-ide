import { useEffect, useState } from 'react'

interface Props {
  rootPath: string
  relPath: string
  onClose: () => void
  onRestore: (content: string) => void
}

interface BackupEntry {
  timestamp: number
}

export default function HistoryPanel({ rootPath, relPath, onClose, onRestore }: Props): JSX.Element {
  const [entries, setEntries] = useState<BackupEntry[] | null>(null)

  useEffect(() => {
    void window.api.listBackups(rootPath, relPath).then(setEntries)
  }, [rootPath, relPath])

  async function handleRestore(timestamp: number): Promise<void> {
    const content = await window.api.readBackup(rootPath, relPath, timestamp)
    onRestore(content)
    onClose()
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 44,
        right: 12,
        width: 300,
        maxHeight: 400,
        overflow: 'auto',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        zIndex: 1800,
        padding: 10
      }}
    >
      <div className="field-row-inline" style={{ marginBottom: 8 }}>
        <strong style={{ flex: 1, fontSize: 13 }}>🕐 変更履歴</strong>
        <button className="btn-icon" onClick={onClose}>
          ✕
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: -4 }}>
        {relPath.split('/').pop()}
      </p>
      {entries === null && <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>読み込み中...</p>}
      {entries?.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          まだ履歴はありません (自動保存の際、1分以上間隔が空くとスナップショットが作られます)
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries?.map((e) => (
          <div key={e.timestamp} className="field-row-inline" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12 }}>{new Date(e.timestamp).toLocaleString()}</span>
            <button className="btn" onClick={() => handleRestore(e.timestamp)}>
              復元
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
