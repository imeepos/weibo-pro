import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboAjaxProfileInfoAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 用户信息浏览器端执行器
 */
@Injectable()
export class WeiboAjaxProfileInfoBrowserVisitor {
  @Handler(WeiboAjaxProfileInfoAst)
  async handler(ast: WeiboAjaxProfileInfoAst, ctx: any): Promise<WeiboAjaxProfileInfoAst> {
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
      console.error(`[WeiboAjaxProfileInfoBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}