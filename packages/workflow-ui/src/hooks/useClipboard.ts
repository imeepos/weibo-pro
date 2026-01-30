import { useState, useCallback } from 'react'
import { generateId, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowNode, WorkflowEdge } from '../types'
import type { XYPosition } from '@xyflow/react'

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

// 系统剪贴板数据格式
interface SystemClipboardData {
  version: '1.0'
  type: 'workflow-nodes'
  nodes: any[]
  edges: any[]
  sourceWorkflowId?: string
  sourceWorkflowName?: string
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

export function useClipboard(): UseClipboardReturn {
  const [clipboard, setClipboard] = useState<ClipboardState>({
    nodes: [],
    edges: [],
    operation: null,
  })

  const copyNodes = useCallback(async (nodes: WorkflowNode[], edges: WorkflowEdge[], workflowId?: string, workflowName?: string) => {
    if (nodes.length === 0) return

    // 只保留选中节点之间的边
    const nodeIds = new Set(nodes.map((n) => n.id))
    const relevantEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )

    console.log('[useClipboard.copyNodes]')
    console.log('  节点数量:', nodes.length)
    console.log('  边数量:', relevantEdges.length)

    // 保存节点时包含尺寸信息（用于粘贴时计算包围盒）
    const nodesWithSize = nodes.map(node => ({
      ...node,
      // 保存实际尺寸，如果没有则使用默认值
      _width: node.width || node.measured?.width || 280,
      _height: node.height || node.measured?.height || 120,
    }))

    setClipboard({
      nodes: structuredClone(nodesWithSize) as any,
      edges: structuredClone(relevantEdges),
      operation: 'copy',
    })

    // 写入系统剪贴板（支持跨工作流粘贴）
    try {
      const clipboardData: SystemClipboardData = {
        version: '1.0',
        type: 'workflow-nodes',
        nodes: nodesWithSize,
        edges: relevantEdges,
        sourceWorkflowId: workflowId,
        sourceWorkflowName: workflowName,
      }
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

    const nodeIds = new Set(nodes.map((n) => n.id))
    const relevantEdges = edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )

    // 保存节点时包含尺寸信息（用于粘贴时计算包围盒）
    const nodesWithSize = nodes.map(node => ({
      ...node,
      _width: node.width || node.measured?.width || 280,
      _height: node.height || node.measured?.height || 120,
    }))

    setClipboard({
      nodes: structuredClone(nodesWithSize) as any,
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
      try {
        console.log('[useClipboard.pasteNodes] 尝试从系统剪贴板读取...')
        const text = await navigator.clipboard.readText()
        console.log('[useClipboard.pasteNodes] 系统剪贴板内容长度:', text.length)
        console.log('[useClipboard.pasteNodes] 原始内容前100字符:', text.substring(0, 100))
        console.log('[useClipboard.pasteNodes] 原始内容:', text)

        const data = JSON.parse(text) as SystemClipboardData
        console.log('[useClipboard.pasteNodes] 解析后的数据:', data)

        // 验证是否是工作流节点数据
        if (data?.version === '1.0' && data?.type === 'workflow-nodes' && Array.isArray(data.nodes)) {
          console.log('[useClipboard.pasteNodes] 从系统剪贴板粘贴')
          if (data.sourceWorkflowName) {
            console.log('  来源工作流:', data.sourceWorkflowName)
          }

          // 计算包围盒
          const positions = data.nodes.map((node: any) => ({
            x: node.position.x,
            y: node.position.y,
            width: node._width || 280,
            height: node._height || 120,
          }))

          const minX = Math.min(...positions.map(p => p.x))
          const maxX = Math.max(...positions.map(p => p.x + p.width))
          const minY = Math.min(...positions.map(p => p.y))
          const maxY = Math.max(...positions.map(p => p.y + p.height))

          const boundingBoxCenter = {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
          }

          // 创建旧ID到新ID的映射
          const idMap = new Map<string, string>()
          data.nodes.forEach((node) => {
            idMap.set(node.id, generateId())
          })

          // 克隆节点，生成新ID，调整位置
          const compiler = root.get(Compiler)
          const newNodes: WorkflowNode[] = data.nodes.map((node: any) => {
            const newId = idMap.get(node.id)!
            const offsetX = node.position.x - boundingBoxCenter.x
            const offsetY = node.position.y - boundingBoxCenter.y
            const newPosition = {
              x: position.x + offsetX,
              y: position.y + offsetY,
            }

            // 深拷贝 AST 对象并更新 ID
            const clonedData = structuredClone(node.data || node)
            clonedData.id = newId
            clonedData.position = newPosition

            // 重新编译以恢复 metadata 字段
            const compiledData = compiler.compile(clonedData)

            // 清除临时尺寸属性
            const { _width, _height, ...cleanNode } = node

            return {
              ...cleanNode,
              id: newId,
              position: newPosition,
              data: compiledData,
              selected: false,
            }
          })

          // 克隆边，更新节点引用
          const newEdges: WorkflowEdge[] = (data.edges || []).map((edge) => {
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

          console.log('[useClipboard.pasteNodes] 粘贴完成')
          console.log('  新节点数量:', newNodes.length)
          console.log('  新边数量:', newEdges.length)

          // 更新内存剪贴板
          setClipboard({
            nodes: structuredClone(data.nodes) as any,
            edges: structuredClone(data.edges || []) as any,
            operation: 'copy',
          })

          onPaste(newNodes, newEdges)
          return
        } else {
          console.log('[useClipboard.pasteNodes] 系统剪贴板数据格式无效，不是工作流节点数据')
        }
      } catch (error) {
        // 系统剪贴板读取失败或数据无效，回退到内存剪贴板
        console.log('[useClipboard.pasteNodes] 系统剪贴板读取失败，错误:', error)
        console.log('[useClipboard.pasteNodes] 回退到内存剪贴板')
      }

      // 回退到内存剪贴板
      if (clipboard.nodes.length === 0) return

      console.log('[useClipboard.pasteNodes] 从内存剪贴板粘贴')
      console.log('  节点数量:', clipboard.nodes.length)
      console.log('  边数量:', clipboard.edges.length)
      console.log('  鼠标位置 X:', position.x)
      console.log('  鼠标位置 Y:', position.y)

      // 粘贴时计算包围盒（根据剪贴板中保存的位置和尺寸）
      const positions = clipboard.nodes.map((node: any) => ({
        x: node.position.x,
        y: node.position.y,
        width: node._width || 280,
        height: node._height || 120,
      }))

      const minX = Math.min(...positions.map(p => p.x))
      const maxX = Math.max(...positions.map(p => p.x + p.width))
      const minY = Math.min(...positions.map(p => p.y))
      const maxY = Math.max(...positions.map(p => p.y + p.height))

      // 包围盒中心
      const boundingBoxCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
      }

      console.log('[useClipboard.pasteNodes] 包围盒计算')
      console.log('  包围盒 minX:', minX)
      console.log('  包围盒 maxX:', maxX)
      console.log('  包围盒 minY:', minY)
      console.log('  包围盒 maxY:', maxY)
      console.log('  包围盒宽度:', maxX - minX)
      console.log('  包围盒高度:', maxY - minY)
      console.log('  包围盒中心 X:', boundingBoxCenter.x)
      console.log('  包围盒中心 Y:', boundingBoxCenter.y)
      console.log('  鼠标位置 X:', position.x)
      console.log('  鼠标位置 Y:', position.y)
      console.log('  偏移量 X:', position.x - boundingBoxCenter.x)
      console.log('  偏移量 Y:', position.y - boundingBoxCenter.y)

      // 创建旧ID到新ID的映射
      const idMap = new Map<string, string>()
      clipboard.nodes.forEach((node) => {
        idMap.set(node.id, generateId())
      })

      // 克隆节点，生成新ID，调整位置
      const compiler = root.get(Compiler)
      const newNodes: WorkflowNode[] = clipboard.nodes.map((node: any, i) => {
        const newId = idMap.get(node.id)!

        // 计算节点相对于包围盒中心的偏移
        const offsetX = node.position.x - boundingBoxCenter.x
        const offsetY = node.position.y - boundingBoxCenter.y

        // 新位置 = 鼠标位置 + 相对偏移
        const newPosition = {
          x: position.x + offsetX,
          y: position.y + offsetY,
        }

        console.log(`[useClipboard.pasteNodes] 节点[${i}]位置计算`)
        console.log(`  原始位置 X:`, node.position.x)
        console.log(`  原始位置 Y:`, node.position.y)
        console.log(`  相对包围盒中心偏移 X:`, offsetX)
        console.log(`  相对包围盒中心偏移 Y:`, offsetY)
        console.log(`  新位置 X:`, newPosition.x)
        console.log(`  新位置 Y:`, newPosition.y)

        // 深拷贝 AST 对象并更新 ID
        const clonedData = structuredClone(node.data)
        clonedData.id = newId
        clonedData.position = newPosition

        // 重新编译以恢复 metadata 字段
        const compiledData = compiler.compile(clonedData)

        // 清除临时尺寸属性
        const { _width, _height, ...cleanNode } = node

        return {
          ...cleanNode,
          id: newId,
          position: newPosition,
          data: compiledData,
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
