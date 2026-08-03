/**
 * 解析器使用的正则表达式模式集合
 */
export interface JsonPatterns {
  /** Markdown 代码块 */
  markdownFence: RegExp
  /** JSON 对象（简化的贪婪匹配） */
  object: RegExp
  /** JSON 数组（简化的贪婪匹配） */
  array: RegExp
  /** 无引号的键：只匹配在 { 或 , 后面的无引号键（避免匹配字符串值内的 word: 模式） */
  unquotedKey: RegExp
  /** 尾随逗号 */
  trailingComma: RegExp
  /** YAML 键值对结构 */
  yamlStructure: RegExp
  /** YAML 列表 */
  yamlList: RegExp
  /** YAML 多行字符串 */
  yamlMultiline: RegExp
}

/**
 * 初始化正则表达式模式
 */
export function initPatterns(): JsonPatterns {
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
    yamlStructure: /^[\s]*[\w\-.]+:\s*.*$/m,
    // YAML 列表
    yamlList: /^[\s]*-\s+/m,
    // YAML 多行字符串
    yamlMultiline: /[|>][\s]*\n/,
  }
}
