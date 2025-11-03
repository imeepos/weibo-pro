import type { Ast, IDataEdge, IControlEdge, INode, IEdge } from '@sker/workflow'
import { isDataEdge, isControlEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import { getNodeMetadata } from './metadata'
import { Type } from '@sker/core'

/**
 * 将 WorkflowGraphAst 转换为 React Flow 格式
 */
export function astToFlow(
  nodes: INode[],
  edges: IEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: nodes.map(toFlowNode),
    edges: edges.map((edge, index) => toFlowEdge(edge, index)),
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
  return ast.edges.map((edge, index) => toFlowEdge(edge, index))
}

/**
 * 转换单个节点
 */
function toFlowNode(node: INode): WorkflowNode {
  const nodeClass = resolveNodeClass(node)
  const metadata = getNodeMetadata(nodeClass)

  return {
    id: node.id,
    type: 'workflow-node',
    position: { x: 0, y: 0 }, // 需要布局算法或从持久化位置加载
    data: {
      ast: node as Ast,
      nodeClass,
      label: metadata.label,
      state: node.state,
      error: (node as any).error,
    },
  }
}

/**
 * 转换单个边
 */
function toFlowEdge(edge: IEdge, index: number): WorkflowEdge {
  if (isDataEdge(edge)) {
    return toDataEdge(edge, index)
  }
  if (isControlEdge(edge)) {
    return toControlEdge(edge, index)
  }
  throw new Error('Unknown edge type')
}

/**
 * 转换数据边
 */
function toDataEdge(edge: IDataEdge, index: number): WorkflowEdge {
  return {
    id: `data-${index}-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.fromProperty || null,
    targetHandle: edge.toProperty || null,
    type: 'workflow-data-edge',
    data: {
      edgeType: 'data',
      edge,
      fromProperty: edge.fromProperty,
      toProperty: edge.toProperty,
      weight: edge.weight,
    },
  }
}

/**
 * 转换控制边
 */
function toControlEdge(edge: IControlEdge, index: number): WorkflowEdge {
  return {
    id: `control-${index}-${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    type: 'workflow-control-edge',
    data: {
      edgeType: 'control',
      edge,
      condition: edge.condition,
    },
  }
}

/**
 * 解析节点类构造器
 *
 * 通过节点实例的 type 属性匹配对应的类构造器
 */
function resolveNodeClass(node: INode): Type<any> {
  // 从 node.type 推断节点类
  // 这里需要一个注册表来维护 type → class 的映射
  // 暂时返回一个通用的构造器标记
  const constructor = (node as any).constructor
  if (constructor && constructor !== Object) {
    return constructor
  }

  // 如果无法从实例获取构造器，需要通过类型查找
  throw new Error(
    `Cannot resolve node class for type "${node.type}". ` +
    `Node must be instantiated from a registered @Node() class.`
  )
}
