import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { COMMAND_TREE, type ArgKind, type CommandNode } from './commandTree'
import * as mc from './mcData'

interface Token {
  text: string
  from: number
  to: number
}

function tokenize(line: string): Token[] {
  const tokens: Token[] = []
  const re = /"(?:[^"\\]|\\.)*"|\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    tokens.push({ text: m[0], from: m.index, to: m.index + m[0].length })
  }
  return tokens
}

function argValueOptions(kind: ArgKind): string[] {
  switch (kind) {
    case 'selector':
      return ['@a', '@e', '@p', '@r', '@s']
    case 'coordinate':
      return ['~ ~ ~', '~', '^ ^ ^', '0 0 0']
    case 'rotation':
      return ['~ ~', '0 0']
    case 'axes':
      return mc.AXES
    case 'anchor':
      return mc.ANCHORS
    case 'block':
    case 'blockWithState':
      return mc.COMMON_BLOCKS
    case 'item':
      return mc.COMMON_ITEMS
    case 'entity':
      return mc.COMMON_ENTITIES
    case 'bool':
      return mc.BOOLEANS
    case 'gamemode':
      return mc.GAMEMODES
    case 'difficulty':
      return mc.DIFFICULTIES
    case 'enchantment':
      return mc.ENCHANTMENTS
    case 'effect':
      return mc.EFFECTS
    case 'sound':
      return mc.SOUNDS
    case 'particle':
      return mc.PARTICLES
    case 'dimension':
      return mc.DIMENSIONS
    case 'slot':
      return mc.SLOTS
    case 'operation':
      return mc.OPERATIONS
    case 'json':
      return ['{"text":""}']
    default:
      return []
  }
}

/** "diam" が "minecraft:diamond" にもマッチするように、名前空間を除いた
 * 部分への前方一致も許容する (id:に対して先頭一致だけだと使いづらいため) */
function matchesPrefix(label: string, prefix: string): boolean {
  if (!prefix) return true
  const lower = label.toLowerCase()
  const p = prefix.toLowerCase()
  if (lower.startsWith(p)) return true
  const colonIdx = lower.indexOf(':')
  if (colonIdx >= 0 && lower.slice(colonIdx + 1).startsWith(p)) return true
  return false
}

function typeForKind(kind: ArgKind): string {
  if (kind === 'selector') return 'variable'
  if (['int', 'float'].includes(kind)) return 'constant'
  return 'text'
}

function resolveChildren(children: (CommandNode | 'ROOT')[] | undefined): CommandNode[] {
  if (!children) return []
  const out: CommandNode[] = []
  for (const c of children) {
    if (c === 'ROOT') out.push(...COMMAND_TREE)
    else out.push(c)
  }
  return out
}

function normalizeFirstToken(text: string): string {
  return text.startsWith('$') ? text.slice(1) : text
}

/** 現在編集中のトークンが `@e[` のようなセレクタの引数指定途中かどうかを見て、
 * その場合は type=/distance= などのキー候補を優先的に返す */
function selectorBracketCompletion(prefix: string, from: number): CompletionResult | null {
  const m = prefix.match(/^(@[aeprs])\[([^\]]*)$/)
  if (!m) return null
  const inner = m[2]
  const lastSep = Math.max(inner.lastIndexOf(','), inner.lastIndexOf('['))
  const partial = inner.slice(lastSep + 1)
  const keyFrom = from + m[1].length + 1 + lastSep + 1
  if (partial.includes('=')) {
    // sort= や gamemode= の値部分
    const key = partial.split('=')[0]
    let values: string[] = []
    if (key === 'sort') values = mc.SELECTOR_SORTS
    if (key === 'gamemode') values = mc.GAMEMODES
    if (key === 'type' || key === 'type!') values = mc.COMMON_ENTITIES
    if (values.length === 0) return null
    const valueFrom = keyFrom + key.length + 1
    return {
      from: valueFrom,
      options: values.map((v) => ({ label: v, type: 'constant' }))
    }
  }
  return {
    from: keyFrom,
    options: mc.SELECTOR_KEYS.map((k) => ({ label: k, type: 'property' }))
  }
}

export function computeMcfunctionCompletions(lineText: string, cursorCol: number): CompletionResult | null {
  const tokens = tokenize(lineText)
  let curIdx = tokens.findIndex((t) => cursorCol >= t.from && cursorCol <= t.to)
  let from: number
  let prefix: string
  let consumed: string[]

  if (curIdx === -1) {
    // 単語の外 (行頭や空白の直後) -> 新しいトークンを入力しようとしている
    consumed = tokens.filter((t) => t.to <= cursorCol).map((t) => t.text)
    from = cursorCol
    prefix = ''
  } else {
    consumed = tokens.slice(0, curIdx).map((t) => t.text)
    from = tokens[curIdx].from
    prefix = lineText.slice(from, cursorCol)
  }

  const bracketResult = selectorBracketCompletion(prefix, from)
  if (bracketResult) return bracketResult

  let candidates: CommandNode[] = COMMAND_TREE
  for (let i = 0; i < consumed.length; i++) {
    const token = i === 0 ? normalizeFirstToken(consumed[i]) : consumed[i]
    const literalMatches = candidates.filter((c) => c.literal === token)
    if (literalMatches.length > 0) {
      candidates = literalMatches.flatMap((c) => resolveChildren(c.children))
      continue
    }
    const argMatches = candidates.filter((c) => c.arg)
    if (argMatches.length > 0) {
      candidates = argMatches.flatMap((c) => resolveChildren(c.children))
      continue
    }
    // どの分岐にも一致しない = このコマンドの構造は把握していない
    return null
  }

  const seen = new Set<string>()
  const options: { label: string; type: string; detail?: string }[] = []
  for (const c of candidates) {
    if (c.literal) {
      if (seen.has(c.literal)) continue
      seen.add(c.literal)
      options.push({ label: c.literal, type: 'keyword' })
    } else if (c.arg) {
      for (const v of argValueOptions(c.arg)) {
        if (seen.has(v)) continue
        seen.add(v)
        options.push({ label: v, type: typeForKind(c.arg), detail: c.argName })
      }
      if (argValueOptions(c.arg).length === 0 && c.argName) {
        const placeholder = `<${c.argName}>`
        if (!seen.has(placeholder)) {
          seen.add(placeholder)
          options.push({ label: placeholder, type: 'text', detail: c.arg })
        }
      }
    }
  }

  const filtered = options.filter((o) => matchesPrefix(o.label, prefix))
  if (filtered.length === 0) return null
  return { from, options: filtered }
}

export function mcfunctionCompletionSource(context: CompletionContext): CompletionResult | null {
  const line = context.state.doc.lineAt(context.pos)
  const lineText = line.text
  const cursorCol = context.pos - line.from
  if (lineText.trimStart().startsWith('#')) return null
  const result = computeMcfunctionCompletions(lineText, cursorCol)
  if (!result) return null
  return { from: line.from + result.from, options: result.options }
}
