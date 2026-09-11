import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('画面の描画中にエラーが発生しました:', error, info)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 12,
          padding: 24,
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: 40 }}>⚠️</div>
        <h2 style={{ margin: 0 }}>画面の表示中にエラーが発生しました</h2>
        <p style={{ color: 'var(--text-1)', maxWidth: 500 }}>
          予期しない問題が発生し、この画面を表示できませんでした。
          「再読み込み」で復帰できることがほとんどです。編集中の内容は自動保存されているため、
          多くの場合は失われません。
        </p>
        <details style={{ maxWidth: 600, textAlign: 'left', color: 'var(--text-dim)', fontSize: 12 }}>
          <summary style={{ cursor: 'pointer' }}>技術的な詳細を見る</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.error.message}
            {'\n'}
            {this.state.error.stack}
          </pre>
        </details>
        <button className="btn btn-primary" onClick={() => location.reload()}>
          🔄 再読み込み
        </button>
      </div>
    )
  }
}
