import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxFeedHotTimelineAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 热门微博浏览器端执行器
 */
@Injectable()
export class WeiboAjaxFeedHotTimelineBrowserVisitor {
  @Handler(WeiboAjaxFeedHotTimelineAst)
  async handler(ast: WeiboAjaxFeedHotTimelineAst, ctx: any): Promise<WeiboAjaxFeedHotTimelineAst> {
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
      console.error(`[WeiboAjaxFeedHotTimelineBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}