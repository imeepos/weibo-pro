import { root, Type } from '@sker/core'
import { Ast, Visitor } from '@sker/workflow'
import { Handler } from '@sker/workflow'

/**
 * 前端执行器上下文
 */
export interface FrontendExecutorContext {
  /** 执行参数 */
  params?: Record<string, any>
  /** 执行状态回调 */
  onStateChange?: (state: 'pending' | 'running' | 'success' | 'fail', error?: Error) => void
  /** 进度回调 */
  onProgress?: (progress: number, message?: string) => void
  /** 结果回调 */
  onResult?: (result: any) => void
}

/**
 * 前端执行器接口
 */
export interface FrontendExecutor {
  /**
   * 执行AST节点
   */
  execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast>

  /**
   * 检查是否支持该AST节点
   */
  canExecute(ast: Ast): boolean

  /**
   * 获取执行器名称
   */
  getName(): string
}

/**
 * 通用前端执行器 - 调用后端通用执行接口
 */
export class GenericFrontendExecutor implements FrontendExecutor {
  private name: string

  constructor(name: string) {
    this.name = name
  }

  async execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const { onStateChange, onProgress } = context

    try {
      onStateChange?.('running')
      onProgress?.(0, '开始执行')

      // 调用后端通用执行接口
      const controller = root.get<any>('WorkflowController')
      if (!controller || !controller.executeNode) {
        throw new Error('WorkflowController 未找到或缺少 executeNode 方法')
      }

      onProgress?.(50, '调用后端接口')

      // 执行节点
      const result = await controller.executeNode(ast)

      onProgress?.(100, '执行完成')
      onStateChange?.('success')

      return result
    } catch (error) {
      onStateChange?.('fail', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  canExecute(ast: Ast): boolean {
    // 通用执行器支持所有AST节点
    return true
  }

  getName(): string {
    return this.name
  }
}

/**
 * 前端执行器注册表
 */
export class FrontendExecutorRegistry {
  private executors: FrontendExecutor[] = []

  /**
   * 注册前端执行器
   */
  register(executor: FrontendExecutor): void {
    this.executors.push(executor)
  }

  /**
   * 根据AST节点查找合适的执行器
   */
  findExecutor(ast: Ast): FrontendExecutor | null {
    // 优先查找特定执行器
    for (const executor of this.executors) {
      if (executor.canExecute(ast)) {
        return executor
      }
    }

    // 如果没有找到特定执行器，返回通用执行器
    return new GenericFrontendExecutor('通用执行器')
  }

  /**
   * 获取所有已注册的执行器
   */
  getExecutors(): FrontendExecutor[] {
    return [...this.executors]
  }
}

// 全局前端执行器注册表实例
export const frontendExecutorRegistry = new FrontendExecutorRegistry()

/**
 * 前端执行器装饰器
 * 复用现有的@Handler装饰器，但标记为前端执行器
 */
export function FrontendHandler(ast: Type<any>): any {
  return Handler(ast)
}