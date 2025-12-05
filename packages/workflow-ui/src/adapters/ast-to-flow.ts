import { type INode, type IEdge, generateId, WorkflowGraphAst } from '@sker/workflow'
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
 * 转换节点数组（递归展开分组）
 * 注意：父节点必须在子节点之前，React Flow 要求
 */
export function astToFlowNodes(ast: { nodes: INode[] }): WorkflowNode[] {
  const result: WorkflowNode[] = []

  function collect(nodes: INode[], parentId?: string) {
    for (const node of nodes) {
      const isGroup = (node as any).isGroupNode === true

      // 先添加分组节点本身
      const flowNode = toFlowNode(node)
      if (parentId) {
        flowNode.parentId = parentId
        flowNode.extent = 'parent'  // 限制子节点不能拖出分组边界
      }
      result.push(flowNode)

      // 再递归添加子节点（保证父节点在前）
      if (isGroup && (node as any).nodes?.length > 0) {
        collect((node as any).nodes, node.id)
      }
    }
  }

  collect(ast.nodes)
  return result
}

/**
 * 转换边数组（递归收集分组内的边）
 */
export function astToFlowEdges(ast: { nodes: INode[]; edges: IEdge[] }): WorkflowEdge[] {
  const result: WorkflowEdge[] = ast.edges.map(toFlowEdge)

  function collectFromGroups(nodes: INode[]) {
    for (const node of nodes) {
      const isGroup = (node as any).isGroupNode === true
      if (isGroup && (node as any).nodes?.length > 0) {
        result.push(...((node as any).edges || []).map(toFlowEdge))
        collectFromGroups((node as any).nodes)
      }
    }
  }

  collectFromGroups(ast.nodes)
  return result
}

/**
 * 转换单个节点
 */
function toFlowNode<T extends INode>(node: T): WorkflowNode<T> {
  const isGroup = (node as any).isGroupNode === true
  return {
    id: node.id,
    type: isGroup ? 'GroupNode' : node.type,
    position: node.position || { x: 0, y: 0 },
    data: node,
    ...(node.parentId && { parentId: node.parentId }),
    ...(isGroup && node.width && node.height && {
      width: node.width,
      height: node.height
    })
  }
}

/**
 * 转换单个边
 */
function toFlowEdge(edge: IEdge): WorkflowEdge {
  // 根据边的属性决定类型
  const hasDataMapping = edge.fromProperty || edge.toProperty
  const edgeType = hasDataMapping ? 'data' : 'control'
  const flowEdgeType = hasDataMapping ? 'workflow-data-edge' : 'workflow-control-edge'

  return {
    id: edge.id || generateId(),
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
