import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { PostNLPAnalyzerAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 帖子 NLP 分析器浏览器端执行器
 */
@Injectable()
export class PostNLPAnalyzerBrowserVisitor {
  @Handler(PostNLPAnalyzerAst)
  async handler(ast: PostNLPAnalyzerAst, ctx: any): Promise<PostNLPAnalyzerAst> {
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
      console.error(`[PostNLPAnalyzerBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}