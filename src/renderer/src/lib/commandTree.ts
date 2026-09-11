// mcfunction 用の簡易コマンドツリー。
// vanillaのBrigadierコマンド木を模した「引数の並び」を定義し、
// 入力中の位置に応じて次に来るべき候補を提示するために使う。
// (存在しないID/構文であっても弾かない=あくまで入力補助であり検証はしない)
//
// 各 CommandNode の `children` は「このノードの次に続きうる候補」を表す。
// 複数の引数を連続させたい場合は children を入れ子にして表現する
// (兄弟として並べると「どちらか一方」の意味になってしまうので注意)。

export type ArgKind =
  | 'selector'
  | 'coordinate'
  | 'rotation'
  | 'block'
  | 'blockWithState'
  | 'item'
  | 'entity'
  | 'int'
  | 'float'
  | 'string'
  | 'word'
  | 'greedy'
  | 'objective'
  | 'team'
  | 'scoreHolder'
  | 'axes'
  | 'json'
  | 'bool'
  | 'gamemode'
  | 'difficulty'
  | 'enchantment'
  | 'effect'
  | 'sound'
  | 'particle'
  | 'dimension'
  | 'slot'
  | 'operation'
  | 'function'
  | 'advancement'
  | 'recipe'
  | 'tagId'
  | 'anchor'
  | 'nbtPath'
  | 'path'

export interface CommandNode {
  /** リテラル(固定キーワード)の場合の文字列 */
  literal?: string
  /** 値を受け取る引数の場合の種類 */
  arg?: ArgKind
  /** 表示用の引数名 (例: targets) */
  argName?: string
  /** このノードの次に続きうる候補。'ROOT' は execute の run のように
   *  コマンド全体を再度たどり直すことを表す */
  children?: (CommandNode | 'ROOT')[]
}

function lit(literal: string, children: (CommandNode | 'ROOT')[] = []): CommandNode {
  return { literal, children }
}
function arg(argName: string, kind: ArgKind, children: (CommandNode | 'ROOT')[] = []): CommandNode {
  return { arg: kind, argName, children }
}

// よく使う「1引数だけ受けてその先に続く」パターンのショートハンド。
// 呼び出しごとに独立したノードを生成するので、続き(children)を
// 使い回しても壊れない。
const targets = (children: (CommandNode | 'ROOT')[] = []): CommandNode =>
  arg('targets', 'selector', children)
// 座標は x, y, z の3トークンで1組。呼び出し側は「3つの座標の後に続くもの」だけを
// childrenとして渡せばよい (内部でx->y->zと連鎖させる)。
const pos = (children: (CommandNode | 'ROOT')[] = []): CommandNode =>
  arg('x', 'coordinate', [arg('y', 'coordinate', [arg('z', 'coordinate', children)])])

function buildExecuteChildren(): (CommandNode | 'ROOT')[] {
  const children: (CommandNode | 'ROOT')[] = []
  children.push(
    lit('align', [arg('axes', 'axes', children)]),
    lit('anchored', [arg('anchor', 'anchor', children)]),
    lit('as', [targets(children)]),
    lit('at', [targets(children)]),
    lit('facing', [
      lit('entity', [targets([arg('anchor', 'anchor', children)])]),
      pos(children)
    ]),
    lit('in', [arg('dimension', 'dimension', children)]),
    lit('positioned', [lit('as', [targets(children)]), pos(children)]),
    lit('rotated', [lit('as', [targets(children)]), arg('rotation', 'rotation', children)]),
    lit('summon', [arg('entity', 'entity', children)]),
    lit('if', [
      lit('block', [pos([arg('block', 'blockWithState', children)])]),
      lit('blocks', [pos([pos([pos([lit('all', children), lit('masked', children)])])])]),
      lit('entity', [targets(children)]),
      lit('score', [
        arg('target', 'scoreHolder', [
          arg('targetObjective', 'objective', [
            ...['<', '<=', '=', '>=', '>'].map((op) =>
              lit(op, [arg('source', 'scoreHolder', [arg('sourceObjective', 'objective', children)])])
            ),
            lit('matches', [arg('range', 'string', children)])
          ])
        ])
      ]),
      lit('predicate', [arg('predicate', 'word', children)]),
      lit('dimension', [arg('dimension', 'dimension', children)])
    ]),
    lit('unless', [
      lit('block', [pos([arg('block', 'blockWithState', children)])]),
      lit('entity', [targets(children)]),
      lit('score', [
        arg('target', 'scoreHolder', [
          arg('targetObjective', 'objective', [lit('matches', [arg('range', 'string', children)])])
        ])
      ])
    ]),
    lit('store', [
      ...['result', 'success'].map((kind) =>
        lit(kind, [
          lit('score', [arg('targets', 'scoreHolder', [arg('objective', 'objective', children)])]),
          lit('bossbar', [arg('id', 'word', [lit('value', children), lit('max', children)])])
        ])
      )
    ]),
    lit('run', ['ROOT'])
  )
  return children
}

