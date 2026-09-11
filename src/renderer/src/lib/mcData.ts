// よく使う値の候補リスト (網羅的なIDレジストリではなく、実用上よく使うものだけの
// 軽量な候補集合。存在しないIDを弾くバリデーションはしない = 入力の自由度は保つ)

export const GAMEMODES = ['survival', 'creative', 'adventure', 'spectator']
export const DIFFICULTIES = ['peaceful', 'easy', 'normal', 'hard']
export const DIMENSIONS = ['minecraft:overworld', 'minecraft:the_nether', 'minecraft:the_end']
export const BOOLEANS = ['true', 'false']
export const ANCHORS = ['feet', 'eyes']
export const AXES = ['x', 'y', 'z', 'xy', 'xz', 'yz', 'xyz']
export const OPERATIONS = ['=', '+=', '-=', '*=', '/=', '%=', '<', '>', '><']
export const COMPARE_OPS = ['<', '<=', '=', '>=', '>']
export const SLOTS = [
  'weapon.mainhand', 'weapon.offhand', 'armor.head', 'armor.chest', 'armor.legs', 'armor.feet',
  'container.1', 'container.2', 'container.3', 'inventory.0', 'hotbar.0', 'enderchest.0'
]

export const SELECTOR_KEYS = [
  'type=', 'distance=', 'limit=', 'sort=', 'level=', 'gamemode=', 'team=', 'tag=', 'name=',
  'x=', 'y=', 'z=', 'dx=', 'dy=', 'dz=', 'r=', 'rm=', 'rx=', 'rxm=', 'ry=', 'rym=', 'nbt=',
  'scores=', 'advancements=', 'predicate=', 'x_rotation=', 'y_rotation='
]
export const SELECTOR_SORTS = ['nearest', 'furthest', 'random', 'arbitrary']

export const COMMON_ITEMS = [
  'minecraft:stick', 'minecraft:torch', 'minecraft:diamond', 'minecraft:diamond_sword',
  'minecraft:diamond_pickaxe', 'minecraft:diamond_chestplate', 'minecraft:iron_ingot',
  'minecraft:gold_ingot', 'minecraft:netherite_ingot', 'minecraft:emerald', 'minecraft:apple',
  'minecraft:bread', 'minecraft:cooked_beef', 'minecraft:arrow', 'minecraft:bow',
  'minecraft:shield', 'minecraft:ender_pearl', 'minecraft:blaze_rod', 'minecraft:book',
  'minecraft:written_book', 'minecraft:enchanted_book', 'minecraft:name_tag',
  'minecraft:experience_bottle', 'minecraft:potion', 'minecraft:splash_potion',
  'minecraft:firework_rocket', 'minecraft:totem_of_undying', 'minecraft:shulker_box',
  'minecraft:chest', 'minecraft:redstone', 'minecraft:string', 'minecraft:leather',
  'minecraft:paper', 'minecraft:map', 'minecraft:compass', 'minecraft:clock',
  'minecraft:netherite_upgrade_smithing_template', 'minecraft:iron_nugget', 'minecraft:flint',
  'minecraft:egg', 'minecraft:snowball', 'minecraft:water_bucket', 'minecraft:lava_bucket',
  'minecraft:milk_bucket', 'minecraft:wheat', 'minecraft:carrot', 'minecraft:potato',
  'minecraft:golden_apple', 'minecraft:enchanted_golden_apple'
]

export const COMMON_BLOCKS = [
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:cobblestone',
  'minecraft:oak_planks', 'minecraft:oak_log', 'minecraft:glass', 'minecraft:sand',
  'minecraft:gravel', 'minecraft:bedrock', 'minecraft:air', 'minecraft:water', 'minecraft:lava',
  'minecraft:chest', 'minecraft:furnace', 'minecraft:crafting_table', 'minecraft:diamond_block',
  'minecraft:iron_block', 'minecraft:gold_block', 'minecraft:netherite_block',
  'minecraft:redstone_block', 'minecraft:obsidian', 'minecraft:bookshelf',
  'minecraft:command_block', 'minecraft:repeating_command_block', 'minecraft:chain_command_block',
  'minecraft:barrier', 'minecraft:structure_block', 'minecraft:structure_void',
  'minecraft:spawner', 'minecraft:beacon', 'minecraft:tnt', 'minecraft:torch',
  'minecraft:redstone_wire', 'minecraft:lever', 'minecraft:stone_button',
  'minecraft:target', 'minecraft:note_block', 'minecraft:jukebox'
]

