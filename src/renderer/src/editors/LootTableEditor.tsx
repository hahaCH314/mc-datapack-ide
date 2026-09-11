import JsonDocumentEditor from './JsonDocumentEditor'
import ItemIcon from '../components/ItemIcon'

interface Props {
  content: string
  onChange: (c: string) => void
}

const TABLE_TYPES = [
  { value: 'minecraft:block', label: 'ブロック (block)' },
  { value: 'minecraft:entity', label: 'エンティティ (entity)' },
  { value: 'minecraft:chest', label: 'チェスト (chest)' },
  { value: 'minecraft:fishing', label: '釣り (fishing)' },
  { value: 'minecraft:gift', label: '贈り物 (gift)' },
  { value: 'minecraft:generic', label: '汎用 (generic)' }
]

const ENTRY_TYPES = [
  { value: 'minecraft:item', label: 'アイテム' },
  { value: 'minecraft:loot_table', label: '別のルートテーブルを参照' },
  { value: 'minecraft:tag', label: 'アイテムタグ' },
  { value: 'minecraft:empty', label: '何も出さない' }
]

export default function LootTableEditor({ content, onChange }: Props): JSX.Element {
  return (
    <JsonDocumentEditor
      content={content}
      onChange={onChange}
      emptyValue={{ type: 'minecraft:block', pools: [] }}
      renderVisual={(data, setData) => <LootTableForm data={data} setData={setData} />}
    />
  )
}

function LootTableForm({ data, setData }: { data: any; setData: (d: any) => void }): JSX.Element {
  const pools: any[] = data.pools ?? []

  function updatePool(i: number, pool: any): void {
    const next = [...pools]
    next[i] = pool
    setData({ ...data, pools: next })
  }
  function removePool(i: number): void {
    setData({ ...data, pools: pools.filter((_, idx) => idx !== i) })
  }
  function addPool(): void {
    setData({ ...data, pools: [...pools, { rolls: 1, entries: [] }] })
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="field-row">
        <label>ルートテーブルの種類</label>
        <select value={data.type ?? 'minecraft:block'} onChange={(e) => setData({ ...data, type: e.target.value })}>
          {TABLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <p className="section-title">プール (Pools)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pools.map((pool, i) => (
          <PoolCard key={i} pool={pool} onChange={(p) => updatePool(i, p)} onRemove={() => removePool(i)} />
        ))}
      </div>
      <button className="btn" style={{ marginTop: 10 }} onClick={addPool}>
        ＋ プールを追加
      </button>
    </div>
  )
}

function PoolCard({
  pool,
  onChange,
  onRemove
}: {
  pool: any
  onChange: (p: any) => void
  onRemove: () => void
}): JSX.Element {
  const entries: any[] = pool.entries ?? []

  function updateEntry(i: number, entry: any): void {
    const next = [...entries]
    next[i] = entry
    onChange({ ...pool, entries: next })
  }
  function removeEntry(i: number): void {
    onChange({ ...pool, entries: entries.filter((_, idx) => idx !== i) })
  }
  function addEntry(): void {
    onChange({ ...pool, entries: [...entries, { type: 'minecraft:item', name: '' }] })
  }

  return (
    <div className="panel">
      <div className="field-row-inline" style={{ marginBottom: 10 }}>
        <label style={{ width: 90 }}>抽選回数 (rolls)</label>
        <input
          type="number"
          style={{ width: 80 }}
          value={pool.rolls ?? 1}
          onChange={(e) => onChange({ ...pool, rolls: Number(e.target.value) })}
        />
        <div style={{ flex: 1 }} />
        <button className="btn btn-danger" onClick={onRemove}>
          プールを削除
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((entry, i) => (
          <EntryRow key={i} entry={entry} onChange={(e) => updateEntry(i, e)} onRemove={() => removeEntry(i)} />
        ))}
      </div>
      <button className="btn" style={{ marginTop: 8 }} onClick={addEntry}>
        ＋ エントリを追加
      </button>
    </div>
  )
}

function EntryRow({
  entry,
  onChange,
  onRemove
}: {
  entry: any
  onChange: (e: any) => void
  onRemove: () => void
}): JSX.Element {
  const type = entry.type ?? 'minecraft:item'
  const functions: any[] = entry.functions ?? []
  const setCountFn = functions.find((f) => f.function === 'minecraft:set_count')

  function setCountRange(min: number, max: number): void {
    const otherFns = functions.filter((f) => f.function !== 'minecraft:set_count')
    onChange({
      ...entry,
      functions: [...otherFns, { function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min, max } }]
    })
  }

  function removeCountFn(): void {
    onChange({ ...entry, functions: functions.filter((f) => f.function !== 'minecraft:set_count') })
  }

  return (
    <div style={{ background: 'var(--bg-2)', borderRadius: 6, padding: 10 }}>
      <div className="field-row-inline" style={{ marginBottom: 6 }}>
        <select style={{ width: 170 }} value={type} onChange={(e) => onChange({ ...entry, type: e.target.value })}>
          {ENTRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {type !== 'minecraft:empty' && (
          <>
            {(type === 'minecraft:item' || type === 'minecraft:tag') && (
              <ItemIcon id={entry.name ?? ''} kind="item" />
            )}
            <input
              style={{ flex: 1 }}
              placeholder={type === 'minecraft:loot_table' ? 'namespace:path/to/table' : 'minecraft:diamond'}
              value={entry.name ?? ''}
              onChange={(e) => onChange({ ...entry, name: e.target.value })}
            />
          </>
        )}
        <input
          type="number"
          style={{ width: 60 }}
          title="重み (weight)"
          placeholder="重み"
          value={entry.weight ?? ''}
          onChange={(e) => onChange({ ...entry, weight: e.target.value ? Number(e.target.value) : undefined })}
        />
        <button className="btn btn-icon" onClick={onRemove}>
          🗑
        </button>
      </div>
      {type === 'minecraft:item' && (
        <div className="field-row-inline">
          <input type="checkbox" id={`cnt-${entry.name}`} checked={!!setCountFn} onChange={(e) => (e.target.checked ? setCountRange(1, 1) : removeCountFn())} />
          <label htmlFor={`cnt-${entry.name}`}>個数を指定する</label>
          {setCountFn && (
            <>
              <input
                type="number"
                style={{ width: 60 }}
                value={setCountFn.count?.min ?? 1}
                onChange={(e) => setCountRange(Number(e.target.value), setCountFn.count?.max ?? 1)}
              />
              〜
              <input
                type="number"
                style={{ width: 60 }}
                value={setCountFn.count?.max ?? 1}
                onChange={(e) => setCountRange(setCountFn.count?.min ?? 1, Number(e.target.value))}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
