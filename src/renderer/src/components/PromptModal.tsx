import { useState } from 'react'

interface PromptModalProps {
  title: string
  label: string
  defaultValue?: string
  confirmLabel?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function PromptModal({
  title,
  label,
  defaultValue = '',
  confirmLabel = '作成',
  onConfirm,
  onCancel
}: PromptModalProps): JSX.Element {
  const [value, setValue] = useState(defaultValue)
  return (
    <Overlay onCancel={onCancel}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div className="field-row">
        <label>{label}</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) onConfirm(value.trim())
            if (e.key === 'Escape') onCancel()
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button className="btn btn-primary" disabled={!value.trim()} onClick={() => onConfirm(value.trim())}>
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  )
}

interface ConfirmModalProps {
  title: string
  message: string
  danger?: boolean
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  danger,
  confirmLabel = 'OK',
  onConfirm,
  onCancel
}: ConfirmModalProps): JSX.Element {
  return (
    <Overlay onCancel={onCancel}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ color: 'var(--text-1)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel}>
          キャンセル
        </button>
        <button className={danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Overlay>
  )
}

function Overlay({ children, onCancel }: { children: React.ReactNode; onCancel: () => void }): JSX.Element {
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
      onClick={onCancel}
    >
      <div
        className="panel"
        style={{ width: 380, background: 'var(--bg-2)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
