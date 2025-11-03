import type { INode, IEdge, IDataEdge, IControlEdge } from '@sker/workflow'
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
  const { edgeType, fromProperty, toProperty, condition, weight } = edge.data

  if (edgeType === 'data') {
    const dataEdge: IDataEdge = {
      from: edge.source,
      to: edge.target,
    }
    if (fromProperty) dataEdge.fromProperty = fromProperty
    if (toProperty) dataEdge.toProperty = toProperty
    if (weight !== undefined) dataEdge.weight = weight
    return dataEdge
  }

  if (edgeType === 'control') {
    const controlEdge: IControlEdge = {
      from: edge.source,
      to: edge.target,
    }
    if (condition) controlEdge.condition = condition
    return controlEdge
  }

  throw new Error(`Unknown edge type: ${edgeType}`)
}
