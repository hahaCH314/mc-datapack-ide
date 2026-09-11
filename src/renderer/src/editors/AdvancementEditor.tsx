import { useState } from 'react'
import JsonDocumentEditor from './JsonDocumentEditor'
import ItemIcon from '../components/ItemIcon'

interface Props {
  content: string
  onChange: (c: string) => void
}

const FRAMES = [
  { value: 'task', label: 'task (通常)' },
  { value: 'goal', label: 'goal (目標)' },
  { value: 'challenge', label: 'challenge (挑戦)' }
]

const TRIGGERS = [
  'minecraft:tick',
  'minecraft:player_killed_entity',
  'minecraft:entity_killed_player',
  'minecraft:consume_item',
  'minecraft:inventory_changed',
  'minecraft:location',
  'minecraft:enter_block',
  'minecraft:item_used_on_block',
  'minecraft:recipe_unlocked',
  'minecraft:changed_dimension',
  'minecraft:effects_changed',
  'minecraft:impossible'
]

export default function AdvancementEditor({ content, onChange }: Props): JSX.Element {
  return (
    <JsonDocumentEditor
      content={content}
      onChange={onChange}
      emptyValue={{
        display: {
          icon: { id: 'minecraft:diamond' },
          title: { text: '' },
          description: { text: '' },
          frame: 'task'
        },
        criteria: {}
      }}
      renderVisual={(data, setData) => <AdvancementForm data={data} setData={setData} />}
    />
  )
}

function textOf(v: any): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'text' in v) return v.text
  return ''
}

