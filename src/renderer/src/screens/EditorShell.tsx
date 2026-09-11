import { useCallback, useEffect, useRef, useState } from 'react'
import type { FileNode } from '@shared/types'
import FileTree, { type TreeAction } from '../components/FileTree'
import TabBar, { type TabInfo } from '../components/TabBar'
import EditorRouter from '../editors/EditorRouter'
import { PromptModal, ConfirmModal } from '../components/PromptModal'
import { detectResourceKind, guessNewFileDefaults } from '../lib/resourceKind'
import { TEMPLATES } from '../lib/templates'
import { collectFilePaths } from '../lib/fileTreeUtils'
import { useCollab } from '../collab/CollabContext'
import { useTeamFileSync } from '../collab/useTeamFileSync'
import TeamPanel from '../collab/TeamPanel'
import TemplateGeneratorModal from '../components/TemplateGeneratorModal'
import HistoryPanel from '../components/HistoryPanel'
import SearchPanel from '../components/SearchPanel'
import SettingsModal from '../components/SettingsModal'

interface OpenFile {
  path: string
  relPath: string
  content: string
  savedContent: string
}

interface Props {
  rootPath: string
  tree: FileNode
  onRefresh: () => void
  onCloseProject: () => void
}

type ModalState =
  | { type: 'newFile'; dirPath: string; dirRelPath: string }
  | { type: 'newFolder'; dirPath: string; dirRelPath: string }
  | { type: 'rename'; node: FileNode }
  | { type: 'delete'; node: FileNode }
  | null

