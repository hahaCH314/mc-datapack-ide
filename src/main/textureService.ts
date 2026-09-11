import { promises as fs } from 'fs'
import JSZip from 'jszip'

// ユーザー自身が所有するMinecraftのバージョンjarから、アイテム/ブロックの
// テクスチャをその場で読み取ってプレビュー表示するためのサービス。
// Mojangのテクスチャ資産をこのアプリ自体に同梱・再配布することはしない。

let cachedJarPath: string | null = null
let cachedZip: JSZip | null = null
const iconCache = new Map<string, string | null>()

async function getZip(jarPath: string): Promise<JSZip> {
  if (cachedJarPath === jarPath && cachedZip) return cachedZip
  const data = await fs.readFile(jarPath)
  cachedZip = await JSZip.loadAsync(data)
  cachedJarPath = jarPath
  iconCache.clear()
  return cachedZip
}

function stripNamespace(id: string): string {
  return id.includes(':') ? id.split(':')[1] : id
}

/**
 * アイテム/ブロックIDのPNGテクスチャをdata URLとして返す。見つからない場合はnull。
 * ブロックはblockstate/モデルの解決までは行わず、
 * textures/block/<name>.png と textures/item/<name>.png を素直に探すだけの簡易実装。
 */
export async function extractIcon(
  jarPath: string,
  kind: 'item' | 'block',
  id: string
): Promise<string | null> {
  const name = stripNamespace(id)
  const cacheKey = `${jarPath}::${kind}::${name}`
  if (iconCache.has(cacheKey)) return iconCache.get(cacheKey)!

  try {
    const zip = await getZip(jarPath)
    const candidates =
      kind === 'item'
        ? [`assets/minecraft/textures/item/${name}.png`, `assets/minecraft/textures/block/${name}.png`]
        : [`assets/minecraft/textures/block/${name}.png`, `assets/minecraft/textures/item/${name}.png`]

    for (const candidate of candidates) {
      const entry = zip.file(candidate)
      if (entry) {
        const buf = await entry.async('nodebuffer')
        const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
        iconCache.set(cacheKey, dataUrl)
        return dataUrl
      }
    }
    iconCache.set(cacheKey, null)
    return null
  } catch {
    iconCache.set(cacheKey, null)
    return null
  }
}