const executeChildren = buildExecuteChildren()

export const COMMAND_TREE: CommandNode[] = [
  lit('say', [arg('message', 'greedy')]),
  lit('tellraw', [targets([arg('raw', 'json')])]),
  lit('title', [
    targets([
      lit('clear'),
      lit('reset'),
      lit('title', [arg('title', 'json')]),
      lit('subtitle', [arg('subtitle', 'json')]),
      lit('actionbar', [arg('text', 'json')]),
      lit('times', [arg('fadeIn', 'int', [arg('stay', 'int', [arg('fadeOut', 'int')])])])
    ])
  ]),
  lit('execute', executeChildren),
  lit('give', [targets([arg('item', 'item', [arg('count', 'int')])])]),
  lit('clear', [targets([arg('item', 'item', [arg('maxCount', 'int')])])]),
  lit('effect', [
    lit('give', [targets([arg('effect', 'effect', [arg('seconds', 'int', [arg('amplifier', 'int')])])])]),
    lit('clear', [targets([arg('effect', 'effect')])])
  ]),
  lit('enchant', [targets([arg('enchantment', 'enchantment', [arg('level', 'int')])])]),
  lit('gamemode', [arg('gamemode', 'gamemode', [targets()])]),
  lit('defaultgamemode', [arg('gamemode', 'gamemode')]),
  lit('difficulty', [arg('difficulty', 'difficulty')]),
  lit('teleport', [targets([pos([targets()])])]),
  lit('tp', [targets([pos([targets()])])]),
  lit('kill', [targets()]),
  lit('summon', [arg('entity', 'entity', [pos()])]),
  lit('setblock', [pos([arg('block', 'blockWithState')])]),
  lit('fill', [pos([pos([arg('block', 'blockWithState')])])]),
  lit('fillbiome', [pos([pos([arg('biome', 'word')])])]),
  lit('clone', [pos([pos([pos()])])]),
  lit('gamerule', [arg('rule', 'word', [arg('value', 'bool')])]),
  lit('scoreboard', [
    lit('objectives', [
      lit('add', [arg('objective', 'word', [arg('criteria', 'word', [arg('displayName', 'json')])])]),
      lit('remove', [arg('objective', 'objective')]),
      lit('list'),
      lit('setdisplay', [arg('slot', 'word', [arg('objective', 'objective')])])
    ]),
    lit('players', [
      lit('set', [arg('targets', 'scoreHolder', [arg('objective', 'objective', [arg('score', 'int')])])]),
      lit('add', [arg('targets', 'scoreHolder', [arg('objective', 'objective', [arg('score', 'int')])])]),
      lit('remove', [arg('targets', 'scoreHolder', [arg('objective', 'objective', [arg('score', 'int')])])]),
      lit('get', [arg('target', 'scoreHolder', [arg('objective', 'objective')])]),
      lit('reset', [arg('targets', 'scoreHolder', [arg('objective', 'objective')])]),
      lit('operation', [
        arg('targets', 'scoreHolder', [
          arg('targetObjective', 'objective', [
            arg('operation', 'operation', [
              arg('source', 'scoreHolder', [arg('sourceObjective', 'objective')])
            ])
          ])
        ])
      ])
    ])
  ]),
  lit('tag', [
    targets([lit('add', [arg('name', 'word')]), lit('remove', [arg('name', 'word')]), lit('list')])
  ]),
  lit('team', [
    lit('add', [arg('team', 'word', [arg('displayName', 'json')])]),
    lit('remove', [arg('team', 'team')]),
    lit('empty', [arg('team', 'team')]),
    lit('join', [arg('team', 'team', [targets()])]),
    lit('leave', [targets()]),
    lit('list')
  ]),
  lit('function', [arg('name', 'function')]),
  lit('schedule', [
    lit('function', [arg('name', 'function', [arg('time', 'word', [lit('append'), lit('replace')])])]),
    lit('clear', [arg('name', 'function')])
  ]),
  lit('advancement', [
    lit('grant', [
      targets([
        lit('everything'),
        lit('only', [arg('advancement', 'advancement')]),
        lit('from', [arg('advancement', 'advancement')]),
        lit('until', [arg('advancement', 'advancement')]),
        lit('through', [arg('advancement', 'advancement')])
      ])
    ]),
    lit('revoke', [
      targets([lit('everything'), lit('only', [arg('advancement', 'advancement')])])
    ])
  ]),
  lit('recipe', [
    lit('give', [targets([arg('recipe', 'recipe')])]),
    lit('take', [targets([arg('recipe', 'recipe')])])
  ]),
  lit('playsound', [arg('sound', 'sound', [arg('source', 'word', [targets()])])]),
  lit('stopsound', [targets()]),
  lit('particle', [arg('name', 'particle', [pos()])]),
  lit('weather', [lit('clear'), lit('rain'), lit('thunder')]),
  lit('time', [
    lit('set', [arg('value', 'word')]),
    lit('add', [arg('amount', 'int')]),
    lit('query', [lit('day'), lit('daytime'), lit('gametime')])
  ]),
  lit('worldborder', [
    lit('add', [arg('distance', 'float')]),
    lit('set', [arg('distance', 'float')]),
    lit('center', [pos()]),
    lit('damage', [lit('amount', [arg('damage', 'float')]), lit('buffer', [arg('distance', 'float')])]),
    lit('warning', [lit('distance', [arg('distance', 'int')]), lit('time', [arg('time', 'int')])])
  ]),
  lit('xp', [
    lit('add', [targets([arg('amount', 'int')])]),
    lit('set', [targets([arg('amount', 'int')])]),
    lit('query', [targets()])
  ]),
  lit('experience', [
    lit('add', [targets([arg('amount', 'int')])]),
    lit('set', [targets([arg('amount', 'int')])]),
    lit('query', [targets()])
  ]),
  lit('data', [
    lit('get', [
      lit('block', [pos([arg('path', 'nbtPath')])]),
      lit('entity', [targets([arg('path', 'nbtPath')])]),
      lit('storage', [arg('target', 'word', [arg('path', 'nbtPath')])])
    ]),
    lit('merge', [lit('block', [pos()]), lit('entity', [targets()]), lit('storage', [arg('target', 'word')])]),
    lit('remove', [
      lit('block', [pos([arg('path', 'nbtPath')])]),
      lit('entity', [targets([arg('path', 'nbtPath')])])
    ])
  ]),
  lit('damage', [targets([arg('amount', 'float')])]),
  lit('forceload', [lit('add', [pos([pos()])]), lit('remove', [pos([pos()])]), lit('query')]),
  lit('loot', [
    lit('give', [targets()]),
    lit('insert', [pos()]),
    lit('spawn', [pos()]),
    lit('replace', [lit('block', [pos()]), lit('entity', [targets()])])
  ]),
  lit('item', [
    lit('replace', [
      lit('block', [pos([arg('slot', 'slot')])]),
      lit('entity', [targets([arg('slot', 'slot')])])
    ]),
    lit('modify', [lit('block', [pos()]), lit('entity', [targets()])])
  ]),
  lit('bossbar', [
    lit('add', [arg('id', 'word', [arg('name', 'json')])]),
    lit('remove', [arg('id', 'word')]),
    lit('list'),
    lit('set', [
      arg('id', 'word', [lit('value', [arg('value', 'int')]), lit('max', [arg('max', 'int')]), lit('color')])
    ])
  ]),
  lit('spreadplayers', [
    pos([arg('spreadDistance', 'float', [arg('maxRange', 'float', [arg('respectTeams', 'bool', [targets()])])])])
  ]),
  lit('spawnpoint', [targets([pos()])]),
  lit('setworldspawn', [pos()]),
  lit('random', [lit('value', [arg('range', 'string')]), lit('roll', [arg('range', 'string')])]),
  lit('return', [arg('value', 'int'), lit('run', ['ROOT']), lit('fail')]),
  lit('ride', [targets([lit('mount', [arg('vehicle', 'selector')]), lit('dismount')])]),
  lit('reload'),
  lit('list'),
  lit('me', [arg('message', 'greedy')]),
  lit('msg', [targets([arg('message', 'greedy')])]),
  lit('tell', [targets([arg('message', 'greedy')])]),
  lit('w', [targets([arg('message', 'greedy')])]),
  lit('kick', [targets([arg('reason', 'greedy')])]),
  lit('ban', [targets([arg('reason', 'greedy')])]),
  lit('pardon', [targets()]),
  lit('op', [targets()]),
  lit('deop', [targets()]),
  lit('whitelist', [
    lit('add', [targets()]),
    lit('remove', [targets()]),
    lit('list'),
    lit('on'),
    lit('off'),
    lit('reload')
  ]),
  lit('save-all'),
  lit('save-on'),
  lit('save-off'),
  lit('stop'),
  lit('seed'),
  lit('locate', [
    lit('structure', [arg('structure', 'word')]),
    lit('biome', [arg('biome', 'word')]),
    lit('poi', [arg('poi', 'word')])
  ]),
  lit('place', [lit('feature', [arg('feature', 'word')]), lit('structure', [arg('structure', 'word')])]),
  lit('attribute', [
    targets([
      arg('attribute', 'word', [
        lit('get'),
        lit('base', [lit('get'), lit('set', [arg('value', 'float')])]),
        lit('modifier')
      ])
    ])
  ])
]
