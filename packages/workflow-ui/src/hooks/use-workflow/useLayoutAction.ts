import { useCallback } from 'react'
import { calculateDagreLayout } from '../../utils/layout'
import type { WorkflowContext } from './types'

/**
 * 自动布局 Hook
 *
 * 职责：使用 Dagre 算法重新排列节点，保持拓扑结构。
 */
export function useLayoutAction(ctx: WorkflowContext) {
  const { nodes, edges, workflowAst, setNodes, recordHistory } = ctx

  /**
   * 自动布局
   *
   * 使用 Dagre 算法重新排列节点，保持拓扑结构
   */
  const autoLayout = useCallback(() => {
    const positions = calculateDagreLayout(nodes, edges)

    // 更新 AST 节点位置（创建新对象避免只读属性问题）
    workflowAst.nodes = workflowAst.nodes.map(node => {
      const newPosition = positions.get(node.id)
      if (newPosition) {
        return Object.assign(
          Object.create(Object.getPrototypeOf(node)),
          node,
          { position: newPosition }
        )
      }
      return node
    })

    // 更新 React Flow 节点
    setNodes(nodes =>
      nodes.map(node => {
        const newPosition = positions.get(node.id)
        return newPosition ? { ...node, position: newPosition } : node
      })
    )

    recordHistory()
  }, [nodes, edges, workflowAst, setNodes, recordHistory])

  return { autoLayout }
}
