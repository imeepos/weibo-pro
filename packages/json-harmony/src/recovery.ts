import { parse as parseYaml } from 'yaml'
import type { JsonPatterns } from './patterns'
import { extractJsonContent } from './preprocess'
import { RecoveryStrategy } from './types'
import type { ParserConfig } from './types'
import { isYamlFormat } from './yaml'

/**
 * 从错误中恢复：尝试多种策略解析
 */
export function recoverFromError(
  text: string,
  recoveryStrategies: string[],
  patterns: JsonPatterns,
  config: Required<ParserConfig>,
): unknown {
  // 策略 1: 标准 JSON 解析
  try {
    const result = JSON.parse(text)
    recoveryStrategies.push(RecoveryStrategy.StandardJson)
    return result
  } catch {
    // 继续尝试其他策略
  }

  // 策略 2: 修复字符串内未转义的引号
  try {
    const fixed = fixUnescapedQuotesInStrings(text)
    const result = JSON.parse(fixed)
    recoveryStrategies.push(RecoveryStrategy.UnescapedQuotesFix)
    return result
  } catch {
    // 继续
  }

  // 策略 3: 手动修复后解析
  try {
    const fixed = manualFix(text, patterns)
    const result = JSON.parse(fixed)
    recoveryStrategies.push(RecoveryStrategy.ManualFix)
    return result
  } catch {
    // 继续
  }

  // 策略 4: 正则提取后解析
  try {
    const extracted = extractJsonContent(text, patterns)
    if (extracted !== text) {
      const result = JSON.parse(extracted)
      recoveryStrategies.push(RecoveryStrategy.RegexExtract)
      return result
    }
  } catch {
    // 继续
  }

  // 策略 5: YAML 解析
  if (config.enableYamlParsing && isYamlFormat(text, patterns)) {
    try {
      const result = parseYaml(text)
      recoveryStrategies.push(RecoveryStrategy.YamlParsing)
      return result
    } catch {
      // 继续
    }
  }

  // 策略 6: 部分解析
  try {
    const result = partialParse(text)
    recoveryStrategies.push(RecoveryStrategy.PartialParse)
    return result
  } catch {
    // 继续
  }

  // 最后：保留为字符串
  if (text.trim()) {
    recoveryStrategies.push(RecoveryStrategy.PreserveAsString)
    return text
  }

  return null
}

/**
 * 手动修复常见错误
 */
export function manualFix(text: string, patterns: JsonPatterns): string {
  let fixed = text

  // 修复无引号的键
  const unquotedKeyPattern = patterns.unquotedKey
  if (unquotedKeyPattern) {
    fixed = fixed.replace(unquotedKeyPattern, '$1"$2"$3')
  }

  // 移除尾随逗号
  const trailingCommaPattern = patterns.trailingComma
  if (trailingCommaPattern) {
    fixed = fixed.replace(trailingCommaPattern, '$1')
  }

  // 修复单引号
  fixed = fixed.replace(/'/g, '"')

  return fixed
}

/**
 * 修复字符串值内未转义的引号
 * 智能检测字符串边界，转义字符串内部的引号
 */
export function fixUnescapedQuotesInStrings(text: string): string {
  let result = ''
  let inString = false
  let _stringStartPos = -1
  let escapeNext = false
  let colonFound = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const _prevChar = i > 0 ? text[i - 1] : ''

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      result += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      if (!inString) {
        // 进入字符串
        inString = true
        _stringStartPos = i
        colonFound = false
        result += char
      } else {
        // 可能是字符串结束
        // 检查后面的字符判断是否真的结束
        const nextNonSpace = findNextNonSpace(text, i + 1)

        if (
          nextNonSpace === ',' ||
          nextNonSpace === '}' ||
          nextNonSpace === ']' ||
          nextNonSpace === null
        ) {
          // 确实是字符串结束
          inString = false
          result += char
        } else if (nextNonSpace === ':' && !colonFound) {
          // 这是键名的结束引号
          inString = false
          colonFound = true
          result += char
        } else {
          // 这是字符串内部的引号，需要转义
          result += '\\"'
        }
      }
    } else {
      result += char
    }
  }

  return result
}

/**
 * 找到下一个非空白字符
 */
function findNextNonSpace(text: string, startPos: number): string | null {
  for (let i = startPos; i < text.length; i++) {
    const char = text[i]
    if (!char) continue
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
      return char
    }
  }
  return null
}

/**
 * 部分解析：逐行尝试
 */
export function partialParse(text: string): unknown {
  const lines = text.split('\n')

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j <= lines.length; j++) {
      try {
        const partial = lines.slice(i, j).join('\n')
        return JSON.parse(partial)
      } catch {
        // 继续尝试
      }
    }
  }

  throw new Error('部分解析失败')
}
