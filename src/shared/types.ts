export interface FileNode {
  name: string
  path: string // absolute path
  relPath: string // relative to project root, posix-separated
  isDir: boolean
  children?: FileNode[]
}

export interface ProjectInfo {
  rootPath: string
  name: string
}

export interface OpenFileResult {
  path: string
  content: string
}

export type ResourceKind =
  | 'function'
  | 'tag_function'
  | 'tag_item'
  | 'tag_block'
  | 'tag_entity_type'
  | 'tag_fluid'
  | 'tag_worldgen'
  | 'tag_generic'
  | 'recipe'
  | 'loot_table'
  | 'advancement'
  | 'pack_mcmeta'
  | 'json'
  | 'text'

export interface NewDatapackOptions {
  targetDir: string // parent directory chosen by user
  folderName: string
  namespace: string
  /** pack.mcmeta の "pack" セクションにそのまま書き込む内容 (バージョンごとの形式差はrenderer側で吸収済み) */
  packSection: Record<string, unknown>
  /** フォルダ名の単数形/複数形などバージョン差の判定に使う代表値 (versionSortKey) */
  formatSortKey: number
}
