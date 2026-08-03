import { useCallback } from 'react'
import { addNode as astAddNode, addEdge as astAddEdge } from '@sker/workflow'
import { useClipboard } from '../../../hooks/useClipboard'
import type { WorkflowNode, WorkflowEdge } from '../../../types'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'
import { useNodeSelection } from './useNodeSelection'

export interface NodeClipboardOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

/**
 * 节点剪贴板操作子 Hook
 *
 * 负责：复制 / 剪切 / 粘贴选中的节点与边。
 */
export function useNodeClipboardOperations(workflow: UseWorkflowReturn, options: NodeClipboardOptions = {}) {
  const { onShowToast } = options
  const clipboard = useClipboard()
  const { getSelectedNodes, getSelectedNodesEdges } = useNodeSelection(workflow)

  // 复制选中的节点
  const copyNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const selectedEdges = getSelectedNodesEdges()

    console.log('[copyNodes] 开始复制', {
      nodeCount: selectedNodes.length,
      edgeCount: selectedEdges.length,
      nodes: selectedNodes.map((n) => ({ id: n.id, type: n.data?.type })),
      edges: selectedEdges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
    })

    if (selectedNodes.length > 0) {
      // 传递工作流 ID 和名称到剪贴板（支持跨工作流粘贴）
      clipboard.copyNodes(selectedNodes, selectedEdges, workflow.workflowAst.id, workflow.workflowAst.name)
      console.log(`已复制 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条边`)
      onShowToast?.('info', '复制成功', `已复制 ${selectedNodes.length} 个节点`)
    } else {
      console.log('[copyNodes] 没有选中的节点')
      onShowToast?.('info', '没有选中节点', '请先选择要复制的节点')
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, onShowToast, workflow.workflowAst.id, workflow.workflowAst.name])

  // 剪切选中的节点
  const cutNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 0) {
      const selectedEdges = getSelectedNodesEdges()
      clipboard.cutNodes(selectedNodes, selectedEdges)
      // 删除原节点
      selectedNodes.forEach((node) => workflow.removeNode(node.id))
      console.log(`已剪切 ${selectedNodes.length} 个节点`)
      onShowToast?.('info', '剪切成功', `已剪切 ${selectedNodes.length} 个节点`)
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, workflow, onShowToast])

  // 粘贴节点
  const pasteNodes = useCallback((targetPosition?: { x: number; y: number }) => {
    console.log('[pasteNodes] 开始粘贴', {
      hasMemoryClipboard: clipboard.hasClipboard,
      clipboardCount: clipboard.clipboardCount,
      targetPosition
    })

    // 移除过早的剪贴板检查，让 pasteNodes 函数自己处理
    // 它会先尝试系统剪贴板（支持跨工作流粘贴），失败后回退到内存剪贴板

    // 如果没有指定位置，使用默认位置（略微偏移避免完全重叠）
    const flowPosition = targetPosition || { x: 100, y: 100 }

    clipboard.pasteNodes(flowPosition, (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      console.log('[pasteNodes] 收到节点和边', {
        nodeCount: newNodes.length,
        edgeCount: newEdges.length,
        nodes: newNodes.map(n => ({ id: n.id, type: n.data?.type })),
        edges: newEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
      })

      // 如果没有节点和边，说明剪贴板真的为空
      if (newNodes.length === 0) {
        onShowToast?.('info', '剪贴板为空', '请先复制或剪切节点')
        return
      }

      // 直接将节点添加到 AST（node.data 即 AST 对象）
      newNodes.forEach((node) => {
        console.log('[pasteNodes] 添加节点到 AST', {
          id: node.id,
          type: node.data?.type,
          uiPosition: node.position,
          astPositionBefore: { ...node.data.position }
        })
        // 创建新的 AST 对象，包含新位置（不可变更新）
        const astNode = Object.assign(
          Object.create(Object.getPrototypeOf(node.data)),
          node.data,
          { position: node.position }
        )
        console.log('[pasteNodes] AST position 已同步', {
          id: node.id,
          astPositionAfter: astNode.position
        })
        workflow.workflowAst.nodes = astAddNode(workflow.workflowAst.nodes, astNode)
      })

      // 将边添加到 AST
      newEdges.forEach((edge) => {
        if (edge.data?.edge) {
          console.log('[pasteNodes] 添加边到 AST', {
            id: edge.data.edge.id,
            from: edge.data.edge.from,
            to: edge.data.edge.to
          })
          workflow.workflowAst.edges = astAddEdge(workflow.workflowAst.nodes, workflow.workflowAst.edges, edge.data.edge)
        }
      })

      console.log('[pasteNodes] AST 同步前', {
        astNodes: workflow.workflowAst.nodes.length,
        astEdges: workflow.workflowAst.edges.length
      })

      // 从 AST 同步到 UI（一次性重建节点和边）
      workflow.syncFromAst()

      console.log('[pasteNodes] AST 同步后', {
        uiNodes: workflow.nodes.length,
        uiEdges: workflow.edges.length
      })

      const message = targetPosition
        ? `已粘贴到鼠标位置 (${Math.round(flowPosition.x)}, ${Math.round(flowPosition.y)})`
        : `已粘贴 ${newNodes.length} 个节点和 ${newEdges.length} 条边`

      console.log(message)
      onShowToast?.('success', '粘贴成功', message)
    })
  }, [clipboard, workflow, onShowToast])

  return {
    getSelectedNodes,
    getSelectedNodesEdges,
    copyNodes,
    cutNodes,
    pasteNodes,
    hasClipboard: clipboard.hasClipboard,
  }
}
