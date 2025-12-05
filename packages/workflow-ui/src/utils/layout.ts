import dagre from 'dagre'
import type { WorkflowNode, WorkflowEdge } from '../types'

/**
 * 计算节点高度
 *
 * 根据节点的折叠状态和端口数量动态计算高度
 */
function calculateNodeHeight(node: WorkflowNode): number {
  const headerHeight = 56  // 头部高度（标题区域）
  const portRowHeight = 24 // 每个端口行高度
  const padding = 8        // 上下内边距

  if (node.data.collapsed) {
    return headerHeight + padding
  }

  try {
    // ✅ 直接使用 metadata 字段，node.data 已经是编译后的 INode
    const metadata = node.data.metadata
    if (!metadata) {
      console.warn('[layout] 节点缺少 metadata，使用默认高度', { nodeId: node.id })
      return headerHeight + (2 * portRowHeight) + padding
    }

    const portRows = Math.max(metadata.inputs.length, metadata.outputs.length)
    return headerHeight + (portRows * portRowHeight) + padding
  } catch (error) {
    // 如果获取元数据失败，返回默认高度
    console.error('[layout] 计算节点高度失败', error)
    return headerHeight + (2 * portRowHeight) + padding
  }
}

/**
 * 使用 Dagre 算法计算工作流布局
 *
 * 基于有向图的层级布局，保持拓扑结构的同时紧凑排列节点
 *
 * @param nodes 工作流节点数组
 * @param edges 工作流边数组
 * @returns 节点 ID 到新位置的映射
 */
export function calculateDagreLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()

  // 设置图布局参数
  g.setGraph({
    rankdir: 'TB',        // Top to Bottom（从上到下）
    nodesep: 80,          // 同层级节点的水平间距
    ranksep: 120,         // 不同层级间的垂直间距
    marginx: 50,          // 左右边距
    marginy: 50,          // 上下边距
    align: 'UL',          // 节点对齐方式（左上对齐）
    ranker: 'network-simplex'  // 布局算法（最优化层级分配）
  })

  g.setDefaultEdgeLabel(() => ({}))

  // 添加节点（根据折叠状态设置宽度和高度）
  nodes.forEach(node => {
    const width = node.data.collapsed ? 180 : 240
    const height = calculateNodeHeight(node)
    g.setNode(node.id, { width, height })
  })

  // 添加边
  edges.forEach(edge => {
    if (edge.source && edge.target) {
      g.setEdge(edge.source, edge.target)
    }
  })

  // 执行布局计算
  dagre.layout(g)

  // 提取节点位置（dagre 返回的是中心点坐标，需要转换为左上角坐标）
  const positions = new Map<string, { x: number; y: number }>()

  nodes.forEach(node => {
    const nodeWithPosition = g.node(node.id)
    if (nodeWithPosition) {
      positions.set(node.id, {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2
      })
    }
  })

  return positions
}
