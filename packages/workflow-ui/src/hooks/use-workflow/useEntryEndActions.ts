import { useCallback } from 'react'
import type { WorkflowContext } from './types'

/**
 * 起始/结束节点控制 Hook
 *
 * 职责：切换起始/结束节点、判断节点是否为起始/结束节点。
 */
export function useEntryEndActions(ctx: WorkflowContext) {
  const { workflowAst, syncFromAst, onWorkflowChangeRef } = ctx

  /**
   * 切换起始节点状态
   */
  const toggleEntryNode = useCallback((nodeId: string) => {
    const index = workflowAst.entryNodeIds.indexOf(nodeId)
    if (index === -1) {
      workflowAst.entryNodeIds = [...workflowAst.entryNodeIds, nodeId]
    } else {
      workflowAst.entryNodeIds = workflowAst.entryNodeIds.filter(id => id !== nodeId)
    }
    syncFromAst()
    onWorkflowChangeRef.current?.()
  }, [workflowAst, syncFromAst])

  /**
   * 切换结束节点状态
   */
  const toggleEndNode = useCallback((nodeId: string) => {
    const index = workflowAst.endNodeIds.indexOf(nodeId)
    if (index === -1) {
      workflowAst.endNodeIds = [...workflowAst.endNodeIds, nodeId]
    } else {
      workflowAst.endNodeIds = workflowAst.endNodeIds.filter(id => id !== nodeId)
    }
    syncFromAst()
    onWorkflowChangeRef.current?.()
  }, [workflowAst, syncFromAst])

  /**
   * 判断是否为起始节点
   */
  const isEntryNode = useCallback((nodeId: string) => {
    return workflowAst.entryNodeIds.includes(nodeId)
  }, [workflowAst.entryNodeIds])

  /**
   * 判断是否为结束节点
   */
  const isEndNode = useCallback((nodeId: string) => {
    return workflowAst.endNodeIds.includes(nodeId)
  }, [workflowAst.endNodeIds])

  return { toggleEntryNode, toggleEndNode, isEntryNode, isEndNode }
}
