import { Injectable } from '@sker/core';
import { Handler, INode } from '@sker/workflow';
import { WeiboKeywordSearchAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk';
import { Observable } from 'rxjs'

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
  handler(ast: WeiboKeywordSearchAst, ctx: any): Observable<INode> {
    const controller = root.get(WorkflowController);
    if (!controller) {
      throw new Error('WorkflowController 未找到');
    }
    return controller.execute(ast);
  }
}