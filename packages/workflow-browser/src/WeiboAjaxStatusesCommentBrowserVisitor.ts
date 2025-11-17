import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxStatusesCommentAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 微博评论浏览器端执行器
 *
 * 存在即合理：
 * - 浏览器端无法直接获取微博评论，必须通过后端API执行
 * - 负责调用后端通用执行接口，传递评论获取参数
 */
@Injectable()
export class WeiboAjaxStatusesCommentBrowserVisitor {
  @Handler(WeiboAjaxStatusesCommentAst)
  async handler(ast: WeiboAjaxStatusesCommentAst, ctx: any): Promise<WeiboAjaxStatusesCommentAst> {
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
      console.error(`[WeiboAjaxStatusesCommentBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}