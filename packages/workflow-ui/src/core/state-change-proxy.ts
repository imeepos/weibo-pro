import type { WorkflowNode } from '../types'
import type { INode } from '@sker/workflow'
import { useRef, useEffect } from 'react'
import { useDeepSync } from './useDeepSync'

export { useDeepSync }

/**
 * StateChangeProxy - 变更代理层
 *
 * 变更拦截：拦截所有 AST 变更，自动同步到 React Flow
 * 批量优化：合并高频变更，减少重渲染次数
 * 性能优化：节流拖拽事件，避免过度同步
 */
export class StateChangeProxy {
  /** 变更批处理队列 */
  private _batch: Array<() => void> = []

  /** 节流定时器（用于高频操作） */
  private throttleTimers = new Map<string, number>()

  /** 拖拽状态追踪 */
  private draggingNodes = new Set<string>()

  constructor(
    private setNodes: (nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])) => void,
    private options: {
      /** 节流延迟（ms），默认 50ms */
      throttleDelay?: number
      /** 是否启用调试日志 */
      debug?: boolean
      /** 是否启用变更历史记录 */
      enableHistory?: boolean
    } = {}
  ) {
    this.options.throttleDelay = this.options.throttleDelay ?? 50
  }

  /**
   * 修改 AST 节点（自动同步到 React Flow）
   */
  mutateAst<T extends INode>(
    node: T,
    updater: (draft: T) => void
  ): void {
    // 直接修改 AST（mutable 操作，保持性能）
    updater(node)

    // 调度同步任务
    this.scheduleSync(node.id, 'mutation')

    if (this.options.debug) {
      console.log(`[StateChangeProxy] AST mutated: ${node.id}`, node)
    }
  }

  /**
   * 节流版本的 mutateAst（用于拖拽、实时输入等高频操作）
   */
  mutateAstThrottled<T extends INode>(
    node: T,
    updater: (draft: T) => void
  ): void {
    // 清除现有的定时器
    if (this.throttleTimers.has(node.id)) {
      window.clearTimeout(this.throttleTimers.get(node.id)!)
    }

    // 直接修改 AST（立即生效）
    updater(node)

    // 延迟调度同步（节流）
    const timer = window.setTimeout(() => {
      this.scheduleSync(node.id, 'throttled')
      this.throttleTimers.delete(node.id)
    }, this.options.throttleDelay)

    this.throttleTimers.set(node.id, timer)

    if (this.options.debug) {
      console.log(`[StateChangeProxy] AST throttled: ${node.id}`)
    }
  }

  /**
   * 批量执行多个变更（合并为一次重渲染，保持原子性）
   */
  batch(operations: Array<() => void>): void {
    // 批量执行所有操作（不触发同步）
    operations.forEach((op) => op())

    // 一次性同步所有变更
    this.flush()

    if (this.options.debug) {
      console.log(`[StateChangeProxy] Batch executed: ${operations.length} operations`)
    }
  }

  /**
   * 开始拖拽（进入拖拽模式，位置更新使用节流）
   */
  startDrag(nodeId: string): void {
    this.draggingNodes.add(nodeId)

    if (this.options.debug) {
      console.log(`[StateChangeProxy] Drag started: ${nodeId}`)
    }
  }

  /**
   * 结束拖拽：清除节流定时器并立即同步
   */
  endDrag(nodeId: string): void {
    this.draggingNodes.delete(nodeId)

    // 清除节流定时器
    if (this.throttleTimers.has(nodeId)) {
      window.clearTimeout(this.throttleTimers.get(nodeId)!)
      this.throttleTimers.delete(nodeId)
    }

    // 立即同步
    this.scheduleSync(nodeId, 'drag-end')

    if (this.options.debug) {
      console.log(`[StateChangeProxy] Drag ended: ${nodeId}`)
    }
  }

  /**
   * 调度同步任务
   * @private
   */
  private scheduleSync(nodeId: string, source: string): void {
    // 如果已经在拖拽模式，使用节流版本（外部已处理）
    if (this.draggingNodes.has(nodeId)) {
      return
    }

    // 添加到批处理队列
    this._batch.push(() => {
      // 触发 React Flow 重渲染
      this.setNodes((prev) => [...prev])
    })

    // 如果没有待执行的帧回调，则注册一个
    if (this.batch.length === 1) {
      requestAnimationFrame(() => {
        this.flush()
      })
    }

    if (this.options.debug) {
      console.log(`[StateChangeProxy] Sync scheduled: ${nodeId} (source: ${source})`)
    }
  }

  /**
   * 执行所有挂起的同步任务
   * @private
   */
  private flush(): void {
    if (this.batch.length === 0) return

    // 执行所有变更
    const operations = [...this._batch]
    this._batch = []

    // 合并所有操作，减少 React 重渲染次数
    this.setNodes((prev) => [...prev])

    if (this.options.debug) {
      console.log(`[StateChangeProxy] Flushed ${operations.length} operations`)
    }
  }

  /**
   * 销毁代理（清理资源，组件卸载时调用）
   */
  destroy(): void {
    // 清除所有节流定时器
    this.throttleTimers.forEach((timer) => {
      window.clearTimeout(timer)
    })
    this.throttleTimers.clear()

    // 清空批处理队列与拖拽状态
    this._batch = []
    this.draggingNodes.clear()

    if (this.options.debug) {
      console.log('[StateChangeProxy] Destroyed')
    }
  }
}

/**
 * Hook：创建 StateChangeProxy 实例
 *
 * 自动管理生命周期：
 * - 组件挂载时创建代理
 * - 组件卸载时销毁代理（清理定时器和内存）
 *
 * @example
 * ```typescript
 * const proxy = useStateChangeProxy(setNodes, { debug: true })
 *
 * useEffect(() => {
 *   return () => proxy.destroy() // 自动清理
 * }, [])
 * ```
 */
export function useStateChangeProxy(
  setNodes: (nodes: WorkflowNode[] | ((nodes: WorkflowNode[]) => WorkflowNode[])) => void,
  options?: ConstructorParameters<typeof StateChangeProxy>[1]
): StateChangeProxy {
  const proxyRef = useRef<StateChangeProxy | undefined>(undefined)

  if (!proxyRef.current) {
    proxyRef.current = new StateChangeProxy(setNodes, options)
  }

  useEffect(() => {
    return () => {
      // 组件卸载时销毁代理
      proxyRef.current?.destroy()
    }
  }, [])

  return proxyRef.current
}
