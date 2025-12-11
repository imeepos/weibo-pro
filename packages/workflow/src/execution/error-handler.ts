import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, retryWhen, mergeMap, take } from 'rxjs/operators';
import { INode } from '../types';
import { WorkflowEventBus, WorkflowEventType } from './workflow-events';

/**
 * 错误处理策略
 *
 * - retry: 自动重试（适用于网络波动、临时故障）
 * - skip: 跳过失败节点，继续执行下游（适用于可选节点）
 * - fail: 标记失败但不中断工作流（默认行为）
 * - abort: 中断整个工作流（适用于关键节点）
 */
export type ErrorStrategy = 'retry' | 'skip' | 'fail' | 'abort';

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
  /** 错误处理策略 */
  strategy?: ErrorStrategy;
  /** 最大重试次数（仅对 retry 策略有效） */
  maxRetries?: number;
  /** 重试延迟（毫秒，仅对 retry 策略有效） */
  retryDelay?: number;
  /** 重试延迟增长因子（指数退避） */
  retryBackoff?: number;
}

/**
 * 默认错误处理配置
 */
export const DEFAULT_ERROR_CONFIG: Required<ErrorHandlerConfig> = {
  strategy: 'fail',
  maxRetries: 3,
  retryDelay: 1000,
  retryBackoff: 2,
};

/**
 * 节点错误处理器类型
 *
 * 将节点的 Observable 包装为具有错误处理能力的流
 */
export type NodeErrorHandler = (
  node$: Observable<INode>,
  node: INode,
  config: ErrorHandlerConfig,
  eventBus?: WorkflowEventBus
) => Observable<INode>;

/**
 * 创建默认的节点错误处理器
 *
 * 借鉴 NgRx Effects 的 defaultEffectsErrorHandler 设计
 *
 * @param node$ 节点执行流
 * @param node 节点实例
 * @param config 错误处理配置
 * @param eventBus 事件总线（用于发射错误事件）
 * @returns 包装后的节点执行流
 */
export function createDefaultErrorHandler(
  node$: Observable<INode>,
  node: INode,
  config: ErrorHandlerConfig = {},
  eventBus?: WorkflowEventBus
): Observable<INode> {
  const mergedConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
  const { strategy, maxRetries, retryDelay, retryBackoff } = mergedConfig;

  switch (strategy) {
    case 'retry':
      // 自动重试策略（指数退避）
      return node$.pipe(
        retryWhen(errors$ =>
          errors$.pipe(
            mergeMap((error, index) => {
              const attemptNumber = index + 1;

              // 超过最大重试次数
              if (attemptNumber > maxRetries) {
                eventBus?.emitNodeFail(node.id, error);
                return throwError(() => error);
              }

              // 计算退避延迟
              const delay = retryDelay * Math.pow(retryBackoff, index);

              console.warn(
                `[ErrorHandler] 节点 ${node.id} 执行失败，` +
                `${delay}ms 后进行第 ${attemptNumber}/${maxRetries} 次重试`,
                error
              );

              // 发射重试事件
              eventBus?.next({
                type: WorkflowEventType.NODE_FAIL,
                nodeId: node.id,
                workflowId: undefined,
                payload: { error, attempt: attemptNumber, maxRetries },
                timestamp: Date.now(),
              });

              return timer(delay);
            }),
            take(maxRetries)
          )
        ),
        catchError(error => {
          // 重试全部失败，返回失败节点
          const failedNode = { ...node, state: 'fail' as const, error };
          return throwError(() => failedNode);
        })
      );

    case 'skip':
      // 跳过失败节点，返回成功状态（不发射输出）
      return node$.pipe(
        catchError(error => {
          console.warn(`[ErrorHandler] 节点 ${node.id} 执行失败，已跳过`, error);
          eventBus?.emitNodeFail(node.id, error);

          // 返回跳过状态的节点（state = success 但不发射 emitting）
          const skippedNode = {
            ...node,
            state: 'success' as const,
            error,
            skipped: true,
          };
          return throwError(() => skippedNode);
        })
      );

    case 'abort':
      // 中断整个工作流
      return node$.pipe(
        catchError(error => {
          console.error(`[ErrorHandler] 关键节点 ${node.id} 失败，中断工作流`, error);
          eventBus?.emitNodeFail(node.id, error);
          eventBus?.emitWorkflowFail(undefined, error);

          const failedNode = { ...node, state: 'fail' as const, error };
          return throwError(() => failedNode);
        })
      );

    case 'fail':
    default:
      // 默认策略：标记失败但不重试
      return node$.pipe(
        catchError(error => {
          console.error(`[ErrorHandler] 节点 ${node.id} 执行失败`, error);
          eventBus?.emitNodeFail(node.id, error);

          const failedNode = { ...node, state: 'fail' as const, error };
          return throwError(() => failedNode);
        })
      );
  }
}

/**
 * 从节点元数据中提取错误处理配置
 */
export function getErrorConfigFromNode(node: INode): ErrorHandlerConfig {
  return {
    strategy: node.metadata?.class?.errorStrategy,
    maxRetries: node.metadata?.class?.maxRetries,
    retryDelay: node.metadata?.class?.retryDelay,
    retryBackoff: node.metadata?.class?.retryBackoff,
  };
}
