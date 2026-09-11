import { useEffect, useState } from 'react'

interface Props {
  content: string
  onChange: (newContent: string) => void
  renderVisual: (data: any, setData: (d: any) => void) => JSX.Element
  emptyValue?: any
}

/**
 * Provides a "ビジュアル" / "JSON" toggle over a JSON text document.
 * Visual edits are serialized back to text immediately; invalid JSON
 * falls back to raw-text-only mode so nothing is ever silently lost.
 */
export default function JsonDocumentEditor({
  content,
  onChange,
  renderVisual,
  emptyValue = {}
}: Props): JSX.Element {
  const [mode, setMode] = useState<'visual' | 'raw'>('visual')
  const [rawText, setRawText] = useState(content)
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    setRawText(content)
  }, [content])

  let data: any = emptyValue
  let parsedOk = true
  try {
    data = content.trim() ? JSON.parse(content) : emptyValue
  } catch {
    parsedOk = false
  }

  function setData(newData: any): void {
    const text = JSON.stringify(newData, null, 2) + '\n'
    onChange(text)
  }

  function applyRaw(): void {
    try {
      JSON.parse(rawText)
      setParseError(null)
      onChange(rawText)
    } catch (e) {
      setParseError(String((e as Error).message))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '6px 10px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-1)'
        }}
      >
        <button
          className="btn"
          style={{ background: mode === 'visual' ? 'var(--bg-3)' : 'transparent' }}
          onClick={() => setMode('visual')}
          disabled={!parsedOk}
        >
          ビジュアル編集
        </button>
        <button
          className="btn"
          style={{ background: mode === 'raw' ? 'var(--bg-3)' : 'transparent' }}
          onClick={() => setMode('raw')}
        >
          JSON編集
        </button>
        {!parsedOk && (
          <span style={{ color: 'var(--warning)', alignSelf: 'center', fontSize: 12 }}>
            JSONが不正なため、ビジュアル編集は使用できません
          </span>
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: mode === 'visual' ? 16 : 0 }}>
        {mode === 'visual' && parsedOk && renderVisual(data, setData)}
        {mode === 'raw' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                fontFamily: "'Cascadia Code', Consolas, monospace",
                fontSize: 13,
                resize: 'none',
                border: 'none',
                borderRadius: 0,
                background: 'var(--bg-0)'
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 8,
                borderTop: '1px solid var(--border)',
                alignItems: 'center'
              }}
            >
              <button className="btn btn-primary" onClick={applyRaw}>
                適用
              </button>
              {parseError && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{parseError}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
