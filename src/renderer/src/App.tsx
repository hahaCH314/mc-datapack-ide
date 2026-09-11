import { useCallback, useEffect, useState } from 'react'
import type { FileNode } from '@shared/types'
import WelcomeScreen from './screens/WelcomeScreen'
import EditorShell from './screens/EditorShell'
import { useCollab } from './collab/CollabContext'

export default function App(): JSX.Element {
  const collab = useCollab()
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [tree, setTree] = useState<FileNode | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTree = useCallback(async (root: string) => {
    setLoading(true)
    setError(null)
    try {
      const t = await window.api.readDirTree(root)
      setTree(t)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (rootPath) void refreshTree(rootPath)
  }, [rootPath, refreshTree])

  if (!rootPath || !tree) {
    return (
      <WelcomeScreen
        onOpened={(root) => setRootPath(root)}
        loading={loading}
        error={error}
        setError={setError}
      />
    )
  }

  return (
    <EditorShell
      rootPath={rootPath}
      tree={tree}
      onRefresh={() => refreshTree(rootPath)}
      onCloseProject={() => {
        if (collab.active) collab.leave()
        setRootPath(null)
        setTree(null)
      }}
    />
  )
}
