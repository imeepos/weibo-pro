import { parse as parseYaml } from 'yaml'
import type { ParseResult, ParserConfig } from './types'
import { RecoveryStrategy } from './types'

const DEFAULT_CONFIG: Required<ParserConfig> = {
  maxTextLength: 1024 * 1024, // 1MB
  enableUnquotedKeys: true,
  enableTrailingCommas: true,
  enableYamlParsing: true,
  timeoutMs: 30000, // 30秒
}

/**
 * JSON Harmony Parser
 * 在混沌中寻找和谐，优雅地解析损坏的 JSON
 */
export class JsonHarmonyParser {
  private readonly config: Required<ParserConfig>
  private readonly patterns: Record<string, RegExp>

  constructor(config?: ParserConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.patterns = this.initPatterns()
  }

  /**
   * 初始化正则表达式模式
   */
  private initPatterns(): Record<string, RegExp> {
    return {
      // Markdown 代码块
      markdownFence: /```(?:json)?\s*\n?([\s\S]*?)\n?```/,
      // JSON 对象（简化的贪婪匹配）
      object: /\{[\s\S]*\}/,
      // JSON 数组（简化的贪婪匹配）
      array: /\[[\s\S]*\]/,
      // 无引号的键：只匹配在 { 或 , 后面的无引号键（避免匹配字符串值内的 word: 模式）
      unquotedKey: /([{,]\s*)(\w+)(\s*:)/g,
      // 尾随逗号
      trailingComma: /,\s*([}\]])/g,
      // YAML 键值对结构
      yamlStructure: /^[\s]*[\w\-\.]+:\s*.*$/m,
      // YAML 列表
      yamlList: /^[\s]*-\s+/m,
      // YAML 多行字符串
      yamlMultiline: /[|>][\s]*\n/,
    }
  }

  /**
   * 解析文本，返回和谐的数据
   */
  parse<T = unknown>(text: string): ParseResult<T> {
    const startTime = Date.now()
    const recoveryStrategies: string[] = []

    // 检查文本长度
    if (text.length > this.config.maxTextLength) {
      throw new Error(`文本过长：${text.length} 字节`)
    }

    // 首先尝试标准 JSON 解析
    try {
      const data = JSON.parse(text) as T
      const processedData = this.config.enableYamlParsing
        ? this.processYamlInValue(data, recoveryStrategies)
        : data

      return {
        data: processedData as T,
        statistics: {
          parseTimeMs: Date.now() - startTime,
          recoveryStrategiesUsed: recoveryStrategies.length > 0
            ? recoveryStrategies
            : [RecoveryStrategy.StandardJson],
        },
      }
    } catch {
      // 标准解析失败，继续使用容错解析
    }

    // 预处理文本
    const cleanedText = this.preprocessText(text)

    // 尝试恢复策略
    try {
      const data = this.recoverFromError(cleanedText, recoveryStrategies)
      const processedData = this.config.enableYamlParsing
        ? this.processYamlInValue(data, recoveryStrategies)
        : data

      return {
        data: processedData as T,
        statistics: {
          parseTimeMs: Date.now() - startTime,
          recoveryStrategiesUsed: recoveryStrategies,
        },
      }
    } catch (error) {
      throw new Error(
        `无法解析文本：${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * 预处理文本：提取 JSON 内容，修复常见错误
   */
  private preprocessText(text: string): string {
    let processed = text

    // 移除 Markdown 代码块
    const markdownFencePattern = this.patterns.markdownFence
    if (markdownFencePattern) {
      const markdownMatch = markdownFencePattern.exec(processed)
      if (markdownMatch?.[1]) {
        processed = markdownMatch[1]
      }
    }

    // 提取 JSON 内容
    processed = this.extractJsonContent(processed)

    // 修复常见错误
    processed = this.fixCommonErrors(processed)

    return processed
  }

  /**
   * 提取 JSON 内容
   */
  private extractJsonContent(text: string): string {
    // 首先尝试括号匹配（最可靠）
    const bracketMatched = this.extractByBracketMatching(text)
    if (bracketMatched) {
      return bracketMatched
    }

    // 尝试正则提取对象
    const objectPattern = this.patterns.object
    if (objectPattern) {
      const objectMatch = objectPattern.exec(text)
      if (objectMatch) {
        return objectMatch[0]
      }
    }

    // 尝试正则提取数组
    const arrayPattern = this.patterns.array
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
  private extractByBracketMatching(text: string): string | null {
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
  private fixCommonErrors(text: string): string {
    let fixed = text

    // 检查是否为 YAML 格式，如果是则跳过某些修复
    const isYaml = this.isYamlFormat(text)

    if (!isYaml) {
      // 修复无引号的键
      if (this.config.enableUnquotedKeys) {
        const unquotedKeyPattern = this.patterns.unquotedKey
        if (unquotedKeyPattern) {
          fixed = fixed.replace(unquotedKeyPattern, '$1"$2"$3')
        }
      }

      // 修复单引号为双引号
      fixed = fixed.replace(/'/g, '"')
    }

    // 移除尾随逗号
    if (this.config.enableTrailingCommas) {
      const trailingCommaPattern = this.patterns.trailingComma
      if (trailingCommaPattern) {
        fixed = fixed.replace(trailingCommaPattern, '$1')
      }
    }

    return fixed
  }

  /**
   * 从错误中恢复：尝试多种策略解析
   */
  private recoverFromError(
    text: string,
    recoveryStrategies: string[],
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
      const fixed = this.fixUnescapedQuotesInStrings(text)
      const result = JSON.parse(fixed)
      recoveryStrategies.push(RecoveryStrategy.UnescapedQuotesFix)
      return result
    } catch {
      // 继续
    }

    // 策略 3: 手动修复后解析
    try {
      const fixed = this.manualFix(text)
      const result = JSON.parse(fixed)
      recoveryStrategies.push(RecoveryStrategy.ManualFix)
      return result
    } catch {
      // 继续
    }

    // 策略 4: 正则提取后解析
    try {
      const extracted = this.extractJsonContent(text)
      if (extracted !== text) {
        const result = JSON.parse(extracted)
        recoveryStrategies.push(RecoveryStrategy.RegexExtract)
        return result
      }
    } catch {
      // 继续
    }

    // 策略 5: YAML 解析
    if (this.config.enableYamlParsing && this.isYamlFormat(text)) {
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
      const result = this.partialParse(text)
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
  private manualFix(text: string): string {
    let fixed = text

    // 修复无引号的键
    const unquotedKeyPattern = this.patterns.unquotedKey
    if (unquotedKeyPattern) {
      fixed = fixed.replace(unquotedKeyPattern, '$1"$2"$3')
    }

    // 移除尾随逗号
    const trailingCommaPattern = this.patterns.trailingComma
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
  private fixUnescapedQuotesInStrings(text: string): string {
    let result = ''
    let inString = false
    let stringStartPos = -1
    let escapeNext = false
    let colonFound = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const prevChar = i > 0 ? text[i - 1] : ''

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
          stringStartPos = i
          colonFound = false
          result += char
        } else {
          // 可能是字符串结束
          // 检查后面的字符判断是否真的结束
          const nextNonSpace = this.findNextNonSpace(text, i + 1)

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
  private findNextNonSpace(text: string, startPos: number): string | null {
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
  private partialParse(text: string): unknown {
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

  /**
   * 检测文本是否为 YAML 格式
   */
  private isYamlFormat(text: string): boolean {
    const trimmed = text.trim()

    if (trimmed.length < 3) return false

    // 如果以 JSON 特征开头，则不是 YAML
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return false
    }

    // 检查 YAML 特征
    const yamlStructurePattern = this.patterns.yamlStructure
    const yamlListPattern = this.patterns.yamlList
    const yamlMultilinePattern = this.patterns.yamlMultiline

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
  private tryParseYaml(text: string): unknown | null {
    if (!this.isYamlFormat(text)) {
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
  private processYamlInValue(
    value: unknown,
    recoveryStrategies: string[],
  ): unknown {
    if (typeof value === 'string') {
      const yamlValue = this.tryParseYaml(value)
      if (yamlValue !== null) {
        if (!recoveryStrategies.includes(RecoveryStrategy.YamlParsing)) {
          recoveryStrategies.push(RecoveryStrategy.YamlParsing)
        }
        return yamlValue
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.processYamlInValue(item, recoveryStrategies))
    }

    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.processYamlInValue(val, recoveryStrategies)
      }
      return result
    }

    return value
  }
}

/**
 * 便捷函数：解析 JSON
 */
export function parse<T = unknown>(
  text: string,
  config?: ParserConfig,
): ParseResult<T> {
  const parser = new JsonHarmonyParser(config)
  return parser.parse<T>(text)
}
