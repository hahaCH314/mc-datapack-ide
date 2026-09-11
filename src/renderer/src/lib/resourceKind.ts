import type { ResourceKind } from '@shared/types'

// data/<namespace>/<category>/<...path>.json|mcfunction
const DATA_RE = /^data\/([^/]+)\/([^/]+)\/(.+)$/

export function detectResourceKind(relPath: string): ResourceKind {
  if (relPath === 'pack.mcmeta') return 'pack_mcmeta'

  const m = relPath.match(DATA_RE)
  if (m) {
    const [, , category, rest] = m
    if (category === 'function' || category === 'functions') {
      if (rest.endsWith('.mcfunction')) return 'function'
    }
    if (category === 'tags') {
      const tagM = rest.match(/^([^/]+)\/(.+)\.json$/)
      if (tagM) {
        const tagType = tagM[1]
        if (tagType === 'function' || tagType === 'functions') return 'tag_function'
        if (tagType === 'item' || tagType === 'items') return 'tag_item'
        if (tagType === 'block' || tagType === 'blocks') return 'tag_block'
        if (tagType === 'entity_type' || tagType === 'entity_types') return 'tag_entity_type'
        if (tagType === 'fluid' || tagType === 'fluids') return 'tag_fluid'
        return 'tag_generic'
      }
    }
    if ((category === 'recipe' || category === 'recipes') && rest.endsWith('.json')) return 'recipe'
    if ((category === 'loot_table' || category === 'loot_tables') && rest.endsWith('.json'))
      return 'loot_table'
    if ((category === 'advancement' || category === 'advancements') && rest.endsWith('.json'))
      return 'advancement'
  }

  if (relPath.endsWith('.json')) return 'json'
  if (relPath.endsWith('.mcfunction')) return 'function'
  return 'text'
}

export function guessNewFileDefaults(dirRelPath: string): { ext: string; templateKey: keyof typeof import('./templates').TEMPLATES } {
  // dirRelPath は data/<namespace>/<category>[/<...>] というディレクトリの相対パス。
  // ファイル名を付ける前のディレクトリ単体なので、detectResourceKind の
  // 拡張子フォールバック(末尾一致)には頼らず、カテゴリを直接見て判定する。
  const m = dirRelPath.match(/^data\/([^/]+)\/([^/]+)(?:\/(.*))?$/)
  if (!m) return { ext: '.json', templateKey: 'json' }
  const [, , category, rest] = m

  if (category === 'function' || category === 'functions') {
    return { ext: '.mcfunction', templateKey: 'function' }
  }
  if (category === 'tags') {
    return { ext: '.json', templateKey: 'tag' }
  }
  if (category === 'recipe' || category === 'recipes') {
    return { ext: '.json', templateKey: 'recipe_shapeless' }
  }
  if (category === 'loot_table' || category === 'loot_tables') {
    return { ext: '.json', templateKey: 'loot_table' }
  }
  if (category === 'advancement' || category === 'advancements') {
    return { ext: '.json', templateKey: 'advancement' }
  }
  void rest
  return { ext: '.json', templateKey: 'json' }
}

export function iconForKind(kind: ResourceKind): string {
  switch (kind) {
    case 'function':
      return '⚙️'
    case 'tag_function':
    case 'tag_item':
    case 'tag_block':
    case 'tag_entity_type':
    case 'tag_fluid':
    case 'tag_worldgen':
    case 'tag_generic':
      return '🏷️'
    case 'recipe':
      return '🛠️'
    case 'loot_table':
      return '🎁'
    case 'advancement':
      return '🏆'
    case 'pack_mcmeta':
      return '📦'
    case 'json':
      return '{ }'
    default:
      return '📄'
  }
}
