import { promises as fs } from 'fs'
import * as path from 'path'
import JSZip from 'jszip'
import type { FileNode, NewDatapackOptions } from '../shared/types'

const IGNORE_NAMES = new Set(['.git', '.DS_Store', 'Thumbs.db', '.mcide'])
const HISTORY_DIR_NAME = '.mcide'
const MAX_BACKUPS_PER_FILE = 20
const BACKUP_THROTTLE_MS = 60_000
const lastBackupAt = new Map<string, number>()

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

export async function readDirTree(rootPath: string): Promise<FileNode> {
  async function walk(absPath: string, relPath: string): Promise<FileNode> {
    const stat = await fs.stat(absPath)
    const name = path.basename(absPath) || absPath
    if (!stat.isDirectory()) {
      return { name, path: absPath, relPath: toPosix(relPath), isDir: false }
    }
    const entries = await fs.readdir(absPath, { withFileTypes: true })
    const children: FileNode[] = []
    for (const entry of entries) {
      if (IGNORE_NAMES.has(entry.name)) continue
      const childAbs = path.join(absPath, entry.name)
      const childRel = relPath ? `${relPath}/${entry.name}` : entry.name
      children.push(await walk(childAbs, childRel))
    }
    children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return { name, path: absPath, relPath: toPosix(relPath), isDir: true, children }
  }
  return walk(rootPath, '')
}

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8')
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function deletePath(targetPath: string): Promise<void> {
  await fs.rm(targetPath, { recursive: true, force: true })
}

export async function renamePath(oldPath: string, newPath: string): Promise<void> {
  await fs.mkdir(path.dirname(newPath), { recursive: true })
  await fs.rename(oldPath, newPath)
}

export async function createDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true })
}

function safeHistoryKey(relPath: string): string {
  return relPath.replace(/[\\/:]/g, '__')
}

function historyDirFor(rootPath: string, relPath: string): string {
  return path.join(rootPath, HISTORY_DIR_NAME, 'history', safeHistoryKey(relPath))
}

/**
 * ファイルを保存する前の内容をバックアップ履歴として残しつつ書き込む。
 * 直近のバックアップから一定時間(BACKUP_THROTTLE_MS)経っていない場合は
 * バックアップを作らない (自動保存のたびに大量のスナップショットができるのを防ぐ)。
 */
export async function writeFileWithBackup(
  rootPath: string,
  relPath: string,
  content: string
): Promise<void> {
  const filePath = path.join(rootPath, ...relPath.split('/'))
  const key = `${rootPath}::${relPath}`
  const now = Date.now()
  const lastAt = lastBackupAt.get(key) ?? 0

  if (now - lastAt >= BACKUP_THROTTLE_MS && (await pathExists(filePath))) {
    const oldContent = await fs.readFile(filePath, 'utf-8')
    if (oldContent !== content) {
      const dir = historyDirFor(rootPath, relPath)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path.join(dir, `${now}.snapshot`), oldContent, 'utf-8')
      lastBackupAt.set(key, now)
      await pruneOldBackups(dir)
    }
  }

  await writeFile(filePath, content)
}

async function pruneOldBackups(dir: string): Promise<void> {
  const entries = await fs.readdir(dir)
  if (entries.length <= MAX_BACKUPS_PER_FILE) return
  const sorted = entries.sort()
  const toRemove = sorted.slice(0, sorted.length - MAX_BACKUPS_PER_FILE)
  await Promise.all(toRemove.map((f) => fs.rm(path.join(dir, f), { force: true })))
}

export interface BackupEntry {
  timestamp: number
}

