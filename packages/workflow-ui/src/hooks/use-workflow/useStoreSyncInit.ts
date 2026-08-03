import { useEffect } from 'react'
import { useWorkflowStore } from '../../store/workflow.store'
import type { WorkflowContext } from './types'

/**
 * Store → useWorkflow 同步 Hook
 *
 * 职责：
 * 1. 初始化全局 store
 * 2. 订阅 store 变化，将执行后的节点运行时状态（running/success/fail 等）同步到本地 workflowAst
 */
export function useStoreSyncInit(ctx: WorkflowContext) {
  const { workflowAst, setNodes, isSyncingFromStoreRef } = ctx

  const initWorkflow = useWorkflowStore((state) => state.initWorkflow)
  const storeWorkflowAst = useWorkflowStore((state) => state.workflowAst)
  const storeNodes = useWorkflowStore((state) => state.nodes)

  // 初始化 store
  useEffect(() => {
    initWorkflow(workflowAst)
  }, [workflowAst, initWorkflow])

  // ✨ 订阅 store 变化，同步执行后的节点状态到本地 workflowAst
  // 关键：实现双向同步（Store → useWorkflow）
  useEffect(() => {
    if (!storeWorkflowAst) return

    // 如果正在同步到 store，跳过此次更新（防止循环）
    if (isSyncingFromStoreRef.current) {
      return
    }

    // 检查是否有节点状态变更（运行时状态：running, success, fail）
    let hasRuntimeUpdates = false
    storeWorkflowAst.nodes.forEach((storeNode) => {
      const localNode = workflowAst.nodes.find(n => n.id === storeNode.id)
      if (localNode && storeNode.state !== localNode.state) {
        console.log('[useWorkflow] 同步节点 nodeId:', storeNode.id, 'from:', localNode.state, 'to:', storeNode.state, 'input:', JSON.stringify(storeNode.input))

        // 同步运行时状态（state, input, output, error, count）
        Object.assign(localNode, {
          state: storeNode.state,
          input: storeNode.input,
          output: storeNode.output,
          error: storeNode.error,
          count: storeNode.count,
          emitCount: storeNode.emitCount
        })
        hasRuntimeUpdates = true
      }
    })

    // 如果有运行时状态更新，同步到 React Flow
    if (hasRuntimeUpdates) {
      console.log('[useWorkflow] 应用状态更新到 React Flow')

      // 设置标志位，防止触发循环同步
      isSyncingFromStoreRef.current = true

      // 直接使用 store 的 nodes（已经包含更新后的 data）
      setNodes(storeNodes)

      // 重置标志位（在下一个事件循环中）
      setTimeout(() => {
        isSyncingFromStoreRef.current = false
      }, 0)
    }
  }, [storeWorkflowAst, storeNodes, workflowAst, setNodes])
}
