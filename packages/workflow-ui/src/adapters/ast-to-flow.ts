import { type INode, type IEdge, generateId, WorkflowGraphAst } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { validateEdgesDetailed, EDGE_VALIDATION_RULES } from '../utils/edgeValidator'

/**
 * 将 WorkflowGraphAst 转换为 React Flow 格式
 */
export function astToFlow(
  nodes: INode[],
  edges: IEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: nodes.map((node) => toFlowNode(node)),
    edges: edges.map(toFlowEdge),
  }
}

/**
 * 转换节点数组（递归展开分组）
 * 注意：父节点必须在子节点之前，React Flow 要求
 */
export function astToFlowNodes(ast: { nodes: INode[]; entryNodeIds?: string[]; endNodeIds?: string[] }): WorkflowNode[] {
  const result: WorkflowNode[] = []
  const entryNodeIds = new Set(ast.entryNodeIds || [])
  const endNodeIds = new Set(ast.endNodeIds || [])

  function collect(nodes: INode[], parentId?: string) {
    for (const node of nodes) {
      const isGroup = (node as any).isGroupNode === true

      // 先添加分组节点本身
      const flowNode = toFlowNode(node, entryNodeIds.has(node.id), endNodeIds.has(node.id))
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
 *
 * 自动清理无效边：
 * - 引用不存在节点的边
 * - 引用不存在端口（handle）的边
 *
 * @param ast - 包含 nodes 和 edges 的工作流对象
 * @param cleanAst - 是否同步清理 AST 中的无效边（默认 true）
 */
export function astToFlowEdges(
  ast: { nodes: INode[]; edges: IEdge[] },
  cleanAst = true
): WorkflowEdge[] {
  const allEdges: WorkflowEdge[] = ast.edges.map(toFlowEdge)

  function collectFromGroups(nodes: INode[]) {
    for (const node of nodes) {
      const isGroup = (node as any).isGroupNode === true
      if (isGroup && (node as any).nodes?.length > 0) {
        allEdges.push(...((node as any).edges || []).map(toFlowEdge))
        collectFromGroups((node as any).nodes)
      }
    }
  }

  collectFromGroups(ast.nodes)

  // 验证并过滤无效边
  const { validEdges, invalidEdges } = validateEdgesDetailed(
    allEdges,
    ast.nodes,
    EDGE_VALIDATION_RULES
  )

  // 清理 AST 中的无效边
  if (invalidEdges.length > 0 && cleanAst) {
    const invalidIds = new Set(invalidEdges.map(({ edge }) => edge.id))
    ast.edges = ast.edges.filter(e => !invalidIds.has(e.id || ''))

    // 递归清理分组内的无效边
    function cleanGroups(nodes: INode[]) {
      for (const node of nodes) {
        const isGroup = (node as any).isGroupNode === true
        if (isGroup && (node as any).edges) {
          ;(node as any).edges = (node as any).edges.filter(
            (e: IEdge) => !invalidIds.has(e.id || '')
          )
          if ((node as any).nodes?.length > 0) {
            cleanGroups((node as any).nodes)
          }
        }
      }
    }
    cleanGroups(ast.nodes)

    console.warn(
      `[astToFlowEdges] 已清理 ${invalidEdges.length} 条无效边:`,
      invalidEdges.map(({ edge, errors }) => ({ id: edge.id, errors }))
    )
  }

  return validEdges as WorkflowEdge[]
}

/**
 * 转换单个节点
 *
 * 注意：返回的节点对象必须是可扩展的，因为 React Flow 会在运行时
 * 修改节点的 width/height 等属性。使用展开运算符确保创建新对象。
 */
function toFlowNode<T extends INode>(node: T, isEntryNode = false, isEndNode = false): WorkflowNode<T> {
  const isGroup = (node as any).isGroupNode === true
  return {
    id: node.id,
    type: isGroup ? 'GroupNode' : node.type,
    position: node.position ? { ...node.position } : { x: 0, y: 0 },
    data: {
      ...node,
      isEntryNode,
      isEndNode,
    } as T & { isEntryNode: boolean; isEndNode: boolean },
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
