import { WorkflowGraphAst, INode } from '@sker/workflow'

/**
 * 统计工作流信息
 */
export function getWorkflowStats(workflow: WorkflowGraphAst): {
  nodeCount: number
  edgeCount: number
  nodeTypeDistribution: Record<string, number>
  maxDepth: number
  hasCircularDependency: boolean
} {
  const nodeCount = workflow.nodes.length
  const edgeCount = workflow.edges.length

  // 节点类型分布
  const nodeTypeDistribution: Record<string, number> = {}
  workflow.nodes.forEach((node: any) => {
    const typeName = node.constructor.name
    nodeTypeDistribution[typeName] = (nodeTypeDistribution[typeName] || 0) + 1
  })

  // 计算最大深度（使用拓扑排序）
  let maxDepth = 0
  const adjacencyList = new Map<string, string[]>()
  const inDegree = new Map<string, number>()

  workflow.nodes.forEach((node: any) => {
    adjacencyList.set(node.id, [])
    inDegree.set(node.id, 0)
  })

  workflow.edges.forEach((edge: any) => {
    adjacencyList.get(edge.source)?.push(edge.target)
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
  })

  const queue: Array<{ nodeId: string; depth: number }> = []
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push({ nodeId, depth: 0 })
    }
  })

  let processedCount = 0
  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!
    processedCount++
    maxDepth = Math.max(maxDepth, depth)

    adjacencyList.get(nodeId)?.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        queue.push({ nodeId: neighbor, depth: depth + 1 })
      }
    })
  }

  const hasCircularDependency = processedCount !== nodeCount

  return {
    nodeCount,
    edgeCount,
    nodeTypeDistribution,
    maxDepth,
    hasCircularDependency
  }
}

/**
 * 查找工作流中的孤立节点（没有任何连接的节点）
 */
export function findIsolatedNodes(workflow: WorkflowGraphAst): INode[] {
  const connectedNodeIds = new Set<string>()

  workflow.edges.forEach((edge: any) => {
    connectedNodeIds.add(edge.source)
    connectedNodeIds.add(edge.target)
  })

  return workflow.nodes.filter((node: any) => !connectedNodeIds.has(node.id))
}

/**
 * 查找工作流的入口节点（没有输入连接的节点）
 */
export function findEntryNodes(workflow: WorkflowGraphAst): INode[] {
  const nodesWithInput = new Set<string>()

  workflow.edges.forEach((edge: any) => {
    nodesWithInput.add(edge.target)
  })

  return workflow.nodes.filter((node: any) => !nodesWithInput.has(node.id))
}

/**
 * 查找工作流的出口节点（没有输出连接的节点）
 */
export function findExitNodes(workflow: WorkflowGraphAst): INode[] {
  const nodesWithOutput = new Set<string>()

  workflow.edges.forEach((edge: any) => {
    nodesWithOutput.add(edge.source)
  })

  return workflow.nodes.filter((node: any) => !nodesWithOutput.has(node.id))
}
