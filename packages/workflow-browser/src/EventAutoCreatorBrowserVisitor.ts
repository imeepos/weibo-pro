import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { EventAutoCreatorAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'
import { Observable } from 'rxjs'

/**
 * 事件自动创建器浏览器端执行器
 */
@Injectable()
export class EventAutoCreatorBrowserVisitor {
  @Handler(EventAutoCreatorAst)
  handler(ast: EventAutoCreatorAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}