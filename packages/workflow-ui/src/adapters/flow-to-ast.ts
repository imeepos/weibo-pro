import type { INode, IEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'

/**
 * 将 React Flow 格式转换为 Ast 格式
 */
export function flowToAst(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { nodes: INode[]; edges: IEdge[] } {
  return {
    nodes: nodes.map(fromFlowNode),
    edges: edges.map(fromFlowEdge),
  }
}

/**
 * 从 Flow 节点提取 Ast 实例
 */
function fromFlowNode(node: WorkflowNode): INode {
  return node.data.ast
}

/**
 * 从 Flow 边构建 Ast 边
 */
function fromFlowEdge(edge: WorkflowEdge): IEdge {
  if (!edge.data) {
    throw new Error('Edge data is required')
  }
  const { fromProperty, toProperty, condition, weight } = edge.data

  const astEdge: IEdge = {
    id: edge.id,
    from: edge.source,
    to: edge.target,
  }

  if (fromProperty) astEdge.fromProperty = fromProperty
  if (toProperty) astEdge.toProperty = toProperty
  if (weight !== undefined) astEdge.weight = weight
  if (condition) astEdge.condition = condition

  return astEdge
}
