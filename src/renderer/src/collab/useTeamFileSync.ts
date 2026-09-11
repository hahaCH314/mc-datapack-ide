import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import type { FileNode } from '@shared/types'
import { useCollab } from './CollabContext'
import { collectFilePaths } from '../lib/fileTreeUtils'

const LOCAL_ORIGIN = 'local-disk'

interface Options {
  rootPath: string
  tree: FileNode
  onRefresh: () => void
}

interface Binding {
  ytext: Y.Text
  observer: () => void
}

/**
 * ローカルのファイルシステムと、チームセッション中のYjs共有ドキュメントとを
 * 双方向に同期させるブリッジ。ホスト・ゲストどちらも同じロジックで動作する
 * (どちらも「自分のディスク上のコピー」を持ち、それをYjsで同期する)。
 *
 * 同期する範囲: ファイルの新規作成 / 内容の変更 / 明示的な削除操作。
 * アプリの外でファイルを直接いじった場合の差分検知は行わない。
 */
export function useTeamFileSync({ rootPath, tree, onRefresh }: Options): {
  active: boolean
  getLiveContent: (relPath: string) => string | undefined
  registerOpenFile: (relPath: string, diskContent: string) => void
  unregisterOpenFile: (relPath: string) => void
  applyLocalChange: (relPath: string, newContent: string) => void
  notifyLocalCreate: (relPath: string, content: string) => void
  notifyLocalDelete: (relPath: string) => void
} {
  const collab = useCollab()
  const bindingsRef = useRef<Map<string, Binding>>(new Map())
  const [, forceRender] = useState(0)
  const liveContentRef = useRef<Map<string, string>>(new Map())

  const active = collab.active

  function ensureBinding(relPath: string, seedContent: string): Y.Text {
    const filesMap = collab.getFilesMap()
    if (!filesMap) throw new Error('collab not active')
    let ytext = filesMap.get(relPath)
    if (!ytext) {
      ytext = new Y.Text(seedContent)
      filesMap.set(relPath, ytext)
    }
    let binding = bindingsRef.current.get(relPath)
    if (!binding) {
      const observer = (): void => {
        const text = ytext!.toString()
        liveContentRef.current.set(relPath, text)
        forceRender((n) => n + 1)
        void window.api.writeFileWithBackup(rootPath, relPath, text)
      }
      ytext.observe(observer)
      binding = { ytext, observer }
      bindingsRef.current.set(relPath, binding)
      liveContentRef.current.set(relPath, ytext.toString())
    }
    return ytext
  }

  function registerOpenFile(relPath: string, diskContent: string): void {
    if (!active) return
    ensureBinding(relPath, diskContent)
  }

  function unregisterOpenFile(relPath: string): void {
    const binding = bindingsRef.current.get(relPath)
    if (!binding) return
    binding.ytext.unobserve(binding.observer)
    bindingsRef.current.delete(relPath)
    liveContentRef.current.delete(relPath)
  }

  function getLiveContent(relPath: string): string | undefined {
    if (!active) return undefined
    return liveContentRef.current.get(relPath)
  }

  function applyLocalChange(relPath: string, newContent: string): void {
    if (!active) return
    const ytext = ensureBinding(relPath, newContent)
    const doc = collab.getDoc()
    if (!doc) return
    const current = ytext.toString()
    if (current === newContent) return
    doc.transact(() => {
      ytext.delete(0, ytext.length)
      ytext.insert(0, newContent)
    }, LOCAL_ORIGIN)
  }

  function notifyLocalCreate(relPath: string, content: string): void {
    if (!active) return
    ensureBinding(relPath, content)
  }

  function notifyLocalDelete(relPath: string): void {
    if (!active) return
    const filesMap = collab.getFilesMap()
    filesMap?.delete(relPath)
    unregisterOpenFile(relPath)
  }

  // 構造同期: リモートで追加/削除されたファイルをローカルディスクへ反映する
  useEffect(() => {
    if (!active) return
    const filesMap = collab.getFilesMap()
    if (!filesMap) return

    function materializeRemoteFile(relPath: string, ytext: Y.Text): void {
      void window.api.writeFileWithBackup(rootPath, relPath, ytext.toString()).then(onRefresh)
    }

    function handleMapEvent(event: Y.YMapEvent<Y.Text>, transaction: Y.Transaction): void {
      if (transaction.local) return
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add') {
          const ytext = filesMap!.get(key)
          if (ytext) materializeRemoteFile(key, ytext)
        } else if (change.action === 'delete') {
          const abs = toAbsolutePath(rootPath, key)
          unregisterOpenFile(key)
          void window.api.deletePath(abs).then(onRefresh)
        }
      })
    }

    filesMap.observe(handleMapEvent)

    // 開始直後の初期同期 (どちらが先行していても両方向でつじつまを合わせる):
    // - ホストの場合: ローカルにあって共有ドキュメントに無いファイルを送る
    // - ゲストの場合: 共有ドキュメントにあってローカルに無いファイルを取り込む
    const localPaths = collectFilePaths(tree)
    const localSet = new Set(localPaths)
    for (const relPath of localPaths) {
      if (filesMap.has(relPath)) continue
      const abs = toAbsolutePath(rootPath, relPath)
      void window.api.readFile(abs).then((content) => {
        if (!filesMap.has(relPath)) filesMap.set(relPath, new Y.Text(content))
      })
    }
    filesMap.forEach((ytext, relPath) => {
      if (!localSet.has(relPath)) materializeRemoteFile(relPath, ytext)
    })

    return () => filesMap.unobserve(handleMapEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, collab])

  return {
    active,
    getLiveContent,
    registerOpenFile,
    unregisterOpenFile,
    applyLocalChange,
    notifyLocalCreate,
    notifyLocalDelete
  }
}

function toAbsolutePath(rootPath: string, relPath: string): string {
  const sep = rootPath.includes('\\') ? '\\' : '/'
  const normalized = relPath.split('/').join(sep)
  return `${rootPath}${sep}${normalized}`
}
