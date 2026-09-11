export interface BuiltinTemplate {
  id: string
  label: string
  yaml: string
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: 'blank',
    label: '最小構成 (pack.mcmeta + load関数)',
    yaml: `name: 最小構成
description: pack.mcmeta と起動時に実行される関数だけの、最小限の構成です
variables:
  namespace:
    label: 名前空間
    default: example
  pack_format:
    label: pack_format
    default: "48"
  description:
    label: パックの説明
    default: My datapack
files:
  pack.mcmeta: |
    {
      "pack": {
        "pack_format": {{pack_format}},
        "description": "{{description}}"
      }
    }
  data/{{namespace}}/function/load.mcfunction: |
    # データパック読み込み時に実行されます
    say {{namespace}} datapack loaded!
  data/{{namespace}}/tags/function/load.json: |
    {
      "values": ["{{namespace}}:load"]
    }
`
  },
  {
    id: 'scoreboard-shop',
    label: 'スコアボード式ショップの雛形',
    yaml: `name: スコアボード式ショップ
description: 通貨スコアを使った簡易ショップ機能の雛形です
variables:
  namespace:
    label: 名前空間
    default: shop
files:
  data/{{namespace}}/function/init.mcfunction: |
    scoreboard objectives add money dummy "所持金"
    scoreboard players add @a money 0
  data/{{namespace}}/function/buy_sword.mcfunction: |
    execute if score @s money matches 100.. run scoreboard players remove @s money 100
    execute if score @s money matches 100.. run give @s minecraft:iron_sword
    execute unless score @s money matches 100.. run tellraw @s {"text":"お金が足りません","color":"red"}
  data/{{namespace}}/tags/function/load.json: |
    { "values": ["{{namespace}}:init"] }
`
  },
  {
    id: 'advancement-tree',
    label: '実績ツリー (root + 子実績)',
    yaml: `name: 実績ツリー
description: ルート実績と、それに続く子実績のペアです
variables:
  namespace:
    label: 名前空間
    default: example
files:
  data/{{namespace}}/advancement/root.json: |
    {
      "display": {
        "icon": { "id": "minecraft:grass_block" },
        "title": { "text": "{{namespace}}へようこそ" },
        "description": { "text": "このデータパックの実績ツリーのはじまり" },
        "frame": "task",
        "background": "minecraft:textures/block/stone.png",
        "show_toast": false,
        "announce_to_chat": false
      },
      "criteria": {
        "tick": { "trigger": "minecraft:tick" }
      }
    }
  data/{{namespace}}/advancement/first_step.json: |
    {
      "parent": "{{namespace}}:root",
      "display": {
        "icon": { "id": "minecraft:diamond" },
        "title": { "text": "最初の一歩" },
        "description": { "text": "ダイヤモンドを手に入れよう" },
        "frame": "task"
      },
      "criteria": {
        "got_diamond": {
          "trigger": "minecraft:inventory_changed",
          "conditions": { "items": [{ "items": ["minecraft:diamond"] }] }
        }
      }
    }
`
  }
]
