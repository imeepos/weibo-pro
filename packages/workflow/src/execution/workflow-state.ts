import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { Injectable } from '@sker/core';
import type { WorkflowGraphAst } from '../ast';
import type { INode } from '../types';

/**
 * WorkflowState - 工作流状态管理
 *
 * 借鉴 @sker/store 的 State 类，基于 BehaviorSubject 实现
 * 提供同步状态访问 + 响应式状态流 + 派生状态选择器
 *
 * 核心价值：
 * 1. 统一的状态访问点（current getter）
 * 2. 可订阅的状态流（继承 Observable）
 * 3. 高效的派生状态（selectNode、progress$、failedNodes$）
 */
@Injectable()
export class WorkflowState extends BehaviorSubject<WorkflowGraphAst> {
  constructor(initialWorkflow: WorkflowGraphAst) {
    super(initialWorkflow);
  }

  /**
   * 同步访问当前工作流状态
   * 借鉴 BehaviorSubject.value 的设计
   */
  get current(): WorkflowGraphAst {
    return this.value;
  }

  /**
   * 选择特定节点状态
   *
   * @param nodeId 节点 ID
   * @returns 节点状态流（状态变化时才发射）
   */
  selectNode(nodeId: string): Observable<INode | undefined> {
    return this.pipe(
      map(workflow => workflow.nodes.find(n => n.id === nodeId)),
      distinctUntilChanged((a, b) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return a.state === b.state && a.count === b.count && a.emitCount === b.emitCount;
      })
    );
  }

  /**
   * 派生状态：工作流执行进度
   *
   * @returns 进度信息流（包含已完成/总数/百分比）
   */
  get progress$(): Observable<{ completed: number; total: number; percentage: number }> {
    return this.pipe(
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
    return this.pipe(
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
    return this.pipe(
      map(workflow => workflow.state),
      distinctUntilChanged()
    );
  }

  /**
   * 销毁状态流
   * 确保资源正确释放
   */
  destroy(): void {
    this.complete();
  }
}
