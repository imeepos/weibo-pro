import type { EdgeValidationResult, ConnectionParams } from '../types'

/**
 * 验证连线是否有效
 *
 * 规则：
 * 1. 只能从输出端口（source）连接到输入端口（target）
 * 2. 不能自己连接自己
 * 3. 输入端口只能有一条入边（除非标记为 isMulti）
 */
export function validateConnection(
  connection: ConnectionParams,
  existingEdges: any[],
  nodes: any[]
): EdgeValidationResult {
  // 规则 1: 不能自己连接自己
  if (connection.source === connection.target) {
    return {
      valid: false,
      reason: '节点不能连接到自身',
    }
  }

  // 规则 2: 必须指定具体的端口
  if (!connection.sourceHandle || !connection.targetHandle) {
    return {
      valid: false,
      reason: '必须连接到具体的输入/输出端口',
    }
  }

  // 规则 3: 检查目标端口是否已有连接（非 multi 输入）
  const targetNode = nodes.find((n: any) => n.id === connection.target)
  if (!targetNode) {
    return { valid: false, reason: '目标节点不存在' }
  }

  // 检查该输入端口是否为 isMulti
  const targetMetadata = targetNode.data
  // 这里需要通过元数据判断 isMulti，暂时简化处理

  const existingConnection = existingEdges.find(
    (edge: any) =>
      edge.target === connection.target &&
      edge.targetHandle === connection.targetHandle
  )

  if (existingConnection) {
    // TODO: 检查 isMulti 元数据
    // 暂时允许多连接
  }

  return { valid: true }
}

/**
 * 检测循环依赖
 */
export function detectCycle(
  sourceId: string,
  targetId: string,
  edges: any[]
): boolean {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  function dfs(nodeId: string): boolean {
    if (recStack.has(nodeId)) return true
    if (visited.has(nodeId)) return false

    visited.add(nodeId)
    recStack.add(nodeId)

    const outgoingEdges = edges.filter((e: any) => e.source === nodeId)
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) return true
    }

    recStack.delete(nodeId)
    return false
  }

  // 模拟添加新边后检测
  const testEdges = [...edges, { source: sourceId, target: targetId }]
  return dfs(sourceId)
}
