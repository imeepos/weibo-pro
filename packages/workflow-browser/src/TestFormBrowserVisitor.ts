import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { TestFormAst } from '@sker/workflow-ast';
import { root } from '@sker/core';
import { WorkflowController } from '@sker/sdk'

/**
 * 表单测试浏览器端执行器
 */
@Injectable()
export class TestFormBrowserVisitor {
  @Handler(TestFormAst)
  async handler(ast: TestFormAst, ctx: any): Promise<TestFormAst> {
    try {
      const controller = root.get(WorkflowController);
      if (!controller) {
        throw new Error('WorkflowController 未找到');
      }

      const result = await controller.executeSingleNode({node: ast, context: ctx});
      return result as TestFormAst;
    } catch (error) {
      ast.state = 'fail';
      ast.setError(error, process.env.NODE_ENV === 'development');
      console.error(`[TestFormBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}