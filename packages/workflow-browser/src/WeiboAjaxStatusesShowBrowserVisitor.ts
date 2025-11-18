import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboAjaxStatusesShowAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Observable } from 'rxjs'

/**
 * 微博帖子详情浏览器端执行器
 *
 * 存在即合理：
 * - 浏览器端无法直接获取微博帖子详情，必须通过后端API执行
 * - 负责调用后端通用执行接口，传递帖子ID参数
 * - 保持与后端执行器相同的接口和行为
 */
@Injectable()
export class WeiboAjaxStatusesShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesShowAst)
   handler(ast: WeiboAjaxStatusesShowAst, ctx: any): Observable<INode> {
     const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}