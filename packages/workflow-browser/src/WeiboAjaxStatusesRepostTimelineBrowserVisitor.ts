import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxStatusesRepostTimelineAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';

/**
 * 微博转发浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesRepostTimelineBrowserVisitor {
  @Handler(WeiboAjaxStatusesRepostTimelineAst)
  async handler(ast: WeiboAjaxStatusesRepostTimelineAst, ctx: any): Promise<WeiboAjaxStatusesRepostTimelineAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as WeiboAjaxStatusesRepostTimelineAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WeiboAjaxStatusesRepostTimelineBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}