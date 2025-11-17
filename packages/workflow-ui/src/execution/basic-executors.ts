import { Ast } from '@sker/workflow'
import { BaseGenericExecutor } from './generic-executor'

/**
 * 代码执行器
 */
export class CodeExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '代码执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'CodeExecutorAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'executeCode'
  }
}

/**
 * 表单测试执行器
 */
export class TestFormExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '表单测试执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'TestFormAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'testForm'
  }
}

/**
 * 工作流容器执行器
 */
export class WorkflowGraphExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '工作流容器执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WorkflowGraphAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'executeWorkflow'
  }
}

/**
 * 数组迭代器执行器
 */
export class ArrayIteratorExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '数组迭代器执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'ArrayIteratorAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'iterateArray'
  }
}