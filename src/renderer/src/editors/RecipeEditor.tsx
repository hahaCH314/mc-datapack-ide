import JsonDocumentEditor from './JsonDocumentEditor'
import ItemIcon from '../components/ItemIcon'

interface Props {
  content: string
  onChange: (c: string) => void
}

const RECIPE_TYPES = [
  { value: 'minecraft:crafting_shaped', label: '作業台 - 形状あり (shaped)' },
  { value: 'minecraft:crafting_shapeless', label: '作業台 - 形状なし (shapeless)' },
  { value: 'minecraft:smelting', label: 'かまど (smelting)' },
  { value: 'minecraft:blasting', label: '溶鉱炉 (blasting)' },
  { value: 'minecraft:smoking', label: '燻製器 (smoking)' },
  { value: 'minecraft:campfire_cooking', label: '焚き火 (campfire_cooking)' },
  { value: 'minecraft:stonecutting', label: '石切台 (stonecutting)' },
  { value: 'minecraft:smithing_transform', label: '鍛冶台 - 変換 (smithing_transform)' },
  { value: 'minecraft:smithing_trim', label: '鍛冶台 - 模様付け (smithing_trim)' }
]

const COOKING_TYPES = new Set([
  'minecraft:smelting',
  'minecraft:blasting',
  'minecraft:smoking',
  'minecraft:campfire_cooking'
])

export default function RecipeEditor({ content, onChange }: Props): JSX.Element {
  return (
    <JsonDocumentEditor
      content={content}
      onChange={onChange}
      emptyValue={{ type: 'minecraft:crafting_shapeless', ingredients: [], result: { id: '', count: 1 } }}
      renderVisual={(data, setData) => <RecipeForm data={data} setData={setData} />}
    />
  )
}

function Item({ label, children }: { label: string; children: JSX.Element }): JSX.Element {
  return (
    <div className="field-row">
      <label>{label}</label>
      {children}
    </div>
  )
}

function RecipeForm({ data, setData }: { data: any; setData: (d: any) => void }): JSX.Element {
  const type = data.type ?? 'minecraft:crafting_shapeless'

  function set(patch: any): void {
    setData({ ...data, ...patch })
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Item label="レシピの種類">
        <select value={type} onChange={(e) => set({ type: e.target.value })}>
          {RECIPE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Item>

      <Item label="グループ (任意 / 同グループはレシピ本で1つにまとめられる)">
        <input value={data.group ?? ''} onChange={(e) => set({ group: e.target.value || undefined })} />
      </Item>

      {type === 'minecraft:crafting_shaped' && <ShapedForm data={data} set={set} />}
      {type === 'minecraft:crafting_shapeless' && <ShapelessForm data={data} set={set} />}
      {COOKING_TYPES.has(type) && <CookingForm data={data} set={set} />}
      {type === 'minecraft:stonecutting' && <StonecuttingForm data={data} set={set} />}
      {(type === 'minecraft:smithing_transform' || type === 'minecraft:smithing_trim') && (
        <SmithingForm data={data} set={set} isTrim={type === 'minecraft:smithing_trim'} />
      )}
    </div>
  )
}

function ResultFields({
  result,
  onChange,
  withCount = true
}: {
  result: any
  onChange: (r: any) => void
  withCount?: boolean
}): JSX.Element {
  const r = result ?? {}
  return (
    <div className="field-row-inline">
      <ItemIcon id={r.id ?? ''} kind="item" />
      <input
        style={{ flex: 1 }}
        placeholder="minecraft:torch"
        value={r.id ?? ''}
        onChange={(e) => onChange({ ...r, id: e.target.value })}
      />
      {withCount && (
        <input
          type="number"
          min={1}
          style={{ width: 80 }}
          value={r.count ?? 1}
          onChange={(e) => onChange({ ...r, count: Number(e.target.value) })}
        />
      )}
    </div>
  )
}

function ShapelessForm({ data, set }: { data: any; set: (p: any) => void }): JSX.Element {
  const ingredients: any[] = data.ingredients ?? []
  function updateIng(i: number, item: string): void {
    const next = [...ingredients]
    next[i] = { item }
    set({ ingredients: next })
  }
  function removeIng(i: number): void {
    set({ ingredients: ingredients.filter((_, idx) => idx !== i) })
  }
  return (
    <>
      <Item label="材料 (最大9個、順不同)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ingredients.map((ing, i) => (
            <div key={i} className="field-row-inline">
              <ItemIcon id={ing.item ?? ''} kind="item" />
              <input
                style={{ flex: 1 }}
                value={ing.item ?? ''}
                placeholder="minecraft:stick"
                onChange={(e) => updateIng(i, e.target.value)}
              />
              <button className="btn btn-icon" onClick={() => removeIng(i)}>
                🗑
              </button>
            </div>
          ))}
          <button className="btn" onClick={() => set({ ingredients: [...ingredients, { item: '' }] })}>
            ＋ 材料を追加
          </button>
        </div>
      </Item>
      <Item label="完成品">
        <ResultFields result={data.result} onChange={(r) => set({ result: r })} />
      </Item>
    </>
  )
}

