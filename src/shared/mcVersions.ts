export interface McVersionInfo {
  version: string
  /** 旧形式: 単一整数のpack_format (1.21.8以前) */
  packFormat?: number
  /** 新形式: [major, minor] のmin_format/max_format (1.21.9以降で導入) */
  formatRange?: [number, number]
  /** スナップショット/プレリリースなど、値が今後変わりうるバージョンか */
  snapshot?: boolean
}

// Java Edition datapack format history (data pack format numbers).
// https://minecraft.wiki/w/Pack_format
// 1.21.9 以降は "pack_format" (単一整数) ではなく "min_format"/"max_format"
// ([メジャー, マイナー] の配列) を使う新形式に変更された。
export const MC_VERSIONS: McVersionInfo[] = [
  { version: '26.3-pre-3 (最新のスナップショット)', formatRange: [121, 0], snapshot: true },
  { version: '26.2 (最新のリリース)', formatRange: [107, 1] },
  { version: '26.1 - 26.1.2', formatRange: [101, 1] },
  { version: '1.21.11', formatRange: [94, 1] },
  { version: '1.21.9 - 1.21.10', formatRange: [88, 0] },
  { version: '1.21.7 - 1.21.8', packFormat: 81 },
  { version: '1.21.6', packFormat: 80 },
  { version: '1.21.5', packFormat: 71 },
  { version: '1.21.4', packFormat: 61 },
  { version: '1.21.2 - 1.21.3', packFormat: 57 },
  { version: '1.21 - 1.21.1', packFormat: 48 },
  { version: '1.20.5 - 1.20.6', packFormat: 41 },
  { version: '1.20.3 - 1.20.4', packFormat: 26 },
  { version: '1.20.2', packFormat: 18 },
  { version: '1.20 - 1.20.1', packFormat: 15 },
  { version: '1.19.4', packFormat: 12 },
  { version: '1.19 - 1.19.3', packFormat: 10 },
  { version: '1.18 - 1.18.2', packFormat: 8 },
  { version: '1.17 - 1.17.1', packFormat: 7 },
  { version: '1.16.2 - 1.16.5', packFormat: 6 },
  { version: '1.15 - 1.16.1', packFormat: 5 }
]

// デフォルトは最新の安定版 (スナップショットは明示的に選んだ場合のみ使う)
export const DEFAULT_MC_VERSION = MC_VERSIONS.find((v) => !v.snapshot) ?? MC_VERSIONS[0]

/** フォルダの単数形/複数形の判定など、バージョンの新旧比較に使う代表値 */
export function versionSortKey(v: McVersionInfo): number {
  return v.formatRange ? v.formatRange[0] : (v.packFormat ?? 0)
}

/** pack.mcmeta の "pack" セクションを、そのバージョンに合った形式で組み立てる */
export function buildPackSection(v: McVersionInfo, description: string): Record<string, unknown> {
  if (v.formatRange) {
    return { description, min_format: v.formatRange, max_format: v.formatRange }
  }
  return { description, pack_format: v.packFormat }
}

/** 既存のpack.mcmetaのpackセクションから、表示用にバージョン情報を読み取る */
export function readPackSection(pack: any): {
  description: string
  scheme: 'legacy' | 'range'
  packFormat?: number
  formatRange?: [number, number]
} {
  const description = typeof pack?.description === 'string' ? pack.description : ''
  if (Array.isArray(pack?.min_format)) {
    return {
      description,
      scheme: 'range',
      formatRange: [pack.min_format[0] ?? 0, pack.min_format[1] ?? 0]
    }
  }
  return { description, scheme: 'legacy', packFormat: pack?.pack_format ?? 0 }
}
