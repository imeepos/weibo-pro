/**
 * 解析统计信息
 */
export interface ParseStatistics {
  /** 解析耗时（毫秒） */
  parseTimeMs: number
  /** 使用的恢复策略 */
  recoveryStrategiesUsed: string[]
}

/**
 * 解析结果
 */
export interface ParseResult<T = unknown> {
  /** 解析后的数据 */
  data: T
  /** 统计信息 */
  statistics: ParseStatistics
}

/**
 * 解析器配置
 */
export interface ParserConfig {
  /** 最大文本长度（字节） */
  maxTextLength?: number
  /** 是否启用无引号键修复 */
  enableUnquotedKeys?: boolean
  /** 是否启用尾随逗号修复 */
  enableTrailingCommas?: boolean
  /** 是否启用 YAML 自动解析 */
  enableYamlParsing?: boolean
  /** 解析超时时间（毫秒） */
  timeoutMs?: number
}

/**
 * 错误恢复策略枚举
 */
export enum RecoveryStrategy {
  /** 标准 JSON 解析 */
  StandardJson = 'StandardJson',
  /** 手动修复 */
  ManualFix = 'ManualFix',
  /** 正则提取 */
  RegexExtract = 'RegexExtract',
  /** 部分解析 */
  PartialParse = 'PartialParse',
  /** YAML 解析 */
  YamlParsing = 'YamlParsing',
  /** 括号匹配提取 */
  BracketMatching = 'BracketMatching',
  /** 保留为字符串 */
  PreserveAsString = 'PreserveAsString',
}
