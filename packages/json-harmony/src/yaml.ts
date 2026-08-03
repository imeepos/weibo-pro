import { parse as parseYaml } from 'yaml'
import type { JsonPatterns } from './patterns'
import { RecoveryStrategy } from './types'

/**
 * 检测文本是否为 YAML 格式
 */
export function isYamlFormat(text: string, patterns: JsonPatterns): boolean {
  const trimmed = text.trim()

  if (trimmed.length < 3) return false

  // 如果以 JSON 特征开头，则不是 YAML
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false
  }

  // 检查 YAML 特征
  const yamlStructurePattern = patterns.yamlStructure
  const yamlListPattern = patterns.yamlList
  const yamlMultilinePattern = patterns.yamlMultiline

  return (
    (yamlStructurePattern && yamlStructurePattern.test(trimmed)) ||
    (yamlListPattern && yamlListPattern.test(trimmed)) ||
    (yamlMultilinePattern && yamlMultilinePattern.test(trimmed)) ||
    (trimmed.includes('\n') && trimmed.includes(':'))
  )
}

/**
 * 尝试解析 YAML
 */
export function tryParseYaml(
  text: string,
  patterns: JsonPatterns,
): unknown | null {
  if (!isYamlFormat(text, patterns)) {
    return null
  }

  try {
    return parseYaml(text)
  } catch {
    return null
  }
}

/**
 * 递归处理 JSON 值中的 YAML 字符串
 */
export function processYamlInValue(
  value: unknown,
  recoveryStrategies: string[],
  patterns: JsonPatterns,
): unknown {
  if (typeof value === 'string') {
    const yamlValue = tryParseYaml(value, patterns)
    if (yamlValue !== null) {
      if (!recoveryStrategies.includes(RecoveryStrategy.YamlParsing)) {
        recoveryStrategies.push(RecoveryStrategy.YamlParsing)
      }
      return yamlValue
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      processYamlInValue(item, recoveryStrategies, patterns),
    )
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = processYamlInValue(val, recoveryStrategies, patterns)
    }
    return result
  }

  return value
}
