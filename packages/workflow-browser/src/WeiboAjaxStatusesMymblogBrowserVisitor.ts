import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxStatusesMymblogAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';

/**
 * 个人博文浏览器端执行器
 */
@Injectable()
export class WeiboAjaxStatusesMymblogBrowserVisitor {
  @Handler(WeiboAjaxStatusesMymblogAst)
  async handler(ast: WeiboAjaxStatusesMymblogAst, ctx: any): Promise<WeiboAjaxStatusesMymblogAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as WeiboAjaxStatusesMymblogAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WeiboAjaxStatusesMymblogBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}