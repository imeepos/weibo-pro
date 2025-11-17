import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 微博关键词搜索浏览器端执行器
 *
 * 存在即合理：
 * - 浏览器端无法直接进行微博搜索，必须通过后端API执行
 * - 负责调用后端通用执行接口，传递搜索参数
 * - 保持与后端执行器相同的接口和行为
 *
 * 优雅设计：
 * - 统一使用 executeSingleNode API，简化调用逻辑
 * - 自动处理错误状态和结果传递
 * - 与后端 WeiboKeywordSearchAstVisitor 职责互补
 */
@Injectable()
export class WeiboKeywordSearchBrowserVisitor {
  @Handler(WeiboKeywordSearchAst)
  async handler(ast: WeiboKeywordSearchAst, ctx: any): Promise<WeiboKeywordSearchAst> {
    try {
      // 获取WorkflowController
      const controller = root.get<any>('WorkflowController');
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      // 调用后端通用执行接口
      const result = await controller.executeSingleNode(ast);

      return result;
    } catch (error) {
      // 设置错误状态
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[WeiboKeywordSearchBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}