/**
 * AbortSignal 辅助工具
 *
 * 优雅设计：
 * - 统一的取消检查逻辑
 * - 清晰的错误信息
 * - 减少代码重复
 */

/**
 * 检查 AbortSignal 是否已触发
 *
 * @param ctx 工作流上下文（包含 abortSignal）
 * @param ast 节点实例
 * @returns 如果已取消返回 true，否则返回 false
 */
export function checkAbortSignal(ctx: any, ast: any): boolean {
  if (ctx.abortSignal?.aborted) {
    ast.state = 'fail';
    ast.setError(new Error('工作流已取消'));
    return true;
  }
  return false;
}

/**
 * 在异步操作前检查取消信号
 * 如果已取消，抛出错误
 *
 * @param ctx 工作流上下文
 * @throws Error 如果工作流已取消
 */
export function throwIfAborted(ctx: any): void {
  if (ctx.abortSignal?.aborted) {
    throw new Error('工作流已取消');
  }
}