function AdvancementForm({ data, setData }: { data: any; setData: (d: any) => void }): JSX.Element {
  const display = data.display ?? {}
  const criteria: Record<string, any> = data.criteria ?? {}

  function setDisplay(patch: any): void {
    setData({ ...data, display: { ...display, ...patch } })
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <p className="section-title">親の実績 (parent)</p>
      <input
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="namespace:path/to/parent (ルートの場合は空欄)"
        value={data.parent ?? ''}
        onChange={(e) => setData({ ...data, parent: e.target.value || undefined })}
      />

      <p className="section-title">表示設定 (display)</p>
      <div className="field-row">
        <label>アイコン (アイテムID)</label>
        <div className="field-row-inline">
          <ItemIcon id={display.icon?.id ?? ''} kind="item" />
          <input
            style={{ flex: 1 }}
            value={display.icon?.id ?? ''}
            placeholder="minecraft:diamond"
            onChange={(e) => setDisplay({ icon: { ...display.icon, id: e.target.value } })}
          />
        </div>
      </div>
      <div className="field-row">
        <label>タイトル</label>
        <input
          value={textOf(display.title)}
          onChange={(e) => setDisplay({ title: { text: e.target.value } })}
        />
      </div>
      <div className="field-row">
        <label>説明</label>
        <input
          value={textOf(display.description)}
          onChange={(e) => setDisplay({ description: { text: e.target.value } })}
        />
      </div>
      <div className="field-row">
        <label>フレームの種類</label>
        <select value={display.frame ?? 'task'} onChange={(e) => setDisplay({ frame: e.target.value })}>
          {FRAMES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field-row-inline" style={{ marginBottom: 8 }}>
        <input
          type="checkbox"
          id="adv-toast"
          checked={display.show_toast !== false}
          onChange={(e) => setDisplay({ show_toast: e.target.checked })}
        />
        <label htmlFor="adv-toast">達成時にトースト通知を表示する</label>
      </div>
      <div className="field-row-inline" style={{ marginBottom: 8 }}>
        <input
          type="checkbox"
          id="adv-chat"
          checked={display.announce_to_chat !== false}
          onChange={(e) => setDisplay({ announce_to_chat: e.target.checked })}
        />
        <label htmlFor="adv-chat">達成時にチャットで告知する</label>
      </div>
      <div className="field-row-inline" style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          id="adv-hidden"
          checked={!!display.hidden}
          onChange={(e) => setDisplay({ hidden: e.target.checked })}
        />
        <label htmlFor="adv-hidden">達成するまで実績ツリーに表示しない (hidden)</label>
      </div>

      <p className="section-title">達成条件 (criteria)</p>
      <CriteriaEditor
        criteria={criteria}
        onChange={(c) => setData({ ...data, criteria: c })}
      />

      <p className="section-title" style={{ marginTop: 16 }}>
        報酬 (rewards, 任意)
      </p>
      <RewardsEditor rewards={data.rewards} onChange={(r) => setData({ ...data, rewards: r })} />
    </div>
  )
}

function CriteriaEditor({
  criteria,
  onChange
}: {
  criteria: Record<string, any>
  onChange: (c: Record<string, any>) => void
}): JSX.Element {
  const names = Object.keys(criteria)

  function renameCriterion(oldName: string, newName: string): void {
    if (!newName || newName === oldName) return
    const next: Record<string, any> = {}
    for (const n of names) next[n === oldName ? newName : n] = criteria[n]
    onChange(next)
  }

  function setTrigger(name: string, trigger: string): void {
    onChange({ ...criteria, [name]: { ...criteria[name], trigger } })
  }

  function setConditionsRaw(name: string, raw: string): void {
    try {
      const conditions = raw.trim() ? JSON.parse(raw) : undefined
      onChange({ ...criteria, [name]: { ...criteria[name], conditions } })
    } catch {
      // 一時的な入力ミスは無視し、有効なJSONになるまで反映しない
    }
  }

  function removeCriterion(name: string): void {
    const next = { ...criteria }
    delete next[name]
    onChange(next)
  }

  function addCriterion(): void {
    let i = 1
    let name = 'criterion_1'
    while (criteria[name]) {
      i++
      name = `criterion_${i}`
    }
    onChange({ ...criteria, [name]: { trigger: 'minecraft:tick' } })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {names.map((name) => (
        <CriterionCard
          key={name}
          name={name}
          data={criteria[name]}
          onRename={(n) => renameCriterion(name, n)}
          onTriggerChange={(t) => setTrigger(name, t)}
          onConditionsChange={(raw) => setConditionsRaw(name, raw)}
          onRemove={() => removeCriterion(name)}
        />
      ))}
      <button className="btn" onClick={addCriterion}>
        ＋ 条件を追加
      </button>
    </div>
  )
}

function CriterionCard({
  name,
  data,
  onRename,
  onTriggerChange,
  onConditionsChange,
  onRemove
}: {
  name: string
  data: any
  onRename: (n: string) => void
  onTriggerChange: (t: string) => void
  onConditionsChange: (raw: string) => void
  onRemove: () => void
}): JSX.Element {
  const [nameDraft, setNameDraft] = useState(name)
  const [conditionsRaw, setConditionsRaw] = useState(
    data.conditions ? JSON.stringify(data.conditions, null, 2) : ''
  )

  return (
    <div className="panel">
      <div className="field-row-inline" style={{ marginBottom: 8 }}>
        <input
          style={{ width: 160 }}
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => onRename(nameDraft)}
          title="条件の名前"
        />
        <select style={{ flex: 1 }} value={data.trigger ?? ''} onChange={(e) => onTriggerChange(e.target.value)}>
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button className="btn btn-icon" onClick={onRemove}>
          🗑
        </button>
      </div>
      <details>
        <summary style={{ cursor: 'pointer', color: 'var(--text-1)', fontSize: 12 }}>
          詳細条件 (conditions) を JSON で編集
        </summary>
        <textarea
          style={{ width: '100%', minHeight: 80, marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}
          value={conditionsRaw}
          placeholder="{}"
          onChange={(e) => {
            setConditionsRaw(e.target.value)
            onConditionsChange(e.target.value)
          }}
        />
      </details>
    </div>
  )
}

function RewardsEditor({
  rewards,
  onChange
}: {
  rewards: any
  onChange: (r: any | undefined) => void
}): JSX.Element {
  const r = rewards ?? {}
  function set(patch: any): void {
    const next = { ...r, ...patch }
    const cleaned = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== ''))
    onChange(Object.keys(cleaned).length ? cleaned : undefined)
  }
  return (
    <>
      <div className="field-row">
        <label>経験値 (experience)</label>
        <input
          type="number"
          value={r.experience ?? ''}
          onChange={(e) => set({ experience: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>
      <div className="field-row">
        <label>実行する関数 (function)</label>
        <input
          placeholder="namespace:path"
          value={r.function ?? ''}
          onChange={(e) => set({ function: e.target.value || undefined })}
        />
      </div>
    </>
  )
}
