import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Observable } from 'rxjs'

/**
 * 个人博文浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesMymblogBrowserVisitor {
  @Handler(WeiboAjaxStatusesMymblogAst)
  handler(ast: WeiboAjaxStatusesMymblogAst, ctx: any): Observable<INode> {
     const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}