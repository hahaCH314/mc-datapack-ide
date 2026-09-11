import { useState } from 'react'
import {
  MC_VERSIONS,
  DEFAULT_MC_VERSION,
  versionSortKey,
  buildPackSection,
  type McVersionInfo
} from '@shared/mcVersions'
import JoinSessionModal from '../collab/JoinSessionModal'
import TemplateGeneratorModal from '../components/TemplateGeneratorModal'

interface Props {
  onOpened: (rootPath: string) => void
  loading: boolean
  error: string | null
  setError: (e: string | null) => void
}

export default function WelcomeScreen({ onOpened, loading, error, setError }: Props): JSX.Element {
  const [showNewForm, setShowNewForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [folderName, setFolderName] = useState('my_datapack')
  const [namespace, setNamespace] = useState('example')
  const [description, setDescription] = useState('My datapack')
  const [mcVersion, setMcVersion] = useState<McVersionInfo>(DEFAULT_MC_VERSION)
  const [busy, setBusy] = useState(false)

  async function handleOpenExisting(): Promise<void> {
    setError(null)
    const dir = await window.api.openDirectory()
    if (dir) onOpened(dir)
  }

  async function handleImportZip(): Promise<void> {
    setError(null)
    const zipPath = await window.api.openZipDialog()
    if (!zipPath) return
    const destDir = await window.api.chooseParentDir()
    if (!destDir) return
    setBusy(true)
    try {
      const root = await window.api.importFromZip(zipPath, destDir)
      onOpened(root)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateNew(): Promise<void> {
    setError(null)
    const targetDir = await window.api.chooseParentDir()
    if (!targetDir) return
    setBusy(true)
    try {
      const root = await window.api.createNewDatapack({
        targetDir,
        folderName,
        namespace,
        packSection: buildPackSection(mcVersion, description),
        formatSortKey: versionSortKey(mcVersion)
      })
      onOpened(root)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 24
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>🧱</div>
        <h1 style={{ margin: '8px 0 4px 0' }}>MC Datapack IDE</h1>
        <p style={{ color: 'var(--text-1)', margin: 0 }}>
          Minecraft データパックを直感的に作成・編集できる専門エディタ
        </p>
      </div>

      {!showNewForm && (
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={() => setShowNewForm(true)} disabled={busy}>
            ＋ 新規データパックを作成
          </button>
          <button className="btn" onClick={handleOpenExisting} disabled={busy || loading}>
            📂 既存フォルダを開く
          </button>
          <button className="btn" onClick={handleImportZip} disabled={busy}>
            🗜️ Zipからインポート
          </button>
          <button className="btn" onClick={() => setShowJoinForm(true)} disabled={busy}>
            👥 チームセッションに参加
          </button>
          <button className="btn" onClick={() => setShowTemplateForm(true)} disabled={busy}>
            📐 テンプレートから作成
          </button>
        </div>
      )}

      {showJoinForm && (
        <JoinSessionModal onJoined={onOpened} onCancel={() => setShowJoinForm(false)} />
      )}
      {showTemplateForm && (
        <TemplateGeneratorModal
          mode="new"
          onCancel={() => setShowTemplateForm(false)}
          onCreated={onOpened}
        />
      )}

      {showNewForm && (
        <div className="panel" style={{ width: 420 }}>
          <p className="section-title">新規データパック</p>
          <div className="field-row">
            <label>フォルダ名</label>
            <input value={folderName} onChange={(e) => setFolderName(e.target.value)} />
          </div>
          <div className="field-row">
            <label>名前空間 (namespace)</label>
            <input value={namespace} onChange={(e) => setNamespace(e.target.value.toLowerCase())} />
          </div>
          <div className="field-row">
            <label>説明 (pack.mcmeta の description)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field-row">
            <label>対象バージョン</label>
            <select
              value={mcVersion.version}
              onChange={(e) => {
                const v = MC_VERSIONS.find((x) => x.version === e.target.value)
                if (v) setMcVersion(v)
              }}
            >
              {MC_VERSIONS.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version} ({v.formatRange ? `format ${v.formatRange[0]}.${v.formatRange[1]}` : `pack_format ${v.packFormat}`})
                </option>
              ))}
            </select>
            {mcVersion.snapshot && (
              <p style={{ color: 'var(--warning)', fontSize: 11.5, marginTop: 4 }}>
                ⚠ スナップショット/プレリリース版です。開発中のため、正式リリースまでに形式番号が変わる場合があります
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn" onClick={() => setShowNewForm(false)} disabled={busy}>
              キャンセル
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateNew}
              disabled={busy || !folderName.trim() || !namespace.trim()}
            >
              作成して開く
            </button>
          </div>
        </div>
      )}

      {(busy || loading) && <p style={{ color: 'var(--text-1)' }}>読み込み中...</p>}
      {error && <p style={{ color: 'var(--danger)', maxWidth: 500, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
