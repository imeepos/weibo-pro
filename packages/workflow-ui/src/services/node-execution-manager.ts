import { Injectable, root } from '@sker/core'
import { ReactiveScheduler, WorkflowEventBus, WorkflowEventType } from '@sker/workflow'
import type { WorkflowGraphAst } from '@sker/workflow'
import type { Subscription } from 'rxjs'

/**
 * 节点执行管理器
 *
 * 存在即合理：
 * - 管理单个节点的执行订阅
 * - 支持取消和重启单个节点
 * - 不影响其他节点的执行
 * - 解耦节点执行控制和状态管理
 *
 * 优雅设计：
 * - 使用 Map 管理多个并发执行
 * - 自动清理完成的订阅
 * - 提供细粒度执行控制
 */
@Injectable({ providedIn: 'root' })
export class NodeExecutionManager {
  private nodeSubscriptions = new Map<string, Subscription>()
  private eventBus: WorkflowEventBus
  private scheduler: ReactiveScheduler

  constructor() {
    this.eventBus = root.get(WorkflowEventBus)
    this.scheduler = root.get(ReactiveScheduler)

    // ✨ 监听节点完成事件，自动清理订阅
    this.eventBus.ofType(
      WorkflowEventType.NODE_SUCCESS,
      WorkflowEventType.NODE_FAIL
    ).subscribe(event => {
      if (event.nodeId && this.nodeSubscriptions.has(event.nodeId)) {
        console.log(`[NodeExecutionManager] 节点 ${event.nodeId} 执行完成，清理订阅`)
        this.nodeSubscriptions.delete(event.nodeId)
      }
    })
  }

  /**
   * 执行单个节点（增量执行）
   *
   * @param workflow 工作流实例
   * @param nodeId 节点 ID
   */
  executeNode(workflow: WorkflowGraphAst, nodeId: string): void {
    // 如果节点正在执行，先取消
    if (this.isNodeRunning(nodeId)) {
      console.log(`[NodeExecutionManager] 节点 ${nodeId} 正在执行，先取消`)
      this.cancelNode(nodeId)
    }

    console.log(`[NodeExecutionManager] 开始执行节点: ${nodeId}`)

    // ✨ 使用 fineTuneNode 增量执行
    const execution$ = this.scheduler.fineTuneNode(workflow, nodeId)

    const sub = execution$.subscribe({
      next: (updatedWorkflow) => {
        // WorkflowState 会自动监听事件并更新状态
        // 这里不需要手动处理
      },
      error: (error) => {
        console.error(`[NodeExecutionManager] 节点 ${nodeId} 执行失败`, error)
        this.nodeSubscriptions.delete(nodeId)
      },
      complete: () => {
        console.log(`[NodeExecutionManager] 节点 ${nodeId} 执行完成`)
        this.nodeSubscriptions.delete(nodeId)
      }
    })

    this.nodeSubscriptions.set(nodeId, sub)
  }

  /**
   * 取消单个节点执行
   *
   * @param nodeId 节点 ID
   */
  cancelNode(nodeId: string): void {
    const sub = this.nodeSubscriptions.get(nodeId)
    if (sub) {
      sub.unsubscribe()
      this.nodeSubscriptions.delete(nodeId)
      console.log(`[NodeExecutionManager] 节点 ${nodeId} 执行已取消`)
    }
  }

  /**
   * 节点是否正在执行
   *
   * @param nodeId 节点 ID
   * @returns 是否正在执行
   */
  isNodeRunning(nodeId: string): boolean {
    return this.nodeSubscriptions.has(nodeId)
  }

  /**
   * 获取所有正在执行的节点 ID
   *
   * @returns 正在执行的节点 ID 列表
   */
  getRunningNodes(): string[] {
    return Array.from(this.nodeSubscriptions.keys())
  }

  /**
   * 取消所有节点执行
   */
  cancelAll(): void {
    console.log(`[NodeExecutionManager] 取消所有节点执行，共 ${this.nodeSubscriptions.size} 个`)
    this.nodeSubscriptions.forEach((sub, nodeId) => {
      sub.unsubscribe()
      console.log(`[NodeExecutionManager] 节点 ${nodeId} 执行已取消`)
    })
    this.nodeSubscriptions.clear()
  }

  /**
   * 销毁管理器（清理所有资源）
   */
  destroy(): void {
    this.cancelAll()
  }
}