export const COMMON_ENTITIES = [
  'minecraft:player', 'minecraft:zombie', 'minecraft:skeleton', 'minecraft:creeper',
  'minecraft:spider', 'minecraft:enderman', 'minecraft:blaze', 'minecraft:cow', 'minecraft:pig',
  'minecraft:sheep', 'minecraft:chicken', 'minecraft:villager', 'minecraft:wolf', 'minecraft:cat',
  'minecraft:iron_golem', 'minecraft:snow_golem', 'minecraft:ender_dragon', 'minecraft:wither',
  'minecraft:item', 'minecraft:armor_stand', 'minecraft:falling_block', 'minecraft:arrow',
  'minecraft:tnt', 'minecraft:experience_orb', 'minecraft:boat', 'minecraft:minecart',
  'minecraft:allay', 'minecraft:axolotl', 'minecraft:bee', 'minecraft:fox', 'minecraft:panda',
  'minecraft:piglin', 'minecraft:hoglin', 'minecraft:strider', 'minecraft:warden'
]

export const EFFECTS = [
  'minecraft:speed', 'minecraft:slowness', 'minecraft:haste', 'minecraft:mining_fatigue',
  'minecraft:strength', 'minecraft:instant_health', 'minecraft:instant_damage',
  'minecraft:jump_boost', 'minecraft:nausea', 'minecraft:regeneration', 'minecraft:resistance',
  'minecraft:fire_resistance', 'minecraft:water_breathing', 'minecraft:invisibility',
  'minecraft:blindness', 'minecraft:night_vision', 'minecraft:hunger', 'minecraft:weakness',
  'minecraft:poison', 'minecraft:wither', 'minecraft:health_boost', 'minecraft:absorption',
  'minecraft:saturation', 'minecraft:glowing', 'minecraft:levitation', 'minecraft:luck',
  'minecraft:slow_falling', 'minecraft:conduit_power', 'minecraft:dolphins_grace', 'minecraft:bad_omen'
]

export const ENCHANTMENTS = [
  'minecraft:sharpness', 'minecraft:smite', 'minecraft:bane_of_arthropods', 'minecraft:knockback',
  'minecraft:fire_aspect', 'minecraft:looting', 'minecraft:sweeping', 'minecraft:efficiency',
  'minecraft:silk_touch', 'minecraft:unbreaking', 'minecraft:fortune', 'minecraft:power',
  'minecraft:punch', 'minecraft:flame', 'minecraft:infinity', 'minecraft:protection',
  'minecraft:fire_protection', 'minecraft:feather_falling', 'minecraft:blast_protection',
  'minecraft:projectile_protection', 'minecraft:respiration', 'minecraft:aqua_affinity',
  'minecraft:thorns', 'minecraft:depth_strider', 'minecraft:frost_walker', 'minecraft:mending',
  'minecraft:curse_of_binding', 'minecraft:curse_of_vanishing', 'minecraft:loyalty',
  'minecraft:riptide', 'minecraft:channeling', 'minecraft:multishot', 'minecraft:quick_charge',
  'minecraft:piercing'
]

export const SOUNDS = [
  'minecraft:entity.player.levelup', 'minecraft:entity.experience_orb.pickup',
  'minecraft:block.note_block.pling', 'minecraft:entity.firework_rocket.blast',
  'minecraft:entity.enderman.teleport', 'minecraft:ui.button.click', 'minecraft:entity.villager.yes',
  'minecraft:entity.villager.no', 'minecraft:block.anvil.use', 'minecraft:entity.arrow.hit_player'
]

export const PARTICLES = [
  'minecraft:flame', 'minecraft:heart', 'minecraft:happy_villager', 'minecraft:smoke',
  'minecraft:large_smoke', 'minecraft:explosion', 'minecraft:cloud', 'minecraft:crit',
  'minecraft:end_rod', 'minecraft:portal', 'minecraft:witch', 'minecraft:note',
  'minecraft:totem_of_undying', 'minecraft:dust'
]
