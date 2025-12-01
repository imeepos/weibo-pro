import { WorkflowGraphAst, fromJson, INode, IEdge, toJson } from '@sker/workflow'
import { validateEdges } from './edgeValidator'
import type { Edge } from '@xyflow/react'

/**
 * 工作流工厂 - 提供创建和操作工作流的纯函数
 */

/**
 * 创建空白工作流
 */
export function createEmptyWorkflow(name: string = 'Untitled'): WorkflowGraphAst {
  const workflow = new WorkflowGraphAst()
  workflow.name = name
  workflow.nodes = []
  workflow.edges = []
  workflow.viewport = { x: 0, y: 0, zoom: 1 }
  return workflow
}

/**
 * 从 JSON 创建工作流（带验证和错误处理）
 */
export function createWorkflowFromJson(
  json: string | object,
  options?: {
    validateEdges?: boolean
    initializeStates?: boolean
    fallbackName?: string
  }
): { workflow: WorkflowGraphAst; errors: string[] } {
  const errors: string[] = []
  const opts = {
    validateEdges: true,
    initializeStates: true,
    fallbackName: 'Untitled',
    ...options
  }

  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json
    const workflow = fromJson<WorkflowGraphAst>(data)

    // 验证边
    if (opts.validateEdges && workflow.edges && workflow.nodes) {
      const edgesArray = Array.isArray(workflow.edges) ? workflow.edges : []
      const nodesArray = Array.isArray(workflow.nodes) ? workflow.nodes : []

      const validEdges = validateEdges(
        edgesArray as any[],
        nodesArray
      )

      if (validEdges.length !== edgesArray.length) {
        const removedCount = edgesArray.length - validEdges.length
        errors.push(`移除了 ${removedCount} 条非法连线`)
        workflow.edges = validEdges as any
      }
    }

    // 初始化状态
    if (opts.initializeStates && workflow.nodes) {
      workflow.nodes.forEach((node: any) => {
        if (!node.state) {
          node.state = 'pending'
        }
      })
    }

    // 确保工作流有名称
    if (!workflow.name) {
      workflow.name = opts.fallbackName
    }

    return { workflow, errors }
  } catch (error: any) {
    errors.push(`解析失败: ${error?.message || '未知错误'}`)
    return { workflow: createEmptyWorkflow(opts.fallbackName), errors }
  }
}

/**
 * 克隆工作流（深拷贝，重新生成 ID）
 */
export function cloneWorkflow(
  workflow: WorkflowGraphAst,
  options?: {
    newName?: string
    regenerateIds?: boolean
    offset?: { x: number; y: number }
  }
): WorkflowGraphAst {
  const opts = {
    regenerateIds: true,
    offset: { x: 50, y: 50 },
    ...options
  }

  const json = JSON.stringify(toJson(workflow))
  const cloned = fromJson<WorkflowGraphAst>(JSON.parse(json))

  if (opts.newName) {
    cloned.name = opts.newName
  }

  // 重新生成所有 ID
  if (opts.regenerateIds) {
    const idMap = new Map<string, string>()

    cloned.nodes.forEach((node: any) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substring(7)}`
      idMap.set(node.id, newId)
      node.id = newId

      // 调整位置
      if (node.position && opts.offset) {
        node.position.x += opts.offset.x
        node.position.y += opts.offset.y
      }
    })

    cloned.edges.forEach((edge: any) => {
      edge.id = `edge-${Date.now()}-${Math.random().toString(36).substring(7)}`
      edge.source = idMap.get(edge.source) || edge.source
      edge.target = idMap.get(edge.target) || edge.target
    })
  }

  return cloned
}

/**
 * 合并工作流
 */
export function mergeWorkflows(
  target: WorkflowGraphAst,
  source: WorkflowGraphAst,
  options?: {
    position?: { x: number; y: number }
    validateEdges?: boolean
  }
): WorkflowGraphAst {
  const opts = {
    position: { x: 0, y: 0 },
    validateEdges: true,
    ...options
  }

  const merged = cloneWorkflow(target, { regenerateIds: false })
  const clonedSource = cloneWorkflow(source, {
    regenerateIds: true,
    offset: opts.position
  })

  // 合并节点
  clonedSource.nodes.forEach((node: any) => {
    merged.nodes.push(node)
  })

  // 合并边
  clonedSource.edges.forEach((edge: any) => {
    merged.edges.push(edge)
  })

  // 验证合并后的边
  if (opts.validateEdges) {
    const validEdges = validateEdges(
      merged.edges as any[],
      merged.nodes
    )
    merged.edges = validEdges as any
  }

  return merged
}

/**
 * 提取子工作流
 */
export function extractSubWorkflow(
  workflow: WorkflowGraphAst,
  nodeIds: string[],
  name: string = 'Sub Workflow'
): WorkflowGraphAst {
  const nodeIdSet = new Set(nodeIds)

  // 提取节点
  const nodes = workflow.nodes.filter((node: any) => nodeIdSet.has(node.id))

  // 提取边（只包含内部连接）
  const edges = workflow.edges.filter((edge: any) =>
    nodeIdSet.has(edge.source) && nodeIdSet.has(edge.target)
  )

  // 计算边界框，重新定位节点
  if (nodes.length > 0) {
    const positions = nodes
      .map((n: any) => n.position)
      .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')

    if (positions.length > 0) {
      const minX = Math.min(...positions.map(p => p.x))
      const minY = Math.min(...positions.map(p => p.y))

      nodes.forEach((node: any) => {
        if (node.position) {
          node.position.x -= minX
          node.position.y -= minY
        }
      })
    }
  }

  const subWorkflow = new WorkflowGraphAst()
  subWorkflow.name = name
  subWorkflow.nodes = nodes
  subWorkflow.edges = edges
  subWorkflow.viewport = { x: 0, y: 0, zoom: 1 }

  return subWorkflow
}

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
