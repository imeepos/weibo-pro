import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { CodeExecutorAst } from '@sker/workflow-ast';
import { root } from '@sker/core';

/**
 * 代码执行器浏览器端执行器
 */
@Injectable()
export class CodeExecutorBrowserVisitor {
  @Handler(CodeExecutorAst)
  async handler(ast: CodeExecutorAst, ctx: any): Promise<CodeExecutorAst> {
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
      console.error(`[CodeExecutorBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}