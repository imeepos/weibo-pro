import { root } from '@sker/core'
import { Ast } from '@sker/workflow'
import { FrontendExecutor, FrontendExecutorContext } from './frontend-executor'

/**
 * 通用执行器基类
 * 通过调用后端通用执行接口实现节点执行
 */
export abstract class BaseGenericExecutor implements FrontendExecutor {
  protected abstract getExecutorName(): string

  async execute(ast: Ast, context: FrontendExecutorContext): Promise<Ast> {
    const { onStateChange, onProgress } = context

    try {
      onStateChange?.('running')
      onProgress?.(0, '开始执行')

      // 获取WorkflowController
      const controller = this.getWorkflowController()
      if (!controller) {
        throw new Error('WorkflowController 未找到')
      }

      onProgress?.(30, '准备执行参数')

      // 调用后端执行接口
      const result = await this.callBackendApi(controller, ast, context)

      onProgress?.(100, '执行完成')
      onStateChange?.('success')

      return result
    } catch (error) {
      onStateChange?.('fail', error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  canExecute(ast: Ast): boolean {
    return this.supportsAst(ast)
  }

  getName(): string {
    return this.getExecutorName()
  }

  /**
   * 检查是否支持该AST节点
   */
  protected abstract supportsAst(ast: Ast): boolean

  /**
   * 获取WorkflowController
   */
  protected getWorkflowController(): any {
    return root.get<any>('WorkflowController')
  }

  /**
   * 调用后端API
   */
  protected async callBackendApi(
    controller: any,
    ast: Ast,
    context: FrontendExecutorContext
  ): Promise<Ast> {
    const { onProgress } = context

    // 优先尝试executeNode方法
    if (typeof controller.executeNode === 'function') {
      onProgress?.(50, '调用通用执行接口')
      return await controller.executeNode(ast)
    }

    // 根据节点类型调用特定方法
    const methodName = this.getSpecificMethodName(ast)
    if (methodName && typeof controller[methodName] === 'function') {
      onProgress?.(50, `调用 ${methodName} 接口`)
      return await controller[methodName](this.prepareApiParams(ast))
    }

    throw new Error(`找不到适合 ${ast.constructor.name} 的执行方法`)
  }

  /**
   * 获取特定方法名
   */
  protected getSpecificMethodName(ast: Ast): string | null {
    const astName = ast.constructor.name

    // 根据AST类名映射到对应的API方法
    const methodMap: Record<string, string> = {
      'WeiboKeywordSearchAst': 'searchWeibo',
      'WeiboAjaxStatusesShowAst': 'crawlPost',
      'PostNLPAnalyzerAst': 'triggerNlp',
      // 添加更多映射...
    }

    return methodMap[astName] || null
  }

  /**
   * 准备API参数
   */
  protected prepareApiParams(ast: Ast): Record<string, any> {
    // 将AST属性转换为API参数
    const params: Record<string, any> = {}

    // 遍历AST的所有可枚举属性
    for (const key in ast) {
      if (ast.hasOwnProperty(key) && key !== 'state' && key !== 'error') {
        const value = (ast as any)[key]
        if (value !== undefined && value !== null) {
          params[key] = value
        }
      }
    }

    return params
  }
}

/**
 * 默认通用执行器
 * 支持所有AST节点，通过通用接口执行
 */
export class DefaultGenericExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '通用执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    // 默认执行器支持所有AST节点
    return true
  }
}

/**
 * 微博相关执行器基类
 */
export abstract class WeiboBaseExecutor extends BaseGenericExecutor {
  protected supportsAst(ast: Ast): boolean {
    const astName = ast.constructor.name
    return astName.includes('Weibo')
  }

  protected getExecutorName(): string {
    return '微博执行器'
  }
}

/**
 * 微博搜索执行器
 */
export class WeiboSearchExecutor extends WeiboBaseExecutor {
  protected getExecutorName(): string {
    return '微博搜索执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboKeywordSearchAst'
  }
}

/**
 * 微博帖子详情执行器
 */
export class WeiboPostExecutor extends WeiboBaseExecutor {
  protected getExecutorName(): string {
    return '微博帖子执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'WeiboAjaxStatusesShowAst'
  }
}

/**
 * NLP分析执行器
 */
export class NLPAnalysisExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return 'NLP分析执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'PostNLPAnalyzerAst'
  }
}