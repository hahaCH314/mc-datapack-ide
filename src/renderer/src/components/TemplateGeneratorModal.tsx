import { useMemo, useState } from 'react'
import { BUILTIN_TEMPLATES } from '../lib/builtinTemplates'
import {
  parseTemplateDefinition,
  getVariableDefaults,
  getVariableLabel,
  renderTemplateFiles,
  TemplateParseError,
  type TemplateDef
} from '../lib/templateEngine'

interface Props {
  mode: 'new' | 'existing'
  existingRootPath?: string
  onCancel: () => void
  onCreated?: (rootPath: string) => void
  onApplied?: () => void
}

export default function TemplateGeneratorModal({
  mode,
  existingRootPath,
  onCancel,
  onCreated,
  onApplied
}: Props): JSX.Element {
  const [yamlText, setYamlText] = useState(BUILTIN_TEMPLATES[0].yaml)
  const [folderName, setFolderName] = useState('my_template_pack')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = useMemo<{ def: TemplateDef | null; error: string | null }>(() => {
    try {
      return { def: parseTemplateDefinition(yamlText), error: null }
    } catch (e) {
      return { def: null, error: e instanceof TemplateParseError ? e.message : String(e) }
    }
  }, [yamlText])

  const [varOverrides, setVarOverrides] = useState<Record<string, string>>({})
  const defaults = parsed.def ? getVariableDefaults(parsed.def) : {}
  const vars = { ...defaults, ...varOverrides }

  function loadBuiltin(id: string): void {
    const t = BUILTIN_TEMPLATES.find((b) => b.id === id)
    if (t) {
      setYamlText(t.yaml)
      setVarOverrides({})
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!parsed.def) return
    setError(null)
    setBusy(true)
    try {
      const files = renderTemplateFiles(parsed.def, vars)
      if (files.length === 0) {
        setError('生成対象のファイルがありません (files が空です)')
        return
      }

      let root: string
      if (mode === 'new') {
        const targetDir = await window.api.chooseParentDir()
        if (!targetDir) {
          setBusy(false)
          return
        }
        root = `${targetDir}\\${folderName}`.replace(/\\+/g, '\\')
        const exists = await window.api.pathExists(root)
        if (exists) {
          setError(`フォルダ "${folderName}" は既に存在します`)
          return
        }
        await window.api.createDirectory(root)
      } else {
        root = existingRootPath!
      }

      for (const f of files) {
        const abs = `${root}\\${f.relPath.split('/').join('\\')}`
        await window.api.writeFile(abs, f.content)
      }

      if (mode === 'new') onCreated?.(root)
      else onApplied?.()
    } catch (e) {
      setError(String(e))
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
      <div className="panel" style={{ width: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-2)' }}>
        <h3 style={{ marginTop: 0 }}>📐 テンプレートから構成を生成</h3>
        <p style={{ color: 'var(--text-1)', fontSize: 12.5, marginTop: -8 }}>
          YAML (またはJSON) で <code>files: {'{'}相対パス: 内容{'}'}</code> の形式を書くと、その通りの
          フォルダ/ファイル構成を一括生成します。<code>{'{{変数名}}'}</code> はプレースホルダとして
          パス・内容の両方で置き換えられます。
        </p>

        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="field-row-inline" style={{ marginBottom: 6 }}>
              <label style={{ marginRight: 4 }}>組み込みテンプレート:</label>
              <select onChange={(e) => loadBuiltin(e.target.value)} defaultValue="">
                <option value="" disabled>
                  読み込む...
                </option>
                {BUILTIN_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 320,
                fontFamily: "'Cascadia Code', Consolas, monospace",
                fontSize: 12.5,
                resize: 'none'
              }}
            />
            {parsed.error && (
              <p style={{ color: 'var(--danger)', fontSize: 12 }}>⚠ {parsed.error}</p>
            )}
          </div>

          <div style={{ width: 260, flexShrink: 0, overflow: 'auto' }}>
            <p className="section-title">変数</p>
            {parsed.def && Object.keys(parsed.def.variables ?? {}).length === 0 && (
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>このテンプレートに変数はありません</p>
            )}
            {parsed.def &&
              Object.keys(parsed.def.variables ?? {}).map((key) => (
                <div className="field-row" key={key}>
                  <label>{getVariableLabel(parsed.def!, key)}</label>
                  <input
                    value={vars[key] ?? ''}
                    onChange={(e) => setVarOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}

            {mode === 'new' && (
              <div className="field-row">
                <label>作成するフォルダ名</label>
                <input value={folderName} onChange={(e) => setFolderName(e.target.value)} />
              </div>
            )}

            {parsed.def && (
              <>
                <p className="section-title">生成されるファイル</p>
                <ul style={{ fontSize: 11.5, color: 'var(--text-1)', paddingLeft: 18, margin: 0 }}>
                  {renderTemplateFiles(parsed.def, vars).map((f) => (
                    <li key={f.relPath} style={{ wordBreak: 'break-all', marginBottom: 2 }}>
                      {f.relPath}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn" onClick={onCancel} disabled={busy}>
            キャンセル
          </button>
          <button className="btn btn-primary" disabled={busy || !parsed.def} onClick={handleGenerate}>
            {busy ? '生成中...' : mode === 'new' ? '新規プロジェクトとして生成' : 'このプロジェクトに生成'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  )
}
