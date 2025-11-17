import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 帖子上下文收集器浏览器端执行器
 */
@Injectable()
export class PostContextCollectorBrowserVisitor {
  @Handler(PostContextCollectorAst)
  async handler(ast: PostContextCollectorAst, ctx: any): Promise<PostContextCollectorAst> {
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
      console.error(`[PostContextCollectorBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}