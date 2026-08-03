import { useCallback } from 'react'
import type { WorkflowGraphAst } from '@sker/workflow'
import { astToFlowNodes, astToFlowEdges } from '../../adapters/ast-to-flow'
import type { WorkflowContext } from './types'

/**
 * 工作流级操作 Hook
 *
 * 职责：清空工作流、完全替换工作流（导入场景）。
 */
export function useWorkflowActions(ctx: WorkflowContext) {
  const { workflowAst, setWorkflowAst, setNodes, setEdges, storeSyncNodes, storeSyncEdges, onWorkflowChangeRef } = ctx

  /**
   * 清空工作流
   */
  const clearWorkflow = useCallback(() => {
    workflowAst.nodes = []
    workflowAst.edges = []
    setNodes([])
    setEdges([])
  }, [workflowAst, setNodes, setEdges])

  /**
   * 完全替换工作流内容（用于导入功能）
   *
   * 导入时只导入工作流的结构数据（节点、边等），不导入标识信息：
   * - 保持：id, name, description（当前工作流的标识和名称）
   * - 替换：nodes, edges, entryNodeIds, endNodeIds（导入的工作流内容）
   */
  const replaceWorkflow = useCallback((newWorkflowAst: WorkflowGraphAst) => {
    // ⚠️ 关键：保持当前工作流的标识信息不变
    const currentId = workflowAst.id
    const currentName = workflowAst.name
    const currentDescription = workflowAst.description

    // 只替换内容数据，不替换标识信息
    setWorkflowAst(newWorkflowAst)

    // 恢复标识信息
    newWorkflowAst.id = currentId
    newWorkflowAst.name = currentName
    newWorkflowAst.description = currentDescription

    const flowNodes = astToFlowNodes(newWorkflowAst)
    const flowEdges = astToFlowEdges(newWorkflowAst)
    setNodes(flowNodes)
    setEdges(flowEdges)
    storeSyncNodes(flowNodes, false)
    storeSyncEdges(flowEdges, false)
    onWorkflowChangeRef.current?.()
  }, [workflowAst, setNodes, setEdges, storeSyncNodes, storeSyncEdges])

  return { clearWorkflow, replaceWorkflow }
}
