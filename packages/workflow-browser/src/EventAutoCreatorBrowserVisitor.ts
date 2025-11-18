import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { EventAutoCreatorAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'

/**
 * 事件自动创建器浏览器端执行器
 */
@Injectable()
export class EventAutoCreatorBrowserVisitor {
  @Handler(EventAutoCreatorAst)
  async handler(ast: EventAutoCreatorAst, ctx: any): Promise<EventAutoCreatorAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as EventAutoCreatorAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[EventAutoCreatorBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}