import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxProfileInfoAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';

/**
 * 用户信息浏览器端执行器
 */
@Injectable()
export class WeiboAjaxProfileInfoBrowserVisitor {
  @Handler(WeiboAjaxProfileInfoAst)
  async handler(ast: WeiboAjaxProfileInfoAst, ctx: any): Promise<WeiboAjaxProfileInfoAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as WeiboAjaxProfileInfoAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WeiboAjaxProfileInfoBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}