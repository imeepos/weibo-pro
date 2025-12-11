import { Subject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { Injectable, Inject } from '@sker/core';
import type { WorkflowGraphAst } from '../ast';
import type { INode } from '../types';
import { WorkflowEventBus, WorkflowEventType, type WorkflowEvent } from './workflow-events';
import { updateNodeReducer } from './workflow-reducers';

/**
 * WorkflowState - 工作流状态管理器
 *
 * 优雅设计：
 * - ✅ 监听 EventBus，自动更新状态（事件驱动）
 * - ✅ 细粒度节点级更新，保持响应式
 * - ✅ 提供派生状态（progress$, failedNodes$）
 * - ✅ 单一数据源在外部，本类只作镜像和广播
 *
 * 存在即合理：
 * - 解耦状态存储和事件分发
 * - 状态由事件驱动，而非手动推送
 * - 自动响应节点编辑和执行事件
 */
@Injectable()
export class WorkflowState {
  private readonly _subject = new Subject<WorkflowGraphAst>();
  private _current: WorkflowGraphAst | null = null;

  constructor(@Inject(WorkflowEventBus) private eventBus: WorkflowEventBus) {
    // ✨ 监听节点相关事件，自动更新状态
    this.eventBus.ofType(
      WorkflowEventType.NODE_UPDATED,
      WorkflowEventType.NODE_START,
      WorkflowEventType.NODE_SUCCESS,
      WorkflowEventType.NODE_FAIL,
      WorkflowEventType.NODE_EMIT
    ).subscribe(event => {
      this.handleNodeEvent(event);
    });
  }

  /**
   * 处理节点事件（细粒度更新）
   */
  private handleNodeEvent(event: WorkflowEvent): void {
    if (!this._current || !event.nodeId) return;

    let updates: Partial<INode> = {};

    switch (event.type) {
      case WorkflowEventType.NODE_UPDATED:
        // 用户编辑节点参数（从 payload.updates 提取）
        updates = event.payload?.updates || {};
        break;

      case WorkflowEventType.NODE_START:
        updates = { state: 'running' as const };
        break;

      case WorkflowEventType.NODE_EMIT:
        updates = { state: 'emitting' as const };
        break;

      case WorkflowEventType.NODE_SUCCESS:
        updates = { state: 'success' as const };
        if (event.payload) {
          // 合并输出数据（但不覆盖 state）
          const { state, ...outputs } = event.payload;
          Object.assign(updates, outputs);
        }
        break;

      case WorkflowEventType.NODE_FAIL:
        updates = {
          state: 'fail' as const,
          error: event.payload
        };
        break;
    }

    // ✨ 使用 reducer 更新状态（确保逻辑一致）
    this._current = updateNodeReducer(this._current, {
      nodeId: event.nodeId,
      updates
    });

    // 广播更新（只有订阅者会收到）
    this._subject.next(this._current);
  }

  /**
   * 初始化工作流
   */
  init(workflow: WorkflowGraphAst): void {
    this._current = workflow;
    this._subject.next(workflow);
  }

  /**
   * 手动推送状态更新（用于批量更新场景）
   *
   * 注意：正常情况下不需要调用此方法，状态由事件驱动自动更新
   */
  next(workflow: WorkflowGraphAst): void {
    this._current = workflow;
    this._subject.next(workflow);
  }

  /**
   * 同步访问当前状态
   */
  get current(): WorkflowGraphAst | null {
    return this._current;
  }

  /**
   * 订阅状态流
   */
  subscribe(observer: (workflow: WorkflowGraphAst) => void) {
    return this._subject.subscribe(observer);
  }

  /**
   * 选择特定节点状态（细粒度订阅）
   *
   * @param nodeId 节点 ID
   * @returns 节点状态流（状态变化时才发射）
   */
  selectNode(nodeId: string): Observable<INode | undefined> {
    return this._subject.pipe(
      map(workflow => workflow.nodes.find(n => n.id === nodeId)),
      distinctUntilChanged((a, b) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        // ✨ 深度比较节点状态和关键属性
        return (
          a.state === b.state &&
          a.count === b.count &&
          a.emitCount === b.emitCount &&
          a.error === b.error
        );
      })
    );
  }

  /**
   * 派生状态：工作流执行进度
   *
   * @returns 进度信息流（包含已完成/总数/百分比）
   */
  get progress$(): Observable<{ completed: number; total: number; percentage: number }> {
    return this._subject.pipe(
      map(workflow => {
        const total = workflow.nodes.length;
        const completed = workflow.nodes.filter(n =>
          n.state === 'success' || n.state === 'fail'
        ).length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        return { completed, total, percentage };
      }),
      distinctUntilChanged((a, b) => a.percentage === b.percentage)
    );
  }

  /**
   * 派生状态：失败的节点列表
   *
   * @returns 失败节点流（用于错误报告和调试）
   */
  get failedNodes$(): Observable<INode[]> {
    return this._subject.pipe(
      map(workflow => workflow.nodes.filter(n => n.state === 'fail')),
      distinctUntilChanged((a, b) => {
        if (a.length !== b.length) return false;
        return a.every((node, idx) => node.id === b[idx]?.id);
      })
    );
  }

  /**
   * 派生状态：工作流整体状态
   *
   * @returns 工作流状态流
   */
  get workflowState$(): Observable<WorkflowGraphAst['state']> {
    return this._subject.pipe(
      map(workflow => workflow.state),
      distinctUntilChanged()
    );
  }

  /**
   * 销毁状态流
   * 确保资源正确释放
   */
  destroy(): void {
    this._subject.complete();
  }
}
