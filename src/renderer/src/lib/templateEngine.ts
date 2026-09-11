import * as yaml from 'js-yaml'

export interface TemplateVariable {
  label?: string
  default?: string
}

export interface TemplateDef {
  name?: string
  description?: string
  variables?: Record<string, string | TemplateVariable>
  files: Record<string, string>
}

export class TemplateParseError extends Error {}

export function parseTemplateDefinition(text: string): TemplateDef {
  let raw: unknown
  try {
    raw = yaml.load(text)
  } catch (e) {
    throw new TemplateParseError(`YAML/JSONの構文が不正です: ${(e as Error).message}`)
  }
  if (!raw || typeof raw !== 'object') {
    throw new TemplateParseError('テンプレート定義はオブジェクトである必要があります')
  }
  const obj = raw as Record<string, unknown>
  if (!obj.files || typeof obj.files !== 'object') {
    throw new TemplateParseError('"files" フィールド (パス -> 内容 のマップ) が必要です')
  }
  const files: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj.files as Record<string, unknown>)) {
    if (typeof v !== 'string') {
      throw new TemplateParseError(`files["${k}"] の内容は文字列である必要があります`)
    }
    files[k] = v
  }
  return {
    name: typeof obj.name === 'string' ? obj.name : undefined,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    variables: (obj.variables as TemplateDef['variables']) ?? undefined,
    files
  }
}

export function getVariableDefaults(def: TemplateDef): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, v] of Object.entries(def.variables ?? {})) {
    out[key] = typeof v === 'string' ? v : (v.default ?? '')
  }
  return out
}

export function getVariableLabel(def: TemplateDef, key: string): string {
  const v = def.variables?.[key]
  if (v && typeof v === 'object' && v.label) return v.label
  return key
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : `{{${name}}}`
  )
}

/** テンプレート定義と変数値から、実際に書き込むべき (相対パス -> 内容) の一覧を作る */
export function renderTemplateFiles(
  def: TemplateDef,
  vars: Record<string, string>
): { relPath: string; content: string }[] {
  const out: { relPath: string; content: string }[] = []
  for (const [pathTpl, contentTpl] of Object.entries(def.files)) {
    const relPath = substitute(pathTpl, vars).replace(/^\/+/, '')
    const content = substitute(contentTpl, vars)
    if (!relPath || relPath.endsWith('/')) continue
    out.push({ relPath, content })
  }
  return out
}
