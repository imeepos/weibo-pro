import type { Edge } from '@xyflow/react'
import type { INode } from '@sker/workflow'
import { hasMultiMode } from '@sker/workflow'
import { getNodeMetadata } from '../adapters'

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
      const nodeIds = new Set(nodes.map((n: any) => n.id))
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
      const targetNode = nodes.find((n: any) => n.id === edge.target)
      if (!targetNode) return false

      try {
        // targetNode is already an INode, pass it directly
        const targetMetadata = getNodeMetadata(targetNode)
        const inputPort = targetMetadata.inputs.find(i => i.property === edge.targetHandle)

        if (inputPort) {
          // 优雅设计：优先使用 mode 位标志，兼容旧的 isMulti
          const supportsMultipleInputs = hasMultiMode(inputPort.mode) || inputPort.isMulti

          if (!supportsMultipleInputs) {
            const existingConnection = edges.find(e =>
              e.id !== edge.id &&
              e.target === edge.target &&
              e.targetHandle === edge.targetHandle
            )
            return !existingConnection
          }
        }
      } catch {
        // 如果获取元数据失败，允许连接
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
