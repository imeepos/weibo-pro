import { useEffect, useState } from 'react'
import { root } from '@sker/core'
import { WorkflowState, WorkflowEventBus, WorkflowEventType } from '@sker/workflow'
import type { WorkflowGraphAst, INode } from '@sker/workflow'
import { NodeExecutionManager } from '../services/node-execution-manager'

/**
 * 订阅工作流执行进度
 *
 * 用途：显示整体进度条
 */
export function useExecutionProgress() {
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 })

  useEffect(() => {
    const workflowState = root.get(WorkflowState)
    const sub = workflowState.progress$.subscribe(setProgress)
    return () => sub.unsubscribe()
  }, [])

  return progress
}

/**
 * 订阅特定节点执行状态（细粒度订阅）
 *
 * 优雅设计：
 * - 只订阅单个节点，避免不必要的重渲染
 * - 使用 distinctUntilChanged 防止重复更新
 * - 自动清理订阅
 *
 * @param nodeId 节点 ID
 * @returns 节点状态（undefined 表示节点不存在或未初始化）
 */
export function useNodeExecution(nodeId: string): INode | undefined {
  const [node, setNode] = useState<INode | undefined>()

  useEffect(() => {
    const workflowState = root.get(WorkflowState)
    const sub = workflowState.selectNode(nodeId).subscribe(setNode)
    return () => sub.unsubscribe()
  }, [nodeId])

  return node
}

/**
 * 节点是否正在执行
 *
 * @param nodeId 节点 ID
 * @returns 是否正在执行
 */
export function useIsNodeRunning(nodeId: string): boolean {
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const manager = root.get(NodeExecutionManager)
    const eventBus = root.get(WorkflowEventBus)

    // 初始状态
    setIsRunning(manager.isNodeRunning(nodeId))

    // 监听节点开始事件
    const startSub = eventBus.ofType(WorkflowEventType.NODE_START).subscribe(event => {
      if (event.nodeId === nodeId) {
        setIsRunning(true)
      }
    })

    // 监听节点完成事件（成功或失败）
    const completeSub = eventBus.ofType(
      WorkflowEventType.NODE_SUCCESS,
      WorkflowEventType.NODE_FAIL
    ).subscribe(event => {
      if (event.nodeId === nodeId) {
        setIsRunning(false)
      }
    })

    return () => {
      startSub.unsubscribe()
      completeSub.unsubscribe()
    }
  }, [nodeId])

  return isRunning
}

/**
 * 订阅工作流执行事件
 *
 * 用途：
 * - 日志记录
 * - 错误提示（Toast/Notification）
 * - 性能监控
 *
 * @param onNodeStart 节点开始回调
 * @param onNodeSuccess 节点成功回调
 * @param onNodeFail 节点失败回调
 */
export function useWorkflowEvents(
  onNodeStart?: (nodeId: string) => void,
  onNodeSuccess?: (nodeId: string, result: any) => void,
  onNodeFail?: (nodeId: string, error: any) => void
) {
  useEffect(() => {
    const eventBus = root.get(WorkflowEventBus)

    const subscriptions = [
      onNodeStart && eventBus.ofType(WorkflowEventType.NODE_START).subscribe(e => {
        onNodeStart(e.nodeId!)
      }),
      onNodeSuccess && eventBus.ofType(WorkflowEventType.NODE_SUCCESS).subscribe(e => {
        onNodeSuccess(e.nodeId!, e.payload)
      }),
      onNodeFail && eventBus.ofType(WorkflowEventType.NODE_FAIL).subscribe(e => {
        onNodeFail(e.nodeId!, e.payload)
      })
    ].filter(Boolean)

    return () => subscriptions.forEach(sub => sub?.unsubscribe())
  }, [onNodeStart, onNodeSuccess, onNodeFail])
}

/**
 * 订阅工作流整体状态
 *
 * @returns 工作流状态（pending | running | success | fail）
 */
export function useWorkflowState(): WorkflowGraphAst['state'] | null {
  const [state, setState] = useState<WorkflowGraphAst['state'] | null>(null)

  useEffect(() => {
    const workflowState = root.get(WorkflowState)
    const sub = workflowState.workflowState$.subscribe(setState)
    return () => sub.unsubscribe()
  }, [])

  return state
}

/**
 * 订阅失败的节点列表
 *
 * 用途：错误汇总展示
 *
 * @returns 失败的节点列表
 */
export function useFailedNodes(): INode[] {
  const [failedNodes, setFailedNodes] = useState<INode[]>([])

  useEffect(() => {
    const workflowState = root.get(WorkflowState)
    const sub = workflowState.failedNodes$.subscribe(setFailedNodes)
    return () => sub.unsubscribe()
  }, [])

  return failedNodes
}
