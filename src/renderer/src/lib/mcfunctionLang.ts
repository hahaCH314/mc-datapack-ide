import { StreamLanguage, type StreamParser } from '@codemirror/language'

const COMMANDS = [
  'advancement', 'attribute', 'ban', 'ban-ip', 'banlist', 'bossbar', 'clear', 'clone',
  'damage', 'data', 'datapack', 'debug', 'defaultgamemode', 'deop', 'difficulty',
  'effect', 'enchant', 'execute', 'experience', 'fill', 'fillbiome', 'forceload',
  'function', 'gamemode', 'gamerule', 'give', 'help', 'item', 'jfr', 'kick', 'kill',
  'list', 'locate', 'loot', 'me', 'msg', 'op', 'pardon', 'pardon-ip', 'particle',
  'perf', 'place', 'playsound', 'publish', 'random', 'recipe', 'reload', 'return',
  'ride', 'save-all', 'save-off', 'save-on', 'say', 'schedule', 'scoreboard', 'seed',
  'setblock', 'setidletimeout', 'setworldspawn', 'spawnpoint', 'spectate', 'spreadplayers',
  'stop', 'stopsound', 'summon', 'tag', 'team', 'teammsg', 'teleport', 'tell', 'tellraw',
  'time', 'title', 'tm', 'tp', 'trigger', 'w', 'weather', 'whitelist', 'worldborder', 'xp'
]

const SELECTORS = ['@a', '@e', '@p', '@r', '@s']

export const mcfunctionParser: StreamParser<null> = {
  token(stream) {
    if (stream.match(/^#.*/)) return 'comment'
    if (stream.match(/^\$/)) return 'operator'
    if (stream.match(new RegExp('^(' + SELECTORS.join('|') + ')\\b'))) return 'atom'
    if (stream.match(/^-?\d+(\.\d+)?\b/)) return 'number'
    if (stream.match(/^"(?:[^"\\]|\\.)*"/)) return 'string'
    if (stream.match(/^[a-zA-Z_.:][a-zA-Z0-9_./:-]*/)) {
      const word = stream.current()
      if (COMMANDS.includes(word.toLowerCase())) return 'keyword'
      if (word.includes(':')) return 'typeName'
      return null
    }
    stream.next()
    return null
  }
}

export const mcfunctionLanguage = StreamLanguage.define(mcfunctionParser)
