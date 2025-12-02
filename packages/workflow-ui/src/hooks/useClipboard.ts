import { useState, useCallback } from 'react'
import { generateId } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../types'
import type { XYPosition } from '@xyflow/react'

interface ClipboardState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  operation: 'copy' | 'cut' | null
}

export interface UseClipboardReturn {
  copyNodes: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  cutNodes: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  pasteNodes: (
    position: XYPosition,
    onPaste: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
  ) => void
  clearClipboard: () => void
  hasClipboard: boolean
  clipboardCount: number
  isCutOperation: boolean
}

export function useClipboard(): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    nodes: [],
    edges: [],
    operation: null,
  })

  const copyNodes = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    if (nodes.length === 0) return

    // 只保留选中节点之间的边
    const nodeIds = new Set(nodes.map((n) => n.id))
    const relevantEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )

    console.log('[useClipboard.copyNodes]', {
      nodeCount: nodes.length,
      edgeCount: relevantEdges.length,
      nodes: nodes.map(n => ({ id: n.id, position: n.position })),
      edges: relevantEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
    })

    setClipboard({
      nodes: structuredClone(nodes),
      edges: structuredClone(relevantEdges),
      operation: 'copy',
    })
  }, [])

  const cutNodes = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    if (nodes.length === 0) return

    const nodeIds = new Set(nodes.map((n) => n.id))
    const relevantEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )

    setClipboard({
      nodes: structuredClone(nodes),
      edges: structuredClone(relevantEdges),
      operation: 'cut',
    })
  }, [])

  const pasteNodes = useCallback(
    (
      position: XYPosition,
      onPaste: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
    ) => {
      console.log('[useClipboard.pasteNodes] 开始粘贴', {
        hasNodes: clipboard.nodes.length > 0,
        nodeCount: clipboard.nodes.length,
        edgeCount: clipboard.edges.length,
        targetPosition: position,
        原始节点位置: clipboard.nodes.map(n => ({ id: n.id, pos: n.position }))
      })

      if (clipboard.nodes.length === 0) return

      // 计算原始节点的中心点
      const originalCenter = clipboard.nodes.reduce(
        (acc, node) => ({
          x: acc.x + node.position.x / clipboard.nodes.length,
          y: acc.y + node.position.y / clipboard.nodes.length,
        }),
        { x: 0, y: 0 }
      )

      console.log('[useClipboard.pasteNodes] 中心点计算', {
        原始中心点: originalCenter,
        目标位置: position,
        偏移: {
          x: position.x - originalCenter.x,
          y: position.y - originalCenter.y
        }
      })

      // 创建旧ID到新ID的映射
      const idMap = new Map<string, string>()
      clipboard.nodes.forEach((node) => {
        idMap.set(node.id, generateId())
      })

      console.log('[useClipboard.pasteNodes] ID 映射', Array.from(idMap.entries()))

      // 克隆节点，生成新ID，调整位置
      const newNodes: WorkflowNode[] = clipboard.nodes.map((node) => {
        const newId = idMap.get(node.id)!
        const offsetX = node.position.x - originalCenter.x
        const offsetY = node.position.y - originalCenter.y

        const newPosition = {
          x: position.x + offsetX,
          y: position.y + offsetY,
        }

        console.log('[useClipboard.pasteNodes] 节点位置计算', {
          原始位置: node.position,
          相对中心偏移: { x: offsetX, y: offsetY },
          新位置: newPosition
        })

        // 深拷贝 AST 对象并更新 ID
        const clonedData = structuredClone(node.data)
        clonedData.id = newId

        return {
          ...node,
          id: newId,
          position: newPosition,
          data: clonedData,
          selected: false,
        }
      })

      // 克隆边，更新节点引用（包括 AST 边对象）
      const newEdges: WorkflowEdge[] = clipboard.edges.map((edge) => {
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

      console.log('[useClipboard.pasteNodes] 生成的新节点和边', {
        newNodes: newNodes.map(n => ({ id: n.id, position: n.position })),
        newEdges: newEdges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          astFrom: e.data?.edge?.from,
          astTo: e.data?.edge?.to
        }))
      })

      onPaste(newNodes, newEdges)

      // 如果是剪切操作，清空剪贴板
      if (clipboard.operation === 'cut') {
        setClipboard({ nodes: [], edges: [], operation: null })
      }
    },
    [clipboard]
  )

  const clearClipboard = useCallback(() => {
    setClipboard({ nodes: [], edges: [], operation: null })
  }, [])

  return {
    copyNodes,
    cutNodes,
    pasteNodes,
    clearClipboard,
    hasClipboard: clipboard.nodes.length > 0,
    clipboardCount: clipboard.nodes.length,
    isCutOperation: clipboard.operation === 'cut',
  }
}
