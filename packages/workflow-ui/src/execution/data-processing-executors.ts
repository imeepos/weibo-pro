import { Ast } from '@sker/workflow'
import { BaseGenericExecutor } from './generic-executor'

/**
 * 帖子上下文收集执行器
 */
export class PostContextCollectorExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '帖子上下文收集执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'PostContextCollectorAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'collectPostContext'
  }
}

/**
 * NLP分析执行器
 */
export class PostNLPAnalyzerExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return 'NLP分析执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'PostNLPAnalyzerAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'triggerNlp'
  }
}

/**
 * 事件自动创建执行器
 */
export class EventAutoCreatorExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '事件自动创建执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'EventAutoCreatorAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'createEvent'
  }
}

/**
 * 批量推送MQ执行器
 */
export class BatchPushToMQExecutor extends BaseGenericExecutor {
  protected getExecutorName(): string {
    return '批量推送MQ执行器'
  }

  protected supportsAst(ast: Ast): boolean {
    return ast.constructor.name === 'BatchPushToMQAst'
  }

  protected getSpecificMethodName(ast: Ast): string | null {
    return 'batchPushToMQ'
  }
}