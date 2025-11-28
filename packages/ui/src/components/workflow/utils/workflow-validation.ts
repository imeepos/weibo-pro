import type { Node, Edge } from '@xyflow/react'

export interface ValidationError {
  type: 'error' | 'warning'
  message: string
  nodeId?: string
  edgeId?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export function validateWorkflow(
  nodes: Node[],
  edges: Edge[]
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // 检查节点
  for (const node of nodes) {
    // 检查节点是否有 ID
    if (!node.id || node.id.trim() === '') {
      errors.push({
        type: 'error',
        message: '节点缺少 ID',
        nodeId: node.id,
      })
    }

    // 检查节点位置
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push({
        type: 'error',
        message: '节点位置无效',
        nodeId: node.id,
      })
    }

    // 检查节点类型
    if (!node.type || node.type.trim() === '') {
      errors.push({
        type: 'error',
        message: '节点类型无效',
        nodeId: node.id,
      })
    }
  }

  // 检查边
  for (const edge of edges) {
    // 检查边是否有 ID
    if (!edge.id || edge.id.trim() === '') {
      errors.push({
        type: 'error',
        message: '边缺少 ID',
        edgeId: edge.id,
      })
    }

    // 检查源节点是否存在
    const sourceNode = nodes.find((node) => node.id === edge.source)
    if (!sourceNode) {
      errors.push({
        type: 'error',
        message: `源节点 "${edge.source}" 不存在`,
        edgeId: edge.id,
      })
    }

    // 检查目标节点是否存在
    const targetNode = nodes.find((node) => node.id === edge.target)
    if (!targetNode) {
      errors.push({
        type: 'error',
        message: `目标节点 "${edge.target}" 不存在`,
        edgeId: edge.id,
      })
    }

    // 检查自环
    if (edge.source === edge.target) {
      warnings.push({
        type: 'warning',
        message: '边连接同一个节点（自环）',
        edgeId: edge.id,
      })
    }

    // 检查重复边
    const duplicateEdges = edges.filter(
      (e) => e.source === edge.source && e.target === edge.target && e.id !== edge.id
    )
    if (duplicateEdges.length > 0) {
      warnings.push({
        type: 'warning',
        message: '存在重复的连接',
        edgeId: edge.id,
      })
    }
  }

  // 检查孤立节点
  for (const node of nodes) {
    const connectedEdges = edges.filter(
      (edge) => edge.source === node.id || edge.target === node.id
    )

    if (connectedEdges.length === 0) {
      warnings.push({
        type: 'warning',
        message: '节点没有连接',
        nodeId: node.id,
      })
    }
  }

  // 检查循环依赖
  const cycles = detectCycles(nodes, edges)
  if (cycles.length > 0) {
    errors.push({
      type: 'error',
      message: `检测到 ${cycles.length} 个循环依赖`,
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

function detectCycles(nodes: Node[], edges: Edge[]): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const graph = buildGraph(nodes, edges)

  function dfs(nodeId: string, path: string[]): void {
    if (recursionStack.has(nodeId)) {
      // 找到循环
      const cycleStart = path.indexOf(nodeId)
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart))
      }
      return
    }

    if (visited.has(nodeId)) {
      return
    }

    visited.add(nodeId)
    recursionStack.add(nodeId)

    const neighbors = graph.get(nodeId) || []
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, nodeId])
    }

    recursionStack.delete(nodeId)
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, [])
    }
  }

  return cycles
}

function buildGraph(nodes: Node[], edges: Edge[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()

  for (const node of nodes) {
    graph.set(node.id, [])
  }

  for (const edge of edges) {
    const neighbors = graph.get(edge.source) || []
    neighbors.push(edge.target)
    graph.set(edge.source, neighbors)
  }

  return graph
}

export function getValidationSummary(result: ValidationResult): {
  status: 'valid' | 'warning' | 'error'
  message: string
} {
  if (!result.isValid) {
    return {
      status: 'error',
      message: `发现 ${result.errors.length} 个错误`,
    }
  }

  if (result.warnings.length > 0) {
    return {
      status: 'warning',
      message: `发现 ${result.warnings.length} 个警告`,
    }
  }

  return {
    status: 'valid',
    message: '工作流验证通过',
  }
}