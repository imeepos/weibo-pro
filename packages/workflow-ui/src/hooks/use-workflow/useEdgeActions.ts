import { useCallback } from 'react'
import { generateId, addEdge as astAddEdge } from '@sker/workflow'
import type { IEdge, INode, WorkflowGraphAst } from '@sker/workflow'
import { addEdge, type Connection } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
import type { WorkflowContext } from './types'

/**
 * 边操作 Hook
 *
 * 职责：连接节点、删除连接，保持 AST 与 React Flow 同步。
 */
export function useEdgeActions(ctx: WorkflowContext) {
  const { workflowAst, edges, setEdges, recordHistory, onWorkflowChangeRef } = ctx

  const connectNodes = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const edge: IEdge = {
        id: `edge-${generateId()}`,
        type: 'data',
        from: connection.source,
        to: connection.target,
        fromProperty: connection.sourceHandle || undefined,
        toProperty: connection.targetHandle || undefined
      }

      // 查找节点所属的分组
      const findNodeParentGroup = (nodeId: string, nodes: INode[]): WorkflowGraphAst | null => {
        for (const node of nodes) {
          if ((node as any).isGroupNode && (node as any).nodes?.length > 0) {
            const group = node as WorkflowGraphAst
            if (group.nodes.some(n => n.id === nodeId)) {
              return group
            }
            const nested = findNodeParentGroup(nodeId, group.nodes)
            if (nested) return nested
          }
        }
        return null
      }

      const sourceGroup = findNodeParentGroup(connection.source, workflowAst.nodes)
      const targetGroup = findNodeParentGroup(connection.target, workflowAst.nodes)

      // 如果两个节点在同一分组内，边添加到分组的 edges
      if (sourceGroup && sourceGroup === targetGroup) {
        sourceGroup.edges = astAddEdge(sourceGroup.nodes, sourceGroup.edges, edge)
      } else {
        workflowAst.edges = astAddEdge(workflowAst.nodes, workflowAst.edges, edge)
      }

      const flowEdge: WorkflowEdge = {
        id: edge.id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'workflow-data-edge',
        data: {
          edgeType: 'data',
          edge
        }
      }

      setEdges((edges) => addEdge(flowEdge, edges))
      onWorkflowChangeRef.current?.()
      recordHistory()
    },
    [workflowAst, setEdges, recordHistory]
  )

  /**
   * 删除连接
   *
   * 优雅设计：
   * - 支持通过 edgeId 或完整 edge 对象删除
   * - 自动同步 AST 和 UI 状态
   * - 健壮的边匹配逻辑
   */
  const removeEdge = useCallback(
    (edgeOrId: string | WorkflowEdge) => {
      // 支持传入 edge.id 或完整的 edge 对象
      const edge =
        typeof edgeOrId === 'string'
          ? edges.find((e) => e.id === edgeOrId)
          : edgeOrId

      if (!edge) {
        console.warn('Edge not found:', edgeOrId)
        return
      }

      // ✨ 从 AST 中删除对应的边（不可变方式）
      const astEdgeIndex = workflowAst.edges.findIndex((e) => {
        // 检查是否有数据映射属性
        if (!e.fromProperty || !e.toProperty) return false

        return (
          e.from === edge.source &&
          e.to === edge.target &&
          e.fromProperty === edge.sourceHandle &&
          e.toProperty === edge.targetHandle
        )
      })

      if (astEdgeIndex !== -1) {
        // ✨ 创建新数组而不是修改原数组
        workflowAst.edges = [
          ...workflowAst.edges.slice(0, astEdgeIndex),
          ...workflowAst.edges.slice(astEdgeIndex + 1)
        ]
        console.log(
          'Edge removed from AST:',
          edge.id,
          'AST edges count:',
          workflowAst.edges.length
        )
      } else {
        console.warn('Edge not found in AST:', edge)
      }

      // 更新 UI 状态
      setEdges((currentEdges) => currentEdges.filter((e) => e.id !== edge.id))

      // 触发变更回调
      onWorkflowChangeRef.current?.()
      recordHistory()
    },
    [workflowAst, edges, setEdges, recordHistory]
  )

  return { connectNodes, removeEdge }
}
