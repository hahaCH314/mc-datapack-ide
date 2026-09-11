import { useEffect, useState } from 'react'

const JAR_PATH_KEY = 'mcide:minecraftJarPath'
const iconCache = new Map<string, string | null>()

export function getMinecraftJarPath(): string | null {
  return localStorage.getItem(JAR_PATH_KEY)
}

export function setMinecraftJarPath(jarPath: string | null): void {
  if (jarPath) localStorage.setItem(JAR_PATH_KEY, jarPath)
  else localStorage.removeItem(JAR_PATH_KEY)
  iconCache.clear()
}

interface Props {
  id: string
  kind: 'item' | 'block'
  size?: number
}

export default function ItemIcon({ id, kind, size = 24 }: Props): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null | undefined>(undefined)
  const jarPath = getMinecraftJarPath()

  useEffect(() => {
    if (!jarPath || !id) {
      setDataUrl(null)
      return
    }
    const cacheKey = `${jarPath}::${kind}::${id}`
    if (iconCache.has(cacheKey)) {
      setDataUrl(iconCache.get(cacheKey)!)
      return
    }
    let cancelled = false
    setDataUrl(undefined)
    void window.api.extractIcon(jarPath, kind, id).then((result) => {
      iconCache.set(cacheKey, result)
      if (!cancelled) setDataUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [jarPath, kind, id])

  const style: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: 4,
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    imageRendering: 'pixelated',
    fontSize: size * 0.5,
    color: 'var(--text-dim)'
  }

  if (!jarPath) {
    return (
      <div style={style} title="設定でMinecraftのjarファイルを指定するとプレビューが表示されます">
        🧊
      </div>
    )
  }
  if (dataUrl === undefined) {
    return <div style={style}>…</div>
  }
  if (dataUrl === null) {
    return (
      <div style={style} title={`テクスチャが見つかりませんでした: ${id}`}>
        ?
      </div>
    )
  }
  return (
    <img
      src={dataUrl}
      alt={id}
      style={{ ...style, objectFit: 'contain', background: 'var(--bg-3)' }}
    />
  )
}