export default function EditorShell({ rootPath, tree, onRefresh, onCloseProject }: Props): JSX.Element {
  const [openFiles, setOpenFiles] = useState<Record<string, OpenFile>>({})
  const [order, setOrder] = useState<string[]>([])
  const [activePath, setActivePath] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [exporting, setExporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [showTeamPanel, setShowTeamPanel] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [lastExportPath, setLastExportPath] = useState<string | null>(null)
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)
  const [showSearchPanel, setShowSearchPanel] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const collab = useCollab()
  const team = useTeamFileSync({ rootPath, tree, onRefresh })

  const projectName = tree.name

  useEffect(() => {
    if (!statusMsg) return
    const t = setTimeout(() => setStatusMsg(null), 3000)
    return () => clearTimeout(t)
  }, [statusMsg])

  const openFile = useCallback(async (node: FileNode) => {
    if (node.isDir) return
    if (!openFiles[node.path]) {
      const content = await window.api.readFile(node.path)
      setOpenFiles((prev) => ({
        ...prev,
        [node.path]: { path: node.path, relPath: node.relPath, content, savedContent: content }
      }))
      setOrder((prev) => (prev.includes(node.path) ? prev : [...prev, node.path]))
      if (team.active) team.registerOpenFile(node.relPath, content)
    }
    setActivePath(node.path)
  }, [openFiles, team])

  function closeTab(path: string): void {
    const file = openFiles[path]
    const timer = autosaveTimers.current.get(path)
    if (timer) {
      clearTimeout(timer)
      autosaveTimers.current.delete(path)
    }
    setOrder((prev) => prev.filter((p) => p !== path))
    setOpenFiles((prev) => {
      const next = { ...prev }
      delete next[path]
      return next
    })
    if (file && team.active) team.unregisterOpenFile(file.relPath)
    if (activePath === path) {
      const remaining = order.filter((p) => p !== path)
      setActivePath(remaining.length ? remaining[remaining.length - 1] : null)
    }
  }

  const autosaveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const saveFile = useCallback(
    async (path: string, silent = false) => {
      const file = openFiles[path]
      if (!file) return
      await window.api.writeFileWithBackup(rootPath, file.relPath, file.content)
      setOpenFiles((prev) => ({ ...prev, [path]: { ...prev[path], savedContent: prev[path].content } }))
      if (!silent) setStatusMsg(`保存しました: ${file.relPath}`)
    },
    [openFiles, rootPath]
  )

  function updateContent(path: string, content: string): void {
    setOpenFiles((prev) => ({ ...prev, [path]: { ...prev[path], content } }))
    const file = openFiles[path]
    if (file && team.active) {
      team.applyLocalChange(file.relPath, content)
      return
    }
    // チームモードでない場合は、入力が落ち着いたタイミングで自動保存する
    const existing = autosaveTimers.current.get(path)
    if (existing) clearTimeout(existing)
    autosaveTimers.current.set(
      path,
      setTimeout(() => void saveFile(path, true), 1500)
    )
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activePath) void saveFile(activePath)
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setShowSearchPanel(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activePath, saveFile])

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  async function handleExport(): Promise<void> {
    const lastDirKey = `mcide:lastExportDir:${rootPath}`
    const lastDir = localStorage.getItem(lastDirKey) ?? undefined
    const dest = await window.api.saveZipDialog(`${projectName}.zip`, lastDir)
    if (!dest) return

    const hasPackMeta = await window.api.pathExists(`${rootPath}\\pack.mcmeta`)
    if (!hasPackMeta) {
      setStatusMsg('⚠ pack.mcmeta が見つかりません (Minecraftが認識できない可能性があります)')
    }

    setExporting(true)
    try {
      const result = await window.api.exportToZip(rootPath, dest)
      const dir = dest.substring(0, dest.lastIndexOf('\\'))
      if (dir) localStorage.setItem(lastDirKey, dir)
      setLastExportPath(dest)
      setStatusMsg(`✅ エクスポート完了: ${result.fileCount}ファイル / ${formatBytes(result.zipBytes)}`)
    } catch (e) {
      setStatusMsg(`エクスポート失敗: ${String(e)}`)
    } finally {
      setExporting(false)
    }
  }

  function handleTreeAction(action: TreeAction): void {
    setModal(action)
  }

  async function performCreateFile(dirPath: string, dirRelPath: string, name: string): Promise<void> {
    const { ext, templateKey } = guessNewFileDefaults(dirRelPath)
    const finalName = name.includes('.') ? name : name + ext
    const winPath = dirPath.includes('\\') ? `${dirPath}\\${finalName}` : `${dirPath}/${finalName}`
    const exists = await window.api.pathExists(winPath)
    if (exists) {
      setStatusMsg('同名のファイルが既に存在します')
      return
    }
    const content = TEMPLATES[templateKey]
    await window.api.writeFile(winPath, content)
    if (team.active) {
      const relPath = dirRelPath ? `${dirRelPath}/${finalName}` : finalName
      team.notifyLocalCreate(relPath, content)
    }
    onRefresh()
  }

  async function performCreateFolder(dirPath: string, name: string): Promise<void> {
    const winPath = dirPath.includes('\\') ? `${dirPath}\\${name}` : `${dirPath}/${name}`
    await window.api.createDirectory(winPath)
    onRefresh()
  }

  async function performRename(node: FileNode, newName: string): Promise<void> {
    const parentDir = node.path.substring(0, node.path.length - node.name.length)
    const newPath = parentDir + newName
    // チーム同期はファイル単体のリネームのみ追従する (フォルダのリネームは
    // 配下ファイルのrelPathが全て変わるため、今回のバージョンでは対象外)
    if (team.active && !node.isDir) {
      const content = await window.api.readFile(node.path)
      const parentRel = node.relPath.substring(0, node.relPath.length - node.name.length)
      team.notifyLocalDelete(node.relPath)
      team.notifyLocalCreate(`${parentRel}${newName}`, content)
    }
    await window.api.renamePath(node.path, newPath)
    if (openFiles[node.path]) closeTab(node.path)
    onRefresh()
  }

  async function performDelete(node: FileNode): Promise<void> {
    if (team.active) {
      const paths = node.isDir ? collectFilePaths(node) : [node.relPath]
      for (const relPath of paths) team.notifyLocalDelete(relPath)
    }
    await window.api.deletePath(node.path)
    if (!node.isDir && openFiles[node.path]) closeTab(node.path)
    onRefresh()
  }

  const tabs: TabInfo[] = order
    .map((p) => openFiles[p])
    .filter(Boolean)
    .map((f) => ({
      path: f.path,
      relPath: f.relPath,
      name: f.relPath.split('/').pop()!,
      kind: detectResourceKind(f.relPath),
      dirty: !team.active && f.content !== f.savedContent
    }))

  const activeFile = activePath ? openFiles[activePath] : null
  const activeContent = activeFile
    ? (team.active ? team.getLiveContent(activeFile.relPath) : undefined) ?? activeFile.content
    : null

  useEffect(() => {
    if (collab.active) collab.setActiveFile(activeFile?.relPath ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collab.active, activeFile?.relPath])

  function handleFileReplaced(relPath: string, newContent: string): void {
    const abs = `${rootPath}\\${relPath.split('/').join('\\')}`
    setOpenFiles((prev) =>
      prev[abs] ? { ...prev, [abs]: { ...prev[abs], content: newContent, savedContent: newContent } } : prev
    )
    if (team.active) team.applyLocalChange(relPath, newContent)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <strong>🧱 {projectName}</strong>
        <div style={{ flex: 1 }} />
        {statusMsg && <span style={{ color: 'var(--text-1)', fontSize: 12 }}>{statusMsg}</span>}
        {team.active && (
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>🔄 リアルタイム同期中</span>
        )}
        {activeFile && !team.active && (
          <button className="btn btn-primary" onClick={() => saveFile(activeFile.path)}>
            💾 保存 (Ctrl+S)
          </button>
        )}
        {activeFile && (
          <button className="btn" onClick={() => setShowHistoryPanel((v) => !v)}>
            🕐 履歴
          </button>
        )}
        <button className="btn" onClick={handleExport} disabled={exporting}>
          {exporting ? 'エクスポート中...' : '🗜️ Zip書き出し'}
        </button>
        {lastExportPath && (
          <button className="btn" onClick={() => window.api.showItemInFolder(lastExportPath)}>
            📂 出力先を開く
          </button>
        )}
        <button className="btn" onClick={() => setShowTemplateModal(true)}>
          📐 テンプレート適用
        </button>
        <button className="btn" onClick={() => setShowSearchPanel(true)}>
          🔍 検索・置換
        </button>
        <button className="btn" onClick={() => setShowTeamPanel((v) => !v)}>
          👥 チーム{collab.active ? ` (${collab.presence.length})` : ''}
        </button>
        <button className="btn" onClick={() => setShowSettingsModal(true)}>
          ⚙ 設定
        </button>
        <button className="btn" onClick={onCloseProject}>
          プロジェクトを閉じる
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div
          style={{
            width: 260,
            borderRight: '1px solid var(--border)',
            overflow: 'auto',
            background: 'var(--bg-1)',
            flexShrink: 0,
            paddingTop: 6
          }}
        >
          <FileTree node={tree} activePath={activePath} onOpenFile={openFile} onAction={handleTreeAction} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {tabs.length > 0 && (
            <TabBar tabs={tabs} activePath={activePath} onSelect={setActivePath} onClose={closeTab} />
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            {activeFile ? (
              <EditorRouter
                kind={detectResourceKind(activeFile.relPath)}
                content={activeContent ?? activeFile.content}
                onChange={(c) => updateContent(activeFile.path, c)}
              />
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)'
                }}
              >
                左のファイルツリーからファイルを選択してください
              </div>
            )}
          </div>
        </div>
      </div>

      {modal?.type === 'newFile' && (
        <PromptModal
          title="新規ファイル"
          label="ファイル名 (拡張子省略可)"
          onCancel={() => setModal(null)}
          onConfirm={(name) => {
            void performCreateFile(modal.dirPath, modal.dirRelPath, name)
            setModal(null)
          }}
        />
      )}
      {modal?.type === 'newFolder' && (
        <PromptModal
          title="新規フォルダ"
          label="フォルダ名"
          onCancel={() => setModal(null)}
          onConfirm={(name) => {
            void performCreateFolder(modal.dirPath, name)
            setModal(null)
          }}
        />
      )}
      {modal?.type === 'rename' && (
        <PromptModal
          title="名前を変更"
          label="新しい名前"
          defaultValue={modal.node.name}
          confirmLabel="変更"
          onCancel={() => setModal(null)}
          onConfirm={(name) => {
            void performRename(modal.node, name)
            setModal(null)
          }}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmModal
          title="削除の確認"
          message={`"${modal.node.name}" を削除します。この操作は取り消せません。`}
          danger
          confirmLabel="削除"
          onCancel={() => setModal(null)}
          onConfirm={() => {
            void performDelete(modal.node)
            setModal(null)
          }}
        />
      )}
      {showTeamPanel && <TeamPanel onClose={() => setShowTeamPanel(false)} />}
      {showTemplateModal && (
        <TemplateGeneratorModal
          mode="existing"
          existingRootPath={rootPath}
          onCancel={() => setShowTemplateModal(false)}
          onApplied={() => {
            setShowTemplateModal(false)
            onRefresh()
          }}
        />
      )}
      {showSearchPanel && (
        <SearchPanel
          rootPath={rootPath}
          tree={tree}
          onClose={() => setShowSearchPanel(false)}
          onOpenFile={(node) => void openFile(node)}
          onFileReplaced={handleFileReplaced}
        />
      )}
      {showHistoryPanel && activeFile && (
        <HistoryPanel
          rootPath={rootPath}
          relPath={activeFile.relPath}
          onClose={() => setShowHistoryPanel(false)}
          onRestore={(content) => updateContent(activeFile.path, content)}
        />
      )}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  )
}
