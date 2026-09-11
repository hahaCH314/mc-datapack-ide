import { useState } from 'react'
import { getMinecraftJarPath, setMinecraftJarPath } from './ItemIcon'

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props): JSX.Element {
  const [jarPath, setJarPath] = useState(getMinecraftJarPath() ?? '')

  async function handleBrowse(): Promise<void> {
    const picked = await window.api.chooseMinecraftJar()
    if (picked) setJarPath(picked)
  }

  function handleSave(): void {
    setMinecraftJarPath(jarPath || null)
    onClose()
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
      <div className="panel" style={{ width: 480, background: 'var(--bg-2)' }}>
        <h3 style={{ marginTop: 0 }}>⚙ 設定</h3>
        <p className="section-title">アイテム/ブロックの見た目プレビュー</p>
        <p style={{ color: 'var(--text-1)', fontSize: 12.5, lineHeight: 1.6 }}>
          Minecraft本体のテクスチャ画像はこのアプリには含まれていません。あなたが所有している
          Minecraftのバージョンjarファイル (例:{' '}
          <code>.minecraft/versions/1.21.4/1.21.4.jar</code>) を指定すると、
          そこからアイテム/ブロックの見た目をその場で読み取ってプレビュー表示します。
        </p>
        <div className="field-row">
          <label>バージョンjarファイルのパス</label>
          <div className="field-row-inline">
            <input style={{ flex: 1 }} value={jarPath} onChange={(e) => setJarPath(e.target.value)} />
            <button className="btn" onClick={handleBrowse}>
              参照...
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
