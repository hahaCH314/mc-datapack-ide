import type { ResourceKind } from '@shared/types'
import FunctionEditor from './FunctionEditor'
import PackMetaEditor from './PackMetaEditor'
import TagEditor from './TagEditor'
import RecipeEditor from './RecipeEditor'
import LootTableEditor from './LootTableEditor'
import AdvancementEditor from './AdvancementEditor'
import PlainTextEditor from './PlainTextEditor'

interface Props {
  kind: ResourceKind
  content: string
  onChange: (c: string) => void
}

export default function EditorRouter({ kind, content, onChange }: Props): JSX.Element {
  switch (kind) {
    case 'function':
      return <FunctionEditor content={content} onChange={onChange} />
    case 'pack_mcmeta':
      return <PackMetaEditor content={content} onChange={onChange} />
    case 'tag_function':
    case 'tag_item':
    case 'tag_block':
    case 'tag_entity_type':
    case 'tag_fluid':
    case 'tag_worldgen':
    case 'tag_generic':
      return <TagEditor content={content} onChange={onChange} />
    case 'recipe':
      return <RecipeEditor content={content} onChange={onChange} />
    case 'loot_table':
      return <LootTableEditor content={content} onChange={onChange} />
    case 'advancement':
      return <AdvancementEditor content={content} onChange={onChange} />
    case 'json':
    case 'text':
    default:
      return <PlainTextEditor content={content} onChange={onChange} />
  }
}
