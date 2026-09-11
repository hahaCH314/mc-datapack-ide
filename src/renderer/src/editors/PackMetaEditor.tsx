import JsonDocumentEditor from './JsonDocumentEditor'
import { MC_VERSIONS, DEFAULT_MC_VERSION, buildPackSection, readPackSection } from '@shared/mcVersions'

interface Props {
  content: string
  onChange: (c: string) => void
}

export default function PackMetaEditor({ content, onChange }: Props): JSX.Element {
  return (
    <JsonDocumentEditor
      content={content}
      onChange={onChange}
      emptyValue={{ pack: buildPackSection(DEFAULT_MC_VERSION, '') }}
      renderVisual={(data, setData) => <PackMetaForm data={data} setData={setData} />}
    />
  )
}

function PackMetaForm({ data, setData }: { data: any; setData: (d: any) => void }): JSX.Element {
  const pack = data.pack ?? {}
  const parsed = readPackSection(pack)
  const known = MC_VERSIONS.find((v) =>
    parsed.scheme === 'range'
      ? v.formatRange && v.formatRange[0] === parsed.formatRange?.[0] && v.formatRange[1] === parsed.formatRange?.[1]
      : v.packFormat === parsed.packFormat
  )

  function setDescription(description: string): void {
    setData({ ...data, pack: { ...pack, description } })
  }

  function selectVersion(versionLabel: string): void {
    const v = MC_VERSIONS.find((x) => x.version === versionLabel)
    if (v) setData({ ...data, pack: buildPackSection(v, parsed.description) })
  }

  function setLegacyFormat(n: number): void {
    setData({ ...data, pack: { description: parsed.description, pack_format: n } })
  }

  function setRangeFormat(major: number, minor: number): void {
    setData({
      ...data,
      pack: { description: parsed.description, min_format: [major, minor], max_format: [major, minor] }
    })
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <div className="field-row">
        <label>説明 (description)</label>
        <input value={parsed.description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="field-row">
        <label>対象バージョン</label>
        <select value={known ? known.version : 'custom'} onChange={(e) => selectVersion(e.target.value)}>
          {MC_VERSIONS.map((v) => (
            <option key={v.version} value={v.version}>
              {v.version} ({v.formatRange ? `format ${v.formatRange[0]}.${v.formatRange[1]}` : `pack_format ${v.packFormat}`})
            </option>
          ))}
          {!known && <option value="custom">カスタム</option>}
        </select>
        {known?.snapshot && (
          <p style={{ color: 'var(--warning)', fontSize: 11.5, marginTop: 4 }}>
            ⚠ スナップショット/プレリリース版です。正式リリースまでに形式番号が変わる場合があります
          </p>
        )}
      </div>

      {parsed.scheme === 'legacy' ? (
        <div className="field-row">
          <label>pack_format (数値を直接指定)</label>
          <input
            type="number"
            value={parsed.packFormat ?? 0}
            onChange={(e) => setLegacyFormat(Number(e.target.value))}
          />
        </div>
      ) : (
        <div className="field-row">
          <label>min_format / max_format (メジャー.マイナー)</label>
          <div className="field-row-inline">
            <input
              type="number"
              style={{ width: 100 }}
              value={parsed.formatRange?.[0] ?? 0}
              onChange={(e) => setRangeFormat(Number(e.target.value), parsed.formatRange?.[1] ?? 0)}
            />
            <span>.</span>
            <input
              type="number"
              style={{ width: 80 }}
              value={parsed.formatRange?.[1] ?? 0}
              onChange={(e) => setRangeFormat(parsed.formatRange?.[0] ?? 0, Number(e.target.value))}
            />
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 11.5, marginTop: 4 }}>
            1.21.9以降のMinecraftは、pack_formatの代わりにこの範囲指定形式を使います
          </p>
        </div>
      )}
    </div>
  )
}
