import type { JsonPatterns } from './patterns'
import type { ParserConfig } from './types'
import { isYamlFormat } from './yaml'

/**
 * 预处理文本：提取 JSON 内容，修复常见错误
 */
export function preprocessText(
  text: string,
  patterns: JsonPatterns,
  config: Required<ParserConfig>,
): string {
  let processed = text

  // 移除 Markdown 代码块
  const markdownFencePattern = patterns.markdownFence
  if (markdownFencePattern) {
    const markdownMatch = markdownFencePattern.exec(processed)
    if (markdownMatch?.[1]) {
      processed = markdownMatch[1]
    }
  }

  // 提取 JSON 内容
  processed = extractJsonContent(processed, patterns)

  // 修复常见错误
  processed = fixCommonErrors(processed, patterns, config)

  return processed
}

/**
 * 提取 JSON 内容
 */
export function extractJsonContent(
  text: string,
  patterns: JsonPatterns,
): string {
  // 首先尝试括号匹配（最可靠）
  const bracketMatched = extractByBracketMatching(text)
  if (bracketMatched) {
    return bracketMatched
  }

  // 尝试正则提取对象
  const objectPattern = patterns.object
  if (objectPattern) {
    const objectMatch = objectPattern.exec(text)
    if (objectMatch) {
      return objectMatch[0]
    }
  }

  // 尝试正则提取数组
  const arrayPattern = patterns.array
  if (arrayPattern) {
    const arrayMatch = arrayPattern.exec(text)
    if (arrayMatch) {
      return arrayMatch[0]
    }
  }

  return text
}

/**
 * 使用括号匹配提取 JSON
 */
export function extractByBracketMatching(text: string): string | null {
  const bracePos = text.indexOf('{')
  const bracketPos = text.indexOf('[')

  let startChar: string
  let endChar: string
  let startPos: number

  if (bracePos !== -1 && bracketPos !== -1) {
    if (bracePos < bracketPos) {
      startChar = '{'
      endChar = '}'
      startPos = bracePos
    } else {
      startChar = '['
      endChar = ']'
      startPos = bracketPos
    }
  } else if (bracePos !== -1) {
    startChar = '{'
    endChar = '}'
    startPos = bracePos
  } else if (bracketPos !== -1) {
    startChar = '['
    endChar = ']'
    startPos = bracketPos
  } else {
    return null
  }

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let i = startPos; i < text.length; i++) {
    const char = text[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === startChar) {
      depth++
    } else if (char === endChar) {
      depth--
      if (depth === 0) {
        return text.slice(startPos, i + 1)
      }
    }
  }

  return null
}

/**
 * 修复常见的 JSON 错误
 */
export function fixCommonErrors(
  text: string,
  patterns: JsonPatterns,
  config: Required<ParserConfig>,
): string {
  let fixed = text

  // 检查是否为 YAML 格式，如果是则跳过某些修复
  const isYaml = isYamlFormat(text, patterns)

  if (!isYaml) {
    // 修复无引号的键
    if (config.enableUnquotedKeys) {
      const unquotedKeyPattern = patterns.unquotedKey
      if (unquotedKeyPattern) {
        fixed = fixed.replace(unquotedKeyPattern, '$1"$2"$3')
      }
    }

    // 修复单引号为双引号
    fixed = fixed.replace(/'/g, '"')
  }

  // 移除尾随逗号
  if (config.enableTrailingCommas) {
    const trailingCommaPattern = patterns.trailingComma
    if (trailingCommaPattern) {
      fixed = fixed.replace(trailingCommaPattern, '$1')
    }
  }

  return fixed
}
