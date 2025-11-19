import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesRepostTimelineAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Observable } from 'rxjs'

/**
 * 微博转发浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesRepostTimelineBrowserVisitor {
  @Handler(WeiboAjaxStatusesRepostTimelineAst)
  handler(ast: WeiboAjaxStatusesRepostTimelineAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}