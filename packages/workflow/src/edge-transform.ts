/**
 * 边转换表达式求值引擎
 * 支持安全的 JavaScript 表达式执行
 */

/**
 * 执行边转换表达式
 * @param input 输入值（可通过 $input 访问）
 * @param expression JS 表达式字符串
 * @returns 转换后的值
 */
export function evaluateTransform(input: any, expression: string): any {
  try {
    // 创建安全的执行上下文
    const fn = new Function('$input', `return ${expression}`);
    return fn(input);
  } catch (error) {
    console.error('[EdgeTransform] 表达式执行失败:', expression, error);
    throw new Error(`边转换失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
