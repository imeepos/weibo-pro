import { WorkflowGraphAst, fromJson, toJson } from '@sker/workflow'
import { validateEdges } from './edgeValidator'

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
