import { useState } from 'react'
import { useCollab, randomRoomCode } from './CollabContext'

const DEFAULT_SERVER = 'ws://localhost:47391'

export default function TeamPanel({ onClose }: { onClose: () => void }): JSX.Element {
  const collab = useCollab()
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER)
  const [roomId, setRoomId] = useState(() => randomRoomCode())
  const [myName, setMyName] = useState('プレイヤー')
  const [chatInput, setChatInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStartHosting(): Promise<void> {
    setError(null)
    setConnecting(true)
    try {
      const synced = await collab.start(serverUrl, roomId, 'host', myName)
      if (!synced) {
        collab.leave()
        setError(
          '中継サーバーに接続できませんでした。先に別のターミナルで "npm run server" を実行してから、もう一度お試しください。'
        )
      }
    } catch (e) {
      collab.leave()
      setError(String(e))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1500,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.3)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <strong style={{ flex: 1 }}>👥 チームセッション</strong>
        <button className="btn-icon" onClick={onClose}>
          ✕
        </button>
      </div>

      {!collab.active && (
        <div style={{ padding: 12, overflow: 'auto' }}>
          <p className="section-title">セッションを開始 (ホスト)</p>
          <div className="field-row">
            <label>中継サーバーのアドレス</label>
            <input value={serverUrl} onChange={(e) => setServerUrl(e.target.value)} />
          </div>
          <div className="field-row">
            <label>ルームコード (メンバーに共有します)</label>
            <div className="field-row-inline">
              <input style={{ flex: 1 }} value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} />
              <button className="btn" onClick={() => setRoomId(randomRoomCode())}>
                🎲
              </button>
            </div>
          </div>
          <div className="field-row">
            <label>あなたの表示名</label>
            <input value={myName} onChange={(e) => setMyName(e.target.value)} />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={connecting || !myName.trim()}
            onClick={handleStartHosting}
          >
            {connecting ? '接続中...' : 'このプロジェクトをホストする'}
          </button>
          <p style={{ color: 'var(--text-dim)', fontSize: 11.5, marginTop: 10, lineHeight: 1.6 }}>
            事前に <code>npm run server</code> で中継サーバーを起動しておいてください。
            他のメンバーには、あなたのPCのアドレス(<code>{serverUrl}</code> の部分)とルームコード「
            {roomId}」を伝えてください。
          </p>
          {error && <p style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</p>}
        </div>
      )}

      {collab.active && (
        <>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <div className="field-row-inline">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: collab.connected ? 'var(--accent)' : 'var(--warning)'
                }}
              />
              <span style={{ fontSize: 12 }}>
                {collab.connected ? '🟢 接続済み' : '🟡 サーバーに接続中...'} - ルーム {collab.roomId}
              </span>
            </div>
            <button
              className="btn btn-danger"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => collab.leave()}
            >
              セッションを終了
            </button>
          </div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <p className="section-title">参加者 ({collab.presence.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {collab.presence.map((p) => (
                <div key={p.clientId} className="field-row-inline">
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: p.color,
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: 12.5 }}>
                    {p.name}
                    {p.isSelf ? ' (自分)' : ''}
                  </span>
                  {p.file && (
                    <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      - {p.file.split('/').pop()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <p className="section-title" style={{ padding: '8px 12px 0' }}>
              チャット
            </p>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px' }}>
              {collab.chat.map((m) => (
                <div key={m.id} style={{ marginBottom: 8, fontSize: 12.5 }}>
                  <span style={{ color: m.color, fontWeight: 700 }}>{m.user}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 10.5, marginLeft: 6 }}>
                    {new Date(m.ts).toLocaleTimeString()}
                  </span>
                  <div>{m.text}</div>
                </div>
              ))}
              {collab.chat.length === 0 && (
                <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>まだメッセージはありません</p>
              )}
            </div>
            <form
              style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid var(--border)' }}
              onSubmit={(e) => {
                e.preventDefault()
                collab.sendChat(chatInput)
                setChatInput('')
              }}
            >
              <input
                style={{ flex: 1 }}
                placeholder="メッセージを入力..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button className="btn btn-primary" type="submit">
                送信
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
