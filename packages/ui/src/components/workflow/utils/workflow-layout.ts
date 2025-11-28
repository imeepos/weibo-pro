import type { Node, Edge } from '@xyflow/react'

export interface LayoutOptions {
  direction?: 'horizontal' | 'vertical'
  spacing?: number
  nodeWidth?: number
  nodeHeight?: number
}

export function createWorkflowLayout(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): Node[] {
  const {
    direction = 'horizontal',
    spacing = 100,
    nodeWidth = 120,
    nodeHeight = 80,
  } = options

  // 简单的层次布局算法
  const levels: Record<number, Node[]> = {}
  const nodeLevels: Record<string, number> = {}

  // 找到起始节点（没有输入边的节点）
  const startNodes = nodes.filter(
    (node) => !edges.some((edge) => edge.target === node.id)
  )

  // 为起始节点分配层级 0
  startNodes.forEach((node, index) => {
    nodeLevels[node.id] = 0
    if (!levels[0]) levels[0] = []
    levels[0].push(node)
  })

  // 为其他节点分配层级
  let changed = true
  while (changed) {
    changed = false

    for (const edge of edges) {
      const sourceLevel = nodeLevels[edge.source]
      const targetLevel = nodeLevels[edge.target]

      if (sourceLevel !== undefined && targetLevel === undefined) {
        const targetNode = nodes.find((node) => node.id === edge.target)
        if (targetNode) {
          nodeLevels[edge.target] = sourceLevel + 1
          const levelKey = sourceLevel + 1
          if (!levels[levelKey]) levels[levelKey] = []
          levels[levelKey]?.push(targetNode)
          changed = true
        }
      }
    }
  }

  // 计算位置
  const positionedNodes: Node[] = []

  Object.keys(levels).forEach((levelStr) => {
    const level = parseInt(levelStr)
    const levelNodes = levels[level]

    levelNodes?.forEach((node, index) => {
      const x = direction === 'horizontal'
        ? level * (nodeWidth + spacing)
        : index * (nodeWidth + spacing)

      const y = direction === 'horizontal'
        ? index * (nodeHeight + spacing)
        : level * (nodeHeight + spacing)

      positionedNodes.push({
        ...node,
        position: { x, y },
      })
    })
  })

  return positionedNodes
}

export function calculateBoundingBox(nodes: Node[]): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const node of nodes) {
    const nodeWidth = node.width || 120
    const nodeHeight = node.height || 80

    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + nodeWidth)
    maxY = Math.max(maxY, node.position.y + nodeHeight)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function centerNodesInViewport(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number; zoom: number } {
  const bbox = calculateBoundingBox(nodes)

  if (bbox.width === 0 || bbox.height === 0) {
    return { x: 0, y: 0, zoom: 1 }
  }

  // 计算缩放比例
  const scaleX = viewportWidth / (bbox.width + 100)
  const scaleY = viewportHeight / (bbox.height + 100)
  const zoom = Math.min(scaleX, scaleY, 1)

  // 计算居中位置
  const centerX = bbox.minX + bbox.width / 2
  const centerY = bbox.minY + bbox.height / 2

  const x = viewportWidth / 2 - centerX * zoom
  const y = viewportHeight / 2 - centerY * zoom

  return { x, y, zoom }
}