function ShapedForm({ data, set }: { data: any; set: (p: any) => void }): JSX.Element {
  const pattern: string[] = data.pattern ?? ['   ', '   ', '   ']
  const key: Record<string, any> = data.key ?? {}

  function setCell(row: number, col: number, symbol: string): void {
    const chars = pattern.map((r) => r.padEnd(3, ' ').split(''))
    chars[row][col] = symbol === '' ? ' ' : symbol[0]
    set({ pattern: chars.map((r) => r.join('').replace(/\s+$/, '') || ' ') })
  }

  const usedSymbols = Array.from(new Set(pattern.join('').replace(/\s/g, '').split(''))).filter(Boolean)

  function setKeyItem(symbol: string, item: string): void {
    set({ key: { ...key, [symbol]: { item } } })
  }

  return (
    <>
      <Item label="クラフト枠 (3x3、記号を入力)">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 40px)', gap: 4 }}>
          {[0, 1, 2].map((row) =>
            [0, 1, 2].map((col) => {
              const rowStr = (pattern[row] ?? '').padEnd(3, ' ')
              const val = rowStr[col] === ' ' ? '' : rowStr[col]
              return (
                <input
                  key={`${row}-${col}`}
                  maxLength={1}
                  style={{ width: 40, height: 40, textAlign: 'center', fontSize: 16 }}
                  value={val}
                  onChange={(e) => setCell(row, col, e.target.value)}
                />
              )
            })
          )}
        </div>
      </Item>
      <Item label="記号ごとのアイテム">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {usedSymbols.length === 0 && (
            <span style={{ color: 'var(--text-dim)' }}>上の枠に記号(例: S, X)を入力してください</span>
          )}
          {usedSymbols.map((sym) => (
            <div key={sym} className="field-row-inline">
              <span
                style={{
                  width: 24,
                  textAlign: 'center',
                  fontWeight: 700,
                  background: 'var(--bg-3)',
                  borderRadius: 4
                }}
              >
                {sym}
              </span>
              <ItemIcon id={key[sym]?.item ?? ''} kind="item" />
              <input
                style={{ flex: 1 }}
                placeholder="minecraft:stick"
                value={key[sym]?.item ?? ''}
                onChange={(e) => setKeyItem(sym, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Item>
      <Item label="完成品">
        <ResultFields result={data.result} onChange={(r) => set({ result: r })} />
      </Item>
    </>
  )
}

function CookingForm({ data, set }: { data: any; set: (p: any) => void }): JSX.Element {
  return (
    <>
      <Item label="材料">
        <div className="field-row-inline">
          <ItemIcon id={data.ingredient?.item ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={data.ingredient?.item ?? ''}
            placeholder="minecraft:beef"
            onChange={(e) => set({ ingredient: { item: e.target.value } })}
          />
        </div>
      </Item>
      <Item label="完成品">
        <ResultFields result={data.result} onChange={(r) => set({ result: r })} withCount={false} />
      </Item>
      <Item label="経験値">
        <input
          type="number"
          step="0.1"
          value={data.experience ?? 0}
          onChange={(e) => set({ experience: Number(e.target.value) })}
        />
      </Item>
      <Item label="調理時間 (tick, 20tick=1秒)">
        <input
          type="number"
          value={data.cookingtime ?? 200}
          onChange={(e) => set({ cookingtime: Number(e.target.value) })}
        />
      </Item>
    </>
  )
}

function StonecuttingForm({ data, set }: { data: any; set: (p: any) => void }): JSX.Element {
  return (
    <>
      <Item label="材料">
        <div className="field-row-inline">
          <ItemIcon id={data.ingredient?.item ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={data.ingredient?.item ?? ''}
            placeholder="minecraft:cobblestone"
            onChange={(e) => set({ ingredient: { item: e.target.value } })}
          />
        </div>
      </Item>
      <Item label="完成品">
        <ResultFields result={data.result} onChange={(r) => set({ result: r })} />
      </Item>
    </>
  )
}

function SmithingForm({
  data,
  set,
  isTrim
}: {
  data: any
  set: (p: any) => void
  isTrim: boolean
}): JSX.Element {
  return (
    <>
      <Item label="テンプレート (smithing_template)">
        <div className="field-row-inline">
          <ItemIcon id={data.template?.item ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={data.template?.item ?? ''}
            placeholder="minecraft:netherite_upgrade_smithing_template"
            onChange={(e) => set({ template: { item: e.target.value } })}
          />
        </div>
      </Item>
      <Item label="ベースアイテム">
        <div className="field-row-inline">
          <ItemIcon id={data.base?.item ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={data.base?.item ?? ''}
            placeholder="minecraft:diamond_chestplate"
            onChange={(e) => set({ base: { item: e.target.value } })}
          />
        </div>
      </Item>
      <Item label="追加素材 (addition)">
        <div className="field-row-inline">
          <ItemIcon id={data.addition?.item ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={data.addition?.item ?? ''}
            placeholder="minecraft:netherite_ingot"
            onChange={(e) => set({ addition: { item: e.target.value } })}
          />
        </div>
      </Item>
      {!isTrim && (
        <Item label="完成品">
          <ResultFields result={data.result} onChange={(r) => set({ result: r })} withCount={false} />
        </Item>
      )}
    </>
  )
}
