import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { BatchPushToMQAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'

/**
 * 批量推送到 MQ 浏览器端执行器
 */
@Injectable()
export class BatchPushToMQBrowserVisitor {
  @Handler(BatchPushToMQAst)
  async handler(ast: BatchPushToMQAst, ctx: any): Promise<BatchPushToMQAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as BatchPushToMQAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[BatchPushToMQBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}