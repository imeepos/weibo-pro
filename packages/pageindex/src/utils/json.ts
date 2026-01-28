/**
 * JSON处理工具函数
 *
 * 提供从AI响应中提取和解析JSON的功能
 */

/**
 * 从AI响应中提取JSON
 *
 * 处理以下情况:
 * - ```json 代码块包裹
 * - 普通代码块包裹
 * - Python None 转换为 JavaScript null
 * - 多余空白清理
 * - 尾随逗号处理
 *
 * @param content - 包含JSON的文本内容
 * @returns 解析后的JavaScript对象
 * @throws 如果JSON解析失败,抛出错误
 *
 * @example
 * ```ts
 * const json = extractJson('```json\n{"key": "value"}\n```');
 * // returns: { key: 'value' }
 * ```
 */
export function extractJson(content: string): unknown {
  let jsonContent = content;

  // 移除```json包裹
  const jsonMatch = jsonContent.match(/```json\n?([\s\S]+?)\n?```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonContent = jsonMatch[1];
  }

  // 移除普通代码块包裹
  const codeMatch = jsonContent.match(/```\n?([\s\S]+?)\n?```/);
  if (codeMatch && codeMatch[1]) {
    jsonContent = codeMatch[1];
  }

  // 替换None为null(处理Python语法)
  jsonContent = jsonContent.replace(/None/gi, 'null');

  // 清理空白
  jsonContent = jsonContent.replace(/\s+/g, ' ').trim();

  // 尝试解析
  try {
    return JSON.parse(jsonContent);
  } catch {
    // 处理尾随逗号
    jsonContent = jsonContent.replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(jsonContent);
    } catch {
      throw new Error(`Failed to parse JSON: ${jsonContent}`);
    }
  }
}

/**
 * 从```json代码块中提取内容
 *
 * 提取markdown代码块中的JSON字符串,不移除代码块标记
 *
 * @param response - 包含```json代码块的响应文本
 * @returns 代码块中的JSON字符串
 *
 * @example
 * ```ts
 * const content = getJsonContent('Text before\n```json\n{"key": "value"}\n```\nText after');
 * // returns: '{"key": "value"}'
 * ```
 */
export function getJsonContent(response: string): string {
  // 尝试匹配```json代码块
  const jsonMatch = response.match(/```json\n?([\s\S]+?)\n?```/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1].trim();
  }

  // 尝试匹配普通代码块
  const codeMatch = response.match(/```\n?([\s\S]+?)\n?```/);
  if (codeMatch?.[1]) {
    return codeMatch[1].trim();
  }

  // 如果没有代码块,返回原文本
  return response.trim();
}
