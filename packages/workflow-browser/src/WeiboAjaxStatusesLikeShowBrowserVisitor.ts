import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxStatusesLikeShowAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 微博点赞浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesLikeShowBrowserVisitor {
  @Handler(WeiboAjaxStatusesLikeShowAst)
  async handler(ast: WeiboAjaxStatusesLikeShowAst, ctx: any): Promise<WeiboAjaxStatusesLikeShowAst> {
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
      console.error(`[WeiboAjaxStatusesLikeShowBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}