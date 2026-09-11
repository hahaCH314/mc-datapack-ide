import { useState } from 'react'
import { useCollab } from './CollabContext'

const DEFAULT_SERVER = 'ws://localhost:47391'

interface Props {
  onJoined: (rootPath: string) => void
  onCancel: () => void
}

export default function JoinSessionModal({ onJoined, onCancel }: Props): JSX.Element {
  const collab = useCollab()
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [roomId, setRoomId] = useState('')
  const [myName, setMyName] = useState('プレイヤー')
  const [folderName, setFolderName] = useState('team_project')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const synced = await collab.start(serverUrl, roomId.trim().toUpperCase(), 'guest', myName)
      if (!synced) {
        setError(
          'サーバーに接続できませんでした。アドレスとルームコードを確認するか、ホスト側で中継サーバー (npm run server) が起動しているか確認してください。'
        )
        collab.leave()
        setBusy(false)
        return
      }

      const targetDir = await window.api.chooseParentDir()
      if (!targetDir) {
        collab.leave()
        setBusy(false)
        return
      }
      const root = `${targetDir}\\${folderName}`.replace(/\\+/g, '\\')
      const exists = await window.api.pathExists(root)
      if (exists) {
        setError(`フォルダ "${folderName}" は既に存在します`)
        collab.leave()
        setBusy(false)
        return
      }
      await window.api.createDirectory(root)
      onJoined(root)
    } catch (e) {
      setError(String(e))
      collab.leave()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}
    >
      <div className="panel" style={{ width: 420, background: 'var(--bg-2)' }}>
        <h3 style={{ marginTop: 0 }}>チームセッションに参加</h3>
        <div className="field-row">
          <label>中継サーバーのアドレス</label>
          <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
        </div>
        <div className="field-row">
          <label>ルームコード (ホストから教えてもらう)</label>
          <input value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} />
        </div>
        <div className="field-row">
          <label>あなたの表示名</label>
          <input value={myName} onChange={(e) => setMyName(e.target.value)} />
        </div>
        <div className="field-row">
          <label>保存先のフォルダ名 (このPC内)</label>
          <input value={folderName} onChange={(e) => setFolderName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onCancel} disabled={busy}>
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || !roomId.trim() || !myName.trim() || !folderName.trim()}
            onClick={handleJoin}
          >
            {busy ? '接続中...' : '参加する'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  )
}
