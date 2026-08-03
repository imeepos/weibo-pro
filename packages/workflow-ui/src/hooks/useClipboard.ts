import { useState, useCallback } from 'react'
import type { WorkflowNode, WorkflowEdge } from '../types'
import type { XYPosition } from '@xyflow/react'
import {
  nodesWithSize,
  filterRelevantEdges,
  buildSystemClipboardData,
  isWorkflowNodesData,
  computeBoundingBoxCenter,
  cloneNodes,
  cloneEdges,
  type SystemClipboardData,
} from './clipboard-utils'

interface ClipboardState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  operation: 'copy' | 'cut' | null
  boundingBox?: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
    centerX: number
    centerY: number
  }
}

export interface UseClipboardReturn {
  copyNodes: (nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId?: string, workflowName?: string) => void
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

async function readSystemWorkflowData(): Promise<SystemClipboardData | null> {
  try {
    console.log('[useClipboard.pasteNodes] 尝试从系统剪贴板读取...')
    const text = await navigator.clipboard.readText()
    console.log('[useClipboard.pasteNodes] 系统剪贴板内容长度:', text.length)
    console.log('[useClipboard.pasteNodes] 原始内容前100字符:', text.substring(0, 100))
    console.log('[useClipboard.pasteNodes] 原始内容:', text)

    const data = JSON.parse(text) as SystemClipboardData
    console.log('[useClipboard.pasteNodes] 解析后的数据:', data)

    if (!isWorkflowNodesData(data)) {
      console.log('[useClipboard.pasteNodes] 系统剪贴板数据格式无效，不是工作流节点数据')
      return null
    }
    return data
  } catch (error) {
    console.log('[useClipboard.pasteNodes] 系统剪贴板读取失败，错误:', error)
    console.log('[useClipboard.pasteNodes] 回退到内存剪贴板')
    return null
  }
}

export function useClipboard(): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    nodes: [],
    edges: [],
    operation: null,
  })

  const copyNodes = useCallback(async (nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId?: string, workflowName?: string) => {
    if (nodes.length === 0) return

    // 只保留选中节点之间的边
    const relevantEdges = filterRelevantEdges(nodes, edges)

    console.log('[useClipboard.copyNodes]')
    console.log('  节点数量:', nodes.length)
    console.log('  边数量:', relevantEdges.length)

    // 保存节点时包含尺寸信息（用于粘贴时计算包围盒）
    const nodesWithSizeArray = nodesWithSize(nodes)

    setClipboard({
      nodes: structuredClone(nodesWithSizeArray) as any,
      edges: structuredClone(relevantEdges),
      operation: 'copy',
    })

    // 写入系统剪贴板（支持跨工作流粘贴）
    try {
      const clipboardData = buildSystemClipboardData(nodesWithSizeArray, relevantEdges, workflowId, workflowName)
      const json = JSON.stringify(clipboardData)
      console.log('[useClipboard.copyNodes] 写入系统剪贴板，JSON长度:', json.length)
      console.log('[useClipboard.copyNodes] JSON内容前100字符:', json.substring(0, 100))
      await navigator.clipboard.writeText(json)
      console.log('[useClipboard.copyNodes] 已写入系统剪贴板')
    } catch (error) {
      console.warn('[useClipboard.copyNodes] 写入系统剪贴板失败:', error)
    }
  }, [])

  const cutNodes = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    if (nodes.length === 0) return

    const relevantEdges = filterRelevantEdges(nodes, edges)
    const nodesWithSizeArray = nodesWithSize(nodes)

    setClipboard({
      nodes: structuredClone(nodesWithSizeArray) as any,
      edges: structuredClone(relevantEdges),
      operation: 'cut',
    })
  }, [])

  const pasteNodes = useCallback(
    async (
      position: XYPosition,
      onPaste: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
    ) => {
      // 优先尝试从系统剪贴板读取（支持跨工作流粘贴）
      const systemData = await readSystemWorkflowData()
      if (systemData) {
        console.log('[useClipboard.pasteNodes] 从系统剪贴板粘贴')
        if (systemData.sourceWorkflowName) {
          console.log('  来源工作流:', systemData.sourceWorkflowName)
        }

        const boundingBoxCenter = computeBoundingBoxCenter(systemData.nodes)
        const { newNodes, idMap } = cloneNodes(systemData.nodes, position, boundingBoxCenter)
        const newEdges = cloneEdges(systemData.edges || [], idMap)

        console.log('[useClipboard.pasteNodes] 粘贴完成')
        console.log('  新节点数量:', newNodes.length)
        console.log('  新边数量:', newEdges.length)

        // 更新内存剪贴板
        setClipboard({
          nodes: structuredClone(systemData.nodes) as any,
          edges: structuredClone(systemData.edges || []) as any,
          operation: 'copy',
        })

        onPaste(newNodes, newEdges)
        return
      }

      // 回退到内存剪贴板
      if (clipboard.nodes.length === 0) return

      console.log('[useClipboard.pasteNodes] 从内存剪贴板粘贴')
      console.log('  节点数量:', clipboard.nodes.length)
      console.log('  边数量:', clipboard.edges.length)
      console.log('  鼠标位置 X:', position.x)
      console.log('  鼠标位置 Y:', position.y)

      const boundingBoxCenter = computeBoundingBoxCenter(clipboard.nodes)
      const { newNodes, idMap } = cloneNodes(clipboard.nodes, position, boundingBoxCenter)
      const newEdges = cloneEdges(clipboard.edges, idMap)

      console.log('[useClipboard.pasteNodes] 生成完成')
      console.log('  新节点数量:', newNodes.length)
      console.log('  新边数量:', newEdges.length)

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
