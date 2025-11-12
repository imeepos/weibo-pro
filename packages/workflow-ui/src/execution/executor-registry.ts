import { root, Type } from '@sker/core'
import { Ast, Handler } from '@sker/workflow'
import { FrontendExecutor, FrontendExecutorContext, frontendExecutorRegistry } from './frontend-executor'

/**
 * 基于@Handler装饰器的前端执行器适配器
 */
class HandlerBasedExecutor implements FrontendExecutor {
  private handlerClass: Type<any>
  private astClass: Type<any>

  constructor(handlerClass: Type<any>, astClass: Type<any>) {
    this.handlerClass = handlerClass
    this.astClass = astClass
  }

  async execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const { onStateChange, onProgress } = context

    try {
      onStateChange?.('running')
      onProgress?.(0, '开始执行')

      // 获取Handler实例
      const handler = root.get(this.handlerClass)
      if (!handler) {
        throw new Error(`Handler ${this.handlerClass.name} 未找到`)
      }

      onProgress?.(30, '调用Handler')

      // 调用Handler方法
      let result: Ast
      if (typeof handler.visit === 'function') {
        // 类级别的visit方法
        result = await handler.visit(ast, context)
      } else {
        // 方法级别的handler
        const handlerMethod = Object.getOwnPropertyNames(handler).find(
          prop => prop === 'handler' || prop.startsWith('handle')
        )
        if (handlerMethod && typeof handler[handlerMethod] === 'function') {
          result = await handler[handlerMethod](ast, context)
        } else {
          throw new Error(`Handler ${this.handlerClass.name} 没有找到可执行的方法`)
        }
      }

      onProgress?.(100, '执行完成')
      onStateChange?.('success')

      return result
    } catch (error) {
      onStateChange?.('fail', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  canExecute(ast: Ast): boolean {
    return ast instanceof this.astClass
  }

  getName(): string {
    return `${this.astClass.name} 执行器`
  }
}

/**
 * 执行器查找器
 */
export class ExecutorFinder {
  /**
   * 初始化执行器注册表
   */
  static initialize(): void {
    // 获取所有已注册的Handler
    const handlers = root.get<any[]>('HANDLER', [])
    const handlerMethods = root.get<any[]>('HANDLER_METHOD', [])

    // 注册类级别的Handler
    for (const handler of handlers) {
      const executor = new HandlerBasedExecutor(handler.target, handler.ast)
      frontendExecutorRegistry.register(executor)
      console.log(`[ExecutorRegistry] 注册类级别执行器: ${handler.target.name} -> ${handler.ast.name}`)
    }

    // 注册方法级别的Handler
    for (const handlerMethod of handlerMethods) {
      const executor = new HandlerBasedExecutor(handlerMethod.target, handlerMethod.ast)
      frontendExecutorRegistry.register(executor)
      console.log(`[ExecutorRegistry] 注册方法级别执行器: ${handlerMethod.target.name}.${String(handlerMethod.property)} -> ${handlerMethod.ast.name}`)
    }

    console.log(`[ExecutorRegistry] 执行器初始化完成，共注册 ${handlers.length + handlerMethods.length} 个执行器`)
  }

  /**
   * 根据AST节点查找执行器
   */
  static findExecutor(ast: Ast): FrontendExecutor | null {
    return frontendExecutorRegistry.findExecutor(ast)
  }

  /**
   * 执行AST节点
   */
  static async executeAst(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const executor = this.findExecutor(ast)
    if (!executor) {
      throw new Error(`找不到适合 ${ast.constructor.name} 的执行器`)
    }

    console.log(`[ExecutorFinder] 使用执行器: ${executor.getName()}`)
    return await executor.execute(ast, context)
  }
}

/**
 * 执行器管理器 - 提供简化的执行接口
 */
export class ExecutorManager {
  /**
   * 执行单个节点
   */
  static async executeNode(
    ast: Ast,
    options: {
      onStateChange?: (state: 'pending' | 'running' | 'success' | 'fail', error?: Error) => void
      onProgress?: (progress: number, message?: string) => void
      onResult?: (result: any) => void
    } = {}
  ): Promise<Ast> {
    const context: FrontendExecutorContext = {
      onStateChange: options.onStateChange,
      onProgress: options.onProgress,
      onResult: options.onResult
    }

    return await ExecutorFinder.executeAst(ast, context)
  }

  /**
   * 批量执行节点
   */
  static async executeNodes(
    asts: Ast[],
    options: {
      onNodeStateChange?: (nodeId: string, state: 'pending' | 'running' | 'success' | 'fail', error?: Error) => void
      onNodeProgress?: (nodeId: string, progress: number, message?: string) => void
      onNodeResult?: (nodeId: string, result: any) => void
    } = {}
  ): Promise<Ast[]> {
    const results: Ast[] = []

    for (const ast of asts) {
      const context: FrontendExecutorContext = {
        onStateChange: (state, error) => {
          options.onNodeStateChange?.(ast.id || 'unknown', state, error)
        },
        onProgress: (progress, message) => {
          options.onNodeProgress?.(ast.id || 'unknown', progress, message)
        },
        onResult: (result) => {
          options.onNodeResult?.(ast.id || 'unknown', result)
        }
      }

      const result = await ExecutorFinder.executeAst(ast, context)
      results.push(result)
    }

    return results
  }
}