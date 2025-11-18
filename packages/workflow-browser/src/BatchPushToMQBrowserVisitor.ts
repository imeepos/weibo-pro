import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { BatchPushToMQAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'
import { Observable } from 'rxjs'

/**
 * 批量推送到 MQ 浏览器端执行器
 */
@Injectable()
export class BatchPushToMQBrowserVisitor {
  @Handler(BatchPushToMQAst)
  handler(ast: BatchPushToMQAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}