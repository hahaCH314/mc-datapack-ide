export const TEMPLATES = {
  function: '# 新しい関数\n',
  tag: JSON.stringify({ replace: false, values: [] }, null, 2),
  recipe_shapeless: JSON.stringify(
    {
      type: 'minecraft:crafting_shapeless',
      ingredients: [{ item: 'minecraft:stick' }],
      result: { id: 'minecraft:torch', count: 4 }
    },
    null,
    2
  ),
  loot_table: JSON.stringify(
    {
      type: 'minecraft:block',
      pools: [
        {
          rolls: 1,
          entries: [{ type: 'minecraft:item', name: 'minecraft:stone' }]
        }
      ]
    },
    null,
    2
  ),
  advancement: JSON.stringify(
    {
      display: {
        icon: { id: 'minecraft:diamond' },
        title: { text: '新しい実績' },
        description: { text: '説明文をここに' },
        frame: 'task',
        show_toast: true,
        announce_to_chat: true,
        hidden: false
      },
      criteria: {
        requirement: {
          trigger: 'minecraft:tick'
        }
      }
    },
    null,
    2
  ),
  json: '{}\n'
}
