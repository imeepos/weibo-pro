import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxFriendshipsAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'

/**
 * 关注列表浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFriendshipsBrowserVisitor {
  @Handler(WeiboAjaxFriendshipsAst)
  async handler(ast: WeiboAjaxFriendshipsAst, ctx: any): Promise<WeiboAjaxFriendshipsAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({ node: ast, context: ctx });
      return result as WeiboAjaxFriendshipsAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WeiboAjaxFriendshipsBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}