import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WorkflowGraphAst } from '@sker/workflow';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Observable } from 'rxjs';
/**
 * 工作流图浏览器端执行器
 */
@Injectable()
export class WorkflowGraphBrowserVisitor {
  @Handler(WorkflowGraphAst)
  handler(ast: WorkflowGraphAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}