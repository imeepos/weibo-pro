import { Injectable } from '@sker/core';
import { Handler } from '@sker/workflow';
import { ArrayIteratorAst } from '@sker/workflow';
import { root } from '@sker/core';

/**
 * 数组迭代器浏览器端执行器
 */
@Injectable()
export class ArrayIteratorBrowserVisitor {
  @Handler(ArrayIteratorAst)
  async handler(ast: ArrayIteratorAst, ctx: any): Promise<ArrayIteratorAst> {
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
      console.error(`[ArrayIteratorBrowserVisitor] 执行失败:`, error);
      return ast;
    }
  }
}