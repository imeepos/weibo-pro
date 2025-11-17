import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxFriendshipsAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 关注列表浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFriendshipsBrowserVisitor {
  @Handler(WeiboAjaxFriendshipsAst)
  async handler(ast: WeiboAjaxFriendshipsAst, ctx: any): Promise<WeiboAjaxFriendshipsAst> {
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
      console.error(`[WeiboAjaxFriendshipsBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}