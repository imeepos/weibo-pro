import type { INode, IEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'

/**
 * 将 WorkflowGraphAst 转换为 React Flow 格式
 */
export function astToFlow(
  nodes: INode[],
  edges: IEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: nodes.map(toFlowNode),
    edges: edges.map(toFlowEdge),
  }
}

/**
 * 转换节点数组
 */
export function astToFlowNodes(ast: { nodes: INode[] }): WorkflowNode[] {
  return ast.nodes.map(toFlowNode)
}

/**
 * 转换边数组
 */
export function astToFlowEdges(ast: { edges: IEdge[] }): WorkflowEdge[] {
  return ast.edges.map(toFlowEdge)
}

/**
 * 转换单个节点
 * @param node - AST 节点实例
 * @returns React Flow 节点（类型安全，直接引用 AST 实例）
 *
 * 优雅设计：
 * - data 属性直接引用 AST 实例，而非深拷贝
 * - 保持引用透明性，修改 AST 立即反映到 UI
 * - 类型安全，无需 any 断言
 */
function toFlowNode<T extends INode>(node: T): WorkflowNode<T> {
  return {
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: node // 直接引用，保持引用透明性
  }
}

/**
 * 转换单个边
 */
function toFlowEdge(edge: IEdge): WorkflowEdge {
  // 使用源节点、目标节点和连接属性生成稳定的唯一 id
  const idParts = [
    edge.from,
    edge.to,
    edge.fromProperty || '',
    edge.toProperty || '',
    edge.weight || '',
    edge.condition ? JSON.stringify(edge.condition) : ''
  ].filter(Boolean)
  const stableId = idParts.join('-')

  // 根据边的属性决定类型
  const hasDataMapping = edge.fromProperty || edge.toProperty
  const edgeType = hasDataMapping ? 'data' : 'control'
  const flowEdgeType = hasDataMapping ? 'workflow-data-edge' : 'workflow-control-edge'

  return {
    id: edge.id || `edge-${stableId}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.fromProperty || null,
    targetHandle: edge.toProperty || null,
    type: flowEdgeType,
    data: {
      edgeType,
      styleType: (edge as any).styleType || edgeType,
      edge,
      fromProperty: edge.fromProperty,
      toProperty: edge.toProperty,
      weight: edge.weight,
      condition: edge.condition,
    },
  }
}
