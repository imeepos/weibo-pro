import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';
import { root } from '@sker/core';

/**
 * 工作流图浏览器端执行器
 */
@Injectable()
export class WorkflowGraphBrowserVisitor {
  @Handler(WorkflowGraphAst)
  async handler(ast: WorkflowGraphAst, ctx: any): Promise<WorkflowGraphAst> {
    try {
      const controller = root.get<any>('WorkflowController');
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode(ast);
      return result;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WorkflowGraphBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}