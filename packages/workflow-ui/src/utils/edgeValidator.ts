import type { Edge } from '@xyflow/react'
import type { INode } from '@sker/workflow'
import { hasMultiMode } from '@sker/workflow'

/**
 * 边验证规则接口
 */
export interface EdgeValidationRule {
  name: string
  validate: (edge: Edge, nodes: INode[], edges: Edge[]) => boolean
  errorMessage: string
}

/**
 * 内置边验证规则
 */
export const EDGE_VALIDATION_RULES: EdgeValidationRule[] = [
  {
    name: 'nodes-exist',
    validate: (edge, nodes) => {
      const collectNodeIds = (nodeList: INode[], ids: Set<string>) => {
        for (const n of nodeList) {
          ids.add(n.id)
          if ((n as any).isGroupNode && (n as any).nodes?.length > 0) {
            collectNodeIds((n as any).nodes, ids)
          }
        }
      }
      const nodeIds = new Set<string>()
      collectNodeIds(nodes, nodeIds)
      return nodeIds.has(edge.source) && nodeIds.has(edge.target)
    },
    errorMessage: '源节点或目标节点不存在'
  },
  {
    name: 'no-self-connection',
    validate: (edge) => edge.source !== edge.target,
    errorMessage: '不允许节点连接到自己'
  },
  {
    name: 'no-duplicate',
    validate: (edge, nodes, edges) => {
      return !edges.some(e =>
        e.id !== edge.id &&
        e.source === edge.source &&
        e.target === edge.target &&
        e.sourceHandle === edge.sourceHandle &&
        e.targetHandle === edge.targetHandle
      )
    },
    errorMessage: '不允许重复连接'
  },
  {
    name: 'input-single-connection',
    validate: (edge, nodes, edges) => {
      const findNode = (nodeList: INode[], id: string): INode | undefined => {
        for (const n of nodeList) {
          if (n.id === id) return n
          if ((n as any).isGroupNode && (n as any).nodes?.length > 0) {
            const found = findNode((n as any).nodes, id)
            if (found) return found
          }
        }
        return undefined
      }
      const targetNode = findNode(nodes, edge.target)
      if (!targetNode) return false

      try {
        const targetMetadata = targetNode.metadata
        if (!targetMetadata) {
          console.warn('[edgeValidator] 节点缺少 metadata', { nodeId: targetNode.id })
          return true // 容错处理
        }

        const inputPort = targetMetadata.inputs.find(i => i.property === edge.targetHandle)

        if (inputPort) {
          // 使用 mode 位标志判断是否支持多输入
          const supportsMultipleInputs = hasMultiMode(inputPort.mode)

          if (!supportsMultipleInputs) {
            const existingConnection = edges.find(e =>
              e.id !== edge.id &&
              e.target === edge.target &&
              e.targetHandle === edge.targetHandle
            )
            return !existingConnection
          }
        }
      } catch (error) {
        // 如果获取元数据失败，允许连接（容错处理）
        console.error('[edgeValidator] 验证失败', error)
        return true
      }

      return true
    },
    errorMessage: '此输入端口不支持多条连接'
  }
]

/**
 * 验证单条边
 */
export function validateEdge(
  edge: Edge,
  nodes: INode[],
  edges: Edge[],
  rules: EdgeValidationRule[] = EDGE_VALIDATION_RULES
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const rule of rules) {
    try {
      if (!rule.validate(edge, nodes, edges)) {
        errors.push(rule.errorMessage)
      }
    } catch (error) {
      console.error(`验证规则 ${rule.name} 执行失败:`, error)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 批量验证边，返回有效的边
 */
export function validateEdges(
  edges: Edge[],
  nodes: INode[],
  rules: EdgeValidationRule[] = EDGE_VALIDATION_RULES
): Edge[] {
  return edges.filter(edge => {
    const { valid } = validateEdge(edge, nodes, edges, rules)
    return valid
  })
}

/**
 * 批量验证边，返回详细结果
 */
export function validateEdgesDetailed(
  edges: Edge[],
  nodes: INode[],
  rules: EdgeValidationRule[] = EDGE_VALIDATION_RULES
): {
  validEdges: Edge[]
  invalidEdges: Array<{ edge: Edge; errors: string[] }>
} {
  const validEdges: Edge[] = []
  const invalidEdges: Array<{ edge: Edge; errors: string[] }> = []

  edges.forEach(edge => {
    const { valid, errors } = validateEdge(edge, nodes, edges, rules)
    if (valid) {
      validEdges.push(edge)
    } else {
      invalidEdges.push({ edge, errors })
    }
  })

  return { validEdges, invalidEdges }
}
