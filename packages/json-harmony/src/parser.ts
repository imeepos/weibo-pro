import type { ParseResult, ParserConfig } from './types'
import { RecoveryStrategy } from './types'
import { initPatterns } from './patterns'
import type { JsonPatterns } from './patterns'
import { preprocessText } from './preprocess'
import { recoverFromError } from './recovery'
import { processYamlInValue } from './yaml'

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
  private readonly patterns: JsonPatterns

  constructor(config?: ParserConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.patterns = initPatterns()
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
        ? processYamlInValue(data, recoveryStrategies, this.patterns)
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
    const cleanedText = preprocessText(text, this.patterns, this.config)

    // 尝试恢复策略
    try {
      const data = recoverFromError(
        cleanedText,
        recoveryStrategies,
        this.patterns,
        this.config,
      )
      const processedData = this.config.enableYamlParsing
        ? processYamlInValue(data, recoveryStrategies, this.patterns)
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
