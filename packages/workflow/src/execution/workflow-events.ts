import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Injectable } from '@sker/core';

/**
 * 工作流事件类型枚举
 */
export enum WorkflowEventType {
  /** 工作流开始执行 */
  WORKFLOW_START = 'WORKFLOW_START',
  /** 工作流执行完成 */
  WORKFLOW_COMPLETE = 'WORKFLOW_COMPLETE',
  /** 工作流执行失败 */
  WORKFLOW_FAIL = 'WORKFLOW_FAIL',

  /** 节点开始执行 */
  NODE_START = 'NODE_START',
  /** 节点发射输出 */
  NODE_EMIT = 'NODE_EMIT',
  /** 节点输出传递给下游（用于 SSE output_emit） */
  OUTPUT_EMIT = 'OUTPUT_EMIT',
  /** 节点执行成功 */
  NODE_SUCCESS = 'NODE_SUCCESS',
  /** 节点执行失败 */
  NODE_FAIL = 'NODE_FAIL',

  /** 节点参数更新（编辑时） */
  NODE_UPDATED = 'NODE_UPDATED',
  /** 节点添加 */
  NODE_ADDED = 'NODE_ADDED',
  /** 节点删除 */
  NODE_REMOVED = 'NODE_REMOVED',

  /** 边添加 */
  EDGE_ADDED = 'EDGE_ADDED',
  /** 边删除 */
  EDGE_REMOVED = 'EDGE_REMOVED',

  /** 增量执行开始 */
  INCREMENTAL_START = 'INCREMENTAL_START',
  /** 单节点隔离执行开始 */
  ISOLATED_START = 'ISOLATED_START',
}

/**
 * 节点更新事件载荷
 */
export interface NodeUpdatePayload {
  /** 更新的属性 */
  updates: Record<string, any>;
  /** 更新前的节点状态 */
  previousState: 'pending' | 'running' | 'success' | 'fail';
  /** 更新后的节点状态 */
  currentState: 'pending' | 'running' | 'success' | 'fail';
}

/**
 * 输出发射事件载荷（数据真正流向下游时触发）
 */
export interface OutputEmitPayload {
  /** 输出属性名 */
  property: string;
  /** 发射的值 */
  value: any;
}

/**
 * 工作流事件
 */
export interface WorkflowEvent<T = any> {
  /** 事件类型 */
  type: WorkflowEventType;
  /** 工作流 ID（可选） */
  workflowId?: string;
  /** 节点 ID（可选，节点级事件必填） */
  nodeId?: string;
  /** 事件载荷 */
  payload?: T;
  /** 事件时间戳 */
  timestamp: number;
}

/**
 * WorkflowEventBus - 工作流事件总线
 *
 * 借鉴 @sker/store 的 ActionsSubject，使用 Subject 实现统一的事件分发机制
 *
 * 核心价值：
 * 1. 解耦工作流执行逻辑和事件观察者
 * 2. 提供按类型过滤事件的便捷 API
 * 3. 支持多订阅者同时监听事件流
 * 4. 便于日志记录、性能监控、调试追踪
 *
 * 使用场景：
 * - 日志记录：监听所有事件并写入日志
 * - 性能分析：监听 NODE_START/NODE_SUCCESS 计算节点执行时间
 * - UI 进度条：监听 NODE_SUCCESS 更新进度
 * - 错误报告：监听 NODE_FAIL/WORKFLOW_FAIL 收集错误
 */
@Injectable()
export class WorkflowEventBus extends Subject<WorkflowEvent> {
  /**
   * 按类型过滤事件流
   *
   * @param types 要过滤的事件类型列表
   * @returns 过滤后的事件流
   *
   * @example
   * ```ts
   * eventBus.ofType(WorkflowEventType.NODE_FAIL).subscribe(event => {
   *   console.error('节点失败:', event.nodeId, event.payload);
   * });
   * ```
   */
  ofType<T = any>(...types: WorkflowEventType[]): Observable<WorkflowEvent<T>> {
    return this.pipe(
      filter(event => types.includes(event.type))
    ) as Observable<WorkflowEvent<T>>;
  }

  /**
   * 发射工作流开始事件
   */
  emitWorkflowStart(workflowId?: string): void {
    this.next({
      type: WorkflowEventType.WORKFLOW_START,
      workflowId,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射工作流完成事件
   */
  emitWorkflowComplete(workflowId?: string, result?: any): void {
    this.next({
      type: WorkflowEventType.WORKFLOW_COMPLETE,
      workflowId,
      payload: result,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射工作流失败事件
   */
  emitWorkflowFail(workflowId?: string, error?: any): void {
    this.next({
      type: WorkflowEventType.WORKFLOW_FAIL,
      workflowId,
      payload: error,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射节点开始事件
   */
  emitNodeStart(nodeId: string, workflowId?: string): void {
    this.next({
      type: WorkflowEventType.NODE_START,
      workflowId,
      nodeId,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射节点发射输出事件
   */
  emitNodeEmit(nodeId: string, output: any, workflowId?: string): void {
    this.next({
      type: WorkflowEventType.NODE_EMIT,
      workflowId,
      nodeId,
      payload: output,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射节点成功事件
   */
  emitNodeSuccess(nodeId: string, result: any, workflowId?: string): void {
    this.next({
      type: WorkflowEventType.NODE_SUCCESS,
      workflowId,
      nodeId,
      payload: result,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射节点失败事件
   */
  emitNodeFail(nodeId: string, error: any, workflowId?: string): void {
    this.next({
      type: WorkflowEventType.NODE_FAIL,
      workflowId,
      nodeId,
      payload: error,
      timestamp: Date.now(),
    });
  }

  /**
   * 发射输出传递事件（数据真正流向下游时触发）
   */
  emitOutputEmit(nodeId: string, property: string, value: any, workflowId?: string): void {
    this.next({
      type: WorkflowEventType.OUTPUT_EMIT,
      workflowId,
      nodeId,
      payload: { property, value } as OutputEmitPayload,
      timestamp: Date.now(),
    });
  }

  /**
   * 监听所有节点失败事件（便捷 API）
   */
  get nodeFailed$(): Observable<WorkflowEvent> {
    return this.ofType(WorkflowEventType.NODE_FAIL);
  }

  /**
   * 监听所有节点成功事件（便捷 API）
   */
  get nodeSuccess$(): Observable<WorkflowEvent> {
    return this.ofType(WorkflowEventType.NODE_SUCCESS);
  }

  /**
   * 监听所有工作流级事件（便捷 API）
   */
  get workflowEvents$(): Observable<WorkflowEvent> {
    return this.ofType(
      WorkflowEventType.WORKFLOW_START,
      WorkflowEventType.WORKFLOW_COMPLETE,
      WorkflowEventType.WORKFLOW_FAIL
    );
  }

  /**
   * 销毁事件总线
   */
  destroy(): void {
    this.complete();
  }
}
