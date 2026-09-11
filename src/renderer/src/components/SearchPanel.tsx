import { useState } from 'react'
import type { FileNode } from '@shared/types'
import { collectFilePaths, findNodeByRelPath } from '../lib/fileTreeUtils'

interface MatchLine {
  lineNumber: number
  lineText: string
}

interface FileMatch {
  relPath: string
  matches: MatchLine[]
}

interface Props {
  rootPath: string
  tree: FileNode
  onOpenFile: (node: FileNode) => void
  onClose: () => void
  onFileReplaced: (relPath: string, newContent: string) => void
}

const TEXT_EXTENSIONS = ['.mcfunction', '.json', '.mcmeta', '.txt']

export default function SearchPanel({
  rootPath,
  tree,
  onOpenFile,
  onClose,
  onFileReplaced
}: Props): JSX.Element {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [results, setResults] = useState<FileMatch[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  function isTextFile(relPath: string): boolean {
    return TEXT_EXTENSIONS.some((ext) => relPath.endsWith(ext))
  }

  async function handleSearch(): Promise<void> {
    if (!query) {
      setResults(null)
      return
    }
    setSearching(true)
    setStatusMsg(null)
    try {
      const relPaths = collectFilePaths(tree).filter(isTextFile)
      const q = caseSensitive ? query : query.toLowerCase()
      const found: FileMatch[] = []
      for (const relPath of relPaths) {
        const node = findNodeByRelPath(tree, relPath)
        if (!node) continue
        const content = await window.api.readFile(node.path)
        const lines = content.split('\n')
        const matches: MatchLine[] = []
        lines.forEach((lineText, idx) => {
          const target = caseSensitive ? lineText : lineText.toLowerCase()
          if (target.includes(q)) matches.push({ lineNumber: idx + 1, lineText })
        })
        if (matches.length > 0) found.push({ relPath, matches })
      }
      setResults(found)
    } finally {
      setSearching(false)
    }
  }

  async function handleReplaceAll(): Promise<void> {
    if (!results || results.length === 0 || !query) return
    setSearching(true)
    try {
      let filesChanged = 0
      let occurrences = 0
      for (const fileMatch of results) {
        const node = findNodeByRelPath(tree, fileMatch.relPath)
        if (!node) continue
        const content = await window.api.readFile(node.path)
        const flags = caseSensitive ? 'g' : 'gi'
        const re = new RegExp(escapeRegExp(query), flags)
        const count = (content.match(re) ?? []).length
        if (count === 0) continue
        const newContent = content.replace(re, replacement)
        await window.api.writeFileWithBackup(rootPath, node.relPath, newContent)
        onFileReplaced(fileMatch.relPath, newContent)
        filesChanged++
        occurrences += count
      }
      setStatusMsg(`✅ ${filesChanged}ファイル / ${occurrences}箇所を置換しました`)
      setResults(null)
    } finally {
      setSearching(false)
    }
  }

  function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: 'var(--bg-1)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1500,
        boxShadow: '-4px 0 16px rgba(0,0,0,0.3)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <strong style={{ flex: 1 }}>🔍 プロジェクト全体を検索</strong>
        <button className="btn-icon" onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={{ padding: 12, borderBottom: '1px solid var(--border)' }}>
        <div className="field-row">
          <label>検索する文字列</label>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
          />
        </div>
        <div className="field-row">
          <label>置換後の文字列 (任意)</label>
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} />
        </div>
        <div className="field-row-inline" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            id="case-sensitive"
            checked={caseSensitive}
            onChange={(e) => setCaseSensitive(e.target.checked)}
          />
          <label htmlFor="case-sensitive">大文字小文字を区別</label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching || !query}>
            検索
          </button>
          <button
            className="btn btn-danger"
            onClick={handleReplaceAll}
            disabled={searching || !results || results.length === 0}
          >
            全て置換
          </button>
        </div>
        {statusMsg && <p style={{ fontSize: 12, color: 'var(--accent)' }}>{statusMsg}</p>}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {searching && <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>検索中...</p>}
        {results && results.length === 0 && !searching && (
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>一致するものが見つかりませんでした</p>
        )}
        {results?.map((fm) => (
          <div key={fm.relPath} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, wordBreak: 'break-all' }}>
              {fm.relPath} ({fm.matches.length})
            </div>
            {fm.matches.slice(0, 20).map((m) => (
              <div
                key={m.lineNumber}
                onClick={() => {
                  const node = findNodeByRelPath(tree, fm.relPath)
                  if (node) onOpenFile(node)
                }}
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-1)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--text-dim)' }}>{m.lineNumber}:</span> {m.lineText.trim()}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
