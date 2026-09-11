import { useEffect, useState } from 'react'

interface ErrorItem {
  id: number
  message: string
}

let nextId = 1

export default function GlobalErrorToast(): JSX.Element {
  const [errors, setErrors] = useState<ErrorItem[]>([])

  useEffect(() => {
    function addError(message: string): void {
      const id = nextId++
      setErrors((prev) => [...prev.slice(-3), { id, message }])
      setTimeout(() => setErrors((prev) => prev.filter((e) => e.id !== id)), 8000)
    }

    function onError(e: ErrorEvent): void {
      addError(`予期しないエラーが発生しました: ${e.message}`)
    }
    function onRejection(e: PromiseRejectionEvent): void {
      const reason = e.reason instanceof Error ? e.reason.message : String(e.reason)
      addError(`処理中にエラーが発生しました: ${reason}`)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  if (errors.length === 0) return <></>

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 3000,
        maxWidth: 420
      }}
    >
      {errors.map((e) => (
        <div
          key={e.id}
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--danger)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12.5,
            color: 'var(--text-0)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{e.message}</span>
          <button
            className="btn-icon"
            onClick={() => setErrors((prev) => prev.filter((x) => x.id !== e.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
