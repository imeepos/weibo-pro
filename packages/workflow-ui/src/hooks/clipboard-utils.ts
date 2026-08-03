/**
 * useClipboard 的纯函数工具集
 */
import { generateId, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowNode, WorkflowEdge } from '../types'

// 系统剪贴板数据格式
export interface SystemClipboardData {
  version: '1.0'
  type: 'workflow-nodes'
  nodes: any[]
  edges: any[]
  sourceWorkflowId?: string
  sourceWorkflowName?: string
}

export function nodesWithSize(nodes: WorkflowNode[]): any[] {
  return nodes.map(node => ({
    ...node,
    // 保存实际尺寸，如果没有则使用默认值
    _width: node.width || node.measured?.width || 280,
    _height: node.height || node.measured?.height || 120,
  }))
}

export function filterRelevantEdges(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowEdge[] {
  const nodeIds = new Set(nodes.map((n) => n.id))
  return edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )
}

export function buildSystemClipboardData(
  nodes: any[],
  edges: any[],
  workflowId?: string,
  workflowName?: string
): SystemClipboardData {
  return {
    version: '1.0',
    type: 'workflow-nodes',
    nodes,
    edges,
    sourceWorkflowId: workflowId,
    sourceWorkflowName: workflowName,
  }
}

export function isWorkflowNodesData(data: any): data is SystemClipboardData {
  return data?.version === '1.0' && data?.type === 'workflow-nodes' && Array.isArray(data.nodes)
}

export function computeBoundingBoxCenter(nodes: any[]): { x: number; y: number } {
  const positions = nodes.map((node: any) => ({
    x: node.position.x,
    y: node.position.y,
    width: node._width || 280,
    height: node._height || 120,
  }))

  const minX = Math.min(...positions.map(p => p.x))
  const maxX = Math.max(...positions.map(p => p.x + p.width))
  const minY = Math.min(...positions.map(p => p.y))
  const maxY = Math.max(...positions.map(p => p.y + p.height))

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  }
}

export interface CloneNodesResult {
  newNodes: WorkflowNode[]
  idMap: Map<string, string>
}

export function cloneNodes(
  nodes: any[],
  position: { x: number; y: number },
  boundingBoxCenter: { x: number; y: number }
): CloneNodesResult {
  // 创建旧ID到新ID的映射
  const idMap = new Map<string, string>()
  nodes.forEach((node) => {
    idMap.set(node.id, generateId())
  })

  // 克隆节点，生成新ID，调整位置
  const compiler = root.get(Compiler)
  const newNodes: WorkflowNode[] = nodes.map((node: any) => {
    const newId = idMap.get(node.id)!
    const offsetX = node.position.x - boundingBoxCenter.x
    const offsetY = node.position.y - boundingBoxCenter.y
    const newPosition = {
      x: position.x + offsetX,
      y: position.y + offsetY,
    }

    // 深拷贝 AST 对象并更新 ID
    const clonedData = structuredClone(node.data || node)
    clonedData.id = newId
    clonedData.position = newPosition

    // 重新编译以恢复 metadata 字段
    const compiledData = compiler.compile(clonedData)

    // 清除临时尺寸属性
    const { _width, _height, ...cleanNode } = node

    return {
      ...cleanNode,
      id: newId,
      position: newPosition,
      data: compiledData,
      selected: false,
    }
  })

  return { newNodes, idMap }
}

export function cloneEdges(edges: any[], idMap: Map<string, string>): WorkflowEdge[] {
  return edges.map((edge) => {
    const newSource = idMap.get(edge.source) || edge.source
    const newTarget = idMap.get(edge.target) || edge.target
    const newEdgeId = `edge-${generateId()}`

    const newEdge: WorkflowEdge = {
      ...edge,
      id: newEdgeId,
      source: newSource,
      target: newTarget,
      selected: false,
    }

    // 更新 AST 边对象的节点引用
    if (newEdge.data?.edge) {
      newEdge.data.edge = {
        ...newEdge.data.edge,
        id: newEdgeId,
        from: newSource,
        to: newTarget,
      }
    }

    return newEdge
  })
}