export async function listBackups(rootPath: string, relPath: string): Promise<BackupEntry[]> {
  const dir = historyDirFor(rootPath, relPath)
  if (!(await pathExists(dir))) return []
  const entries = await fs.readdir(dir)
  return entries
    .filter((f) => f.endsWith('.snapshot'))
    .map((f) => ({ timestamp: Number(f.replace('.snapshot', '')) }))
    .filter((e) => !Number.isNaN(e.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)
}

export async function readBackup(rootPath: string, relPath: string, timestamp: number): Promise<string> {
  const dir = historyDirFor(rootPath, relPath)
  return fs.readFile(path.join(dir, `${timestamp}.snapshot`), 'utf-8')
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function createNewDatapack(options: NewDatapackOptions): Promise<string> {
  const root = path.join(options.targetDir, options.folderName)
  if (await pathExists(root)) {
    throw new Error(`フォルダ "${options.folderName}" は既に存在します`)
  }
  await fs.mkdir(root, { recursive: true })
  await fs.writeFile(
    path.join(root, 'pack.mcmeta'),
    JSON.stringify({ pack: options.packSection }, null, 2),
    'utf-8'
  )
  const ns = options.namespace || 'example'
  const dataDir = path.join(root, 'data', ns)
  // 1.21 (pack_format 48) でフォルダ名が複数形→単数形にリネームされた
  const singular = options.formatSortKey >= 48
  const functionDir = singular ? 'function' : 'functions'
  const recipeDir = singular ? 'recipe' : 'recipes'
  const lootTableDir = singular ? 'loot_table' : 'loot_tables'
  const advancementDir = singular ? 'advancement' : 'advancements'

  await fs.mkdir(path.join(dataDir, functionDir), { recursive: true })
  await fs.mkdir(path.join(dataDir, 'tags', functionDir), { recursive: true })
  await fs.mkdir(path.join(dataDir, recipeDir), { recursive: true })
  await fs.mkdir(path.join(dataDir, lootTableDir), { recursive: true })
  await fs.mkdir(path.join(dataDir, advancementDir), { recursive: true })
  await fs.writeFile(
    path.join(dataDir, functionDir, 'main.mcfunction'),
    '# ここに関数の中身を書きます\nsay Hello from ' + ns + '!\n',
    'utf-8'
  )
  await fs.writeFile(
    path.join(dataDir, 'tags', functionDir, 'load.json'),
    JSON.stringify({ values: [`${ns}:main`] }, null, 2),
    'utf-8'
  )
  return root
}

export interface ExportResult {
  fileCount: number
  zipBytes: number
}

export async function exportToZip(rootPath: string, destZipPath: string): Promise<ExportResult> {
  const zip = new JSZip()
  let fileCount = 0

  async function addDir(absDir: string, zipDir: JSZip): Promise<void> {
    const entries = await fs.readdir(absDir, { withFileTypes: true })
    for (const entry of entries) {
      if (IGNORE_NAMES.has(entry.name)) continue
      const abs = path.join(absDir, entry.name)
      if (entry.isDirectory()) {
        await addDir(abs, zipDir.folder(entry.name)!)
      } else {
        const content = await fs.readFile(abs)
        zipDir.file(entry.name, content)
        fileCount++
      }
    }
  }

  await addDir(rootPath, zip)
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  await fs.mkdir(path.dirname(destZipPath), { recursive: true })
  await fs.writeFile(destZipPath, buffer)
  return { fileCount, zipBytes: buffer.length }
}

export async function importFromZip(zipPath: string, destDir: string): Promise<string> {
  const data = await fs.readFile(zipPath)
  const zip = await JSZip.loadAsync(data)
  const baseName = path.basename(zipPath, path.extname(zipPath))
  const targetRoot = path.join(destDir, baseName)
  await fs.mkdir(targetRoot, { recursive: true })

  const entries = Object.values(zip.files)
  for (const entry of entries) {
    const outPath = path.join(targetRoot, entry.name)
    if (entry.dir) {
      await fs.mkdir(outPath, { recursive: true })
    } else {
      await fs.mkdir(path.dirname(outPath), { recursive: true })
      const content = await entry.async('nodebuffer')
      await fs.writeFile(outPath, content)
    }
  }
  return targetRoot
}
