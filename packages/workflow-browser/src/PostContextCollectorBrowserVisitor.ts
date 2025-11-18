import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PostContextCollectorAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'

/**
 * 帖子上下文收集器浏览器端执行器
 */
@Injectable()
export class PostContextCollectorBrowserVisitor {
  @Handler(PostContextCollectorAst)
  async handler(ast: PostContextCollectorAst, ctx: any): Promise<PostContextCollectorAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as PostContextCollectorAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[PostContextCollectorBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}