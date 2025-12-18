import type { WorkflowGraphAst } from '@sker/workflow'

/**
 * AI导出配置
 */
interface AiExportOptions {
  /** 最大文本长度（字符数） */
  maxTextLength?: number
  /** 是否包含节点位置信息 */
  includePositions?: boolean
  /** 是否包含节点状态 */
  includeStates?: boolean
}

const DEFAULT_OPTIONS: Required<AiExportOptions> = {
  maxTextLength: 100,
  includePositions: false,
  includeStates: false,
}

/**
 * 截断文本
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * 深度截断对象中的所有字符串
 */
function truncateDeep(obj: any, maxLength: number, visited = new Set()): any {
  // 防止循环引用
  if (visited.has(obj)) return '[Circular]'

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return truncateText(obj, maxLength)
  }

  if (Array.isArray(obj)) {
    return obj.map(item => truncateDeep(item, maxLength, visited))
  }

  if (typeof obj === 'object') {
    visited.add(obj)
    const result: any = {}

    for (const [key, value] of Object.entries(obj)) {
      // 跳过一些内部属性
      if (key.startsWith('_') || key === 'metadata') continue

      result[key] = truncateDeep(value, maxLength, visited)
    }

    visited.delete(obj)
    return result
  }

  return obj
}

/**
 * 简化节点数据
 */
function simplifyNode(node: any, options: Required<AiExportOptions>) {
  const simplified: any = {
    id: node.id,
    type: node.type || node.constructor?.name,
    name: node.name,
    title: node.title,
  }

  // 包含位置信息
  if (options.includePositions && node.position) {
    simplified.position = node.position
  }

  // 包含状态信息
  if (options.includeStates && node.state) {
    simplified.state = node.state
  }

  // 提取关键属性（截断长文本）
  const keyProps = ['description', 'url', 'query', 'prompt', 'code', 'expression', 'condition']
  for (const prop of keyProps) {
    if (node[prop] !== undefined && node[prop] !== null) {
      simplified[prop] = typeof node[prop] === 'string'
        ? truncateText(node[prop], options.maxTextLength)
        : node[prop]
    }
  }

  // 处理其他属性（深度截断）
  const excludeProps = new Set([
    'id', 'type', 'name', 'title', 'position', 'state',
    'description', 'url', 'query', 'prompt', 'code', 'expression', 'condition',
    'metadata', '_compiled', 'parent', 'children', 'refs'
  ])

  for (const [key, value] of Object.entries(node)) {
    if (!excludeProps.has(key) && !key.startsWith('_')) {
      simplified[key] = truncateDeep(value, options.maxTextLength, new Set())
    }
  }

  return simplified
}

/**
 * 简化边数据
 */
function simplifyEdge(edge: any) {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    fromProperty: edge.fromProperty,
    toProperty: edge.toProperty,
    condition: edge.condition ? truncateText(String(edge.condition), 50) : undefined,
    weight: edge.weight,
  }
}

/**
 * 导出工作流为AI可读格式
 *
 * 设计理念：
 * - 简洁：只保留关键信息，去除冗余数据
 * - 可读：格式化为易于AI理解的结构
 * - 截断：自动截断长文本，防止token溢出
 */
export function exportWorkflowForAi(
  workflowAst: WorkflowGraphAst,
  options: AiExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const simplified: any = {
    workflow: {
      name: workflowAst.name,
      description: workflowAst.description,
      type: 'WorkflowGraph',
    },
    nodes: workflowAst.nodes.map(node => simplifyNode(node, opts)),
    edges: workflowAst.edges.map(simplifyEdge),
    entryNodes: workflowAst.entryNodeIds || [],
    endNodes: workflowAst.endNodeIds || [],
  }

  // 统计信息
  const stats = {
    totalNodes: simplified.nodes.length,
    totalEdges: simplified.edges.length,
    nodeTypes: [...new Set(simplified.nodes.map((n: any) => n.type))],
  }

  const result = {
    meta: {
      exportedAt: new Date().toISOString(),
      exportFormat: 'ai-readable',
      maxTextLength: opts.maxTextLength,
      stats,
    },
    ...simplified,
  }

  return JSON.stringify(result, null, 2)
}

/**
 * 获取导出数据的统计信息
 */
export function getExportStats(workflowAst: WorkflowGraphAst): {
  nodeCount: number
  edgeCount: number
  nodeTypes: string[]
  estimatedSize: string
} {
  const exported = exportWorkflowForAi(workflowAst)
  const sizeInBytes = new Blob([exported]).size
  const sizeInKb = (sizeInBytes / 1024).toFixed(2)

  const nodeTypes = [...new Set(workflowAst.nodes.map(n =>
    n.type || n.constructor?.name
  ))]

  return {
    nodeCount: workflowAst.nodes.length,
    edgeCount: workflowAst.edges.length,
    nodeTypes,
    estimatedSize: `${sizeInKb} KB`,
  }
}
