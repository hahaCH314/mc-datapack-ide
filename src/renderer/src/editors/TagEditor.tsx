import JsonDocumentEditor from './JsonDocumentEditor'

interface Props {
  content: string
  onChange: (c: string) => void
}

interface TagData {
  replace?: boolean
  values: (string | { id: string; required?: boolean })[]
}

export default function TagEditor({ content, onChange }: Props): JSX.Element {
  return (
    <JsonDocumentEditor
      content={content}
      onChange={onChange}
      emptyValue={{ values: [] }}
      renderVisual={(data: TagData, setData) => (
        <TagForm data={data} setData={setData} />
      )}
    />
  )
}

function TagForm({ data, setData }: { data: TagData; setData: (d: TagData) => void }): JSX.Element {
  const values = data.values ?? []

  function updateValue(index: number, newVal: string): void {
    const next = [...values]
    const cur = next[index]
    if (typeof cur === 'object' && cur !== null) {
      next[index] = { ...cur, id: newVal }
    } else {
      next[index] = newVal
    }
    setData({ ...data, values: next })
  }

  function removeValue(index: number): void {
    setData({ ...data, values: values.filter((_, i) => i !== index) })
  }

  function addValue(): void {
    setData({ ...data, values: [...values, ''] })
  }

  return (
    <div>
      <div className="field-row-inline" style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={!!data.replace}
          onChange={(e) => setData({ ...data, replace: e.target.checked })}
          id="tag-replace"
        />
        <label htmlFor="tag-replace" style={{ cursor: 'pointer' }}>
          replace (他パックの同名タグを上書きする)
        </label>
      </div>

      <p className="section-title">値 (要素)</p>
      <p style={{ color: 'var(--text-dim)', marginTop: -6 }}>
        例: <code>minecraft:stick</code> / 別タグを参照する場合は{' '}
        <code>#minecraft:logs</code> のように # を先頭につけます
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {values.map((v, i) => {
          const strVal = typeof v === 'object' && v !== null ? v.id : v
          return (
            <div key={i} className="field-row-inline">
              <input
                style={{ flex: 1 }}
                value={strVal}
                placeholder="minecraft:stick"
                onChange={(e) => updateValue(i, e.target.value)}
              />
              <button className="btn btn-icon" onClick={() => removeValue(i)} title="削除">
                🗑
              </button>
            </div>
          )
        })}
      </div>
      <button className="btn" style={{ marginTop: 10 }} onClick={addValue}>
        ＋ 値を追加
      </button>
    </div>
  )
}
