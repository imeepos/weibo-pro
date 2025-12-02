import { useCallback } from 'react'
import { WorkflowGraphAst } from '@sker/workflow'
import { useClipboard } from '../../../hooks/useClipboard'
import type { WorkflowNode, WorkflowEdge } from '../../../types'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'

export interface NodeOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onFitView?: () => void
}

export const useNodeOperations = (workflow: UseWorkflowReturn, options: NodeOperationsOptions = {}) => {
  const { onShowToast, onFitView } = options
  const clipboard = useClipboard()

  // 获取选中的节点
  const getSelectedNodes = useCallback((): WorkflowNode[] => {
    return workflow.nodes.filter((node) => node.selected)
  }, [workflow.nodes])

  // 获取选中节点相关的边
  const getSelectedNodesEdges = useCallback((): WorkflowEdge[] => {
    const selectedNodeIds = new Set(
      workflow.nodes.filter((node) => node.selected).map((node) => node.id)
    )
    return workflow.edges.filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )
  }, [workflow.nodes, workflow.edges])

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
      clipboard.copyNodes(selectedNodes, selectedEdges)
      console.log(`已复制 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条边`)
      onShowToast?.('info', '复制成功', `已复制 ${selectedNodes.length} 个节点`)
    } else {
      console.log('[copyNodes] 没有选中的节点')
      onShowToast?.('info', '没有选中节点', '请先选择要复制的节点')
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, onShowToast])

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
      hasClipboard: clipboard.hasClipboard,
      clipboardCount: clipboard.clipboardCount,
      targetPosition
    })

    if (!clipboard.hasClipboard) {
      console.log('[pasteNodes] 剪贴板为空，跳过粘贴')
      onShowToast?.('info', '剪贴板为空', '请先复制或剪切节点')
      return
    }

    // 如果没有指定位置，使用默认位置（略微偏移避免完全重叠）
    const flowPosition = targetPosition || { x: 100, y: 100 }

    clipboard.pasteNodes(flowPosition, (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      console.log('[pasteNodes] 收到节点和边', {
        nodeCount: newNodes.length,
        edgeCount: newEdges.length,
        nodes: newNodes.map(n => ({ id: n.id, type: n.data?.type })),
        edges: newEdges.map(e => ({ id: e.id, source: e.source, target: e.target }))
      })

      // 直接将节点添加到 AST（node.data 即 AST 对象）
      newNodes.forEach((node) => {
        console.log('[pasteNodes] 添加节点到 AST', {
          id: node.id,
          type: node.data?.type,
          uiPosition: node.position,
          astPositionBefore: { ...node.data.position }
        })
        // 将 UI 层计算的新位置同步到 AST 对象
        node.data.position = node.position
        console.log('[pasteNodes] AST position 已同步', {
          id: node.id,
          astPositionAfter: node.data.position
        })
        workflow.workflowAst.addNode(node.data)
      })

      // 将边添加到 AST
      newEdges.forEach((edge) => {
        if (edge.data?.edge) {
          console.log('[pasteNodes] 添加边到 AST', {
            id: edge.data.edge.id,
            from: edge.data.edge.from,
            to: edge.data.edge.to
          })
          workflow.workflowAst.addEdge(edge.data.edge)
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

  // 删除选中的节点和边
  const deleteSelection = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const selectedEdges = workflow.edges.filter((edge) => edge.selected)

    selectedNodes.forEach((node) => workflow.removeNode(node.id))
    selectedEdges.forEach((edge) => workflow.removeEdge(edge.id))

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      console.log(
        `已删除 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条边`
      )
      onShowToast?.('info', '删除成功', `已删除 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条边`)
    }
  }, [getSelectedNodes, workflow, onShowToast])

  // 切换选中节点的折叠状态
  const toggleCollapseSelection = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) return

    workflow.setNodes((nodes) =>
      nodes.map((node) =>
        node.selected
          ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
          : node
      )
    )
  }, [getSelectedNodes, workflow])

  /**
   * 创建分组
   *
   * 将选中的节点组织为一个分组（WorkflowGraphAst）
   */
  const createGroup = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) {
      onShowToast?.('error', '请先选择节点', '至少选择一个节点才能创建分组')
      return
    }

    const selectedNodeIds = selectedNodes.map((n) => n.id)
    const groupId = workflow.createGroup(selectedNodeIds)

    if (groupId) {
      onShowToast?.('success', '分组创建成功', `已将 ${selectedNodes.length} 个节点组织为分组`)
    }
  }, [getSelectedNodes, workflow, onShowToast])

  /**
   * 解散分组
   *
   * 如果选中的节点是分组，则解散它
   */
  const ungroupNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) {
      onShowToast?.('error', '请先选择分组', '请选择要解散的分组节点')
      return
    }

    const groupNodes = selectedNodes.filter(
      (node) => node.data instanceof WorkflowGraphAst && node.data.isGroup
    )

    if (groupNodes.length === 0) {
      onShowToast?.('error', '未选中分组', '选中的节点中没有分组')
      return
    }

    groupNodes.forEach((groupNode) => {
      workflow.ungroupNodes(groupNode.id)
    })

    onShowToast?.('success', '分组已解散', `已解散 ${groupNodes.length} 个分组`)
  }, [getSelectedNodes, workflow, onShowToast])

  // 删除单个节点（右键菜单）
  const deleteNode = useCallback((nodeId: string) => {
    workflow.removeNode(nodeId)
    onShowToast?.('info', '删除成功', '节点已删除')
  }, [workflow, onShowToast])

  // 切换单个节点折叠状态
  const toggleNodeCollapse = useCallback((nodeId: string) => {
    workflow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
          : node
      )
    )
  }, [workflow])

  /**
   * 折叠节点（智能模式）
   *
   * - 有选中：仅折叠选中的
   * - 无选中：折叠全部
   */
  const collapseNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const targetNodeIds = selectedNodes.length > 0
      ? selectedNodes.map((n) => n.id)
      : undefined

    workflow.collapseNodes(targetNodeIds)

    onShowToast?.(
      'success',
      '折叠完成',
      selectedNodes.length > 0
        ? `已折叠 ${selectedNodes.length} 个节点`
        : '已折叠所有节点'
    )
  }, [getSelectedNodes, workflow, onShowToast])

  /**
   * 展开节点（智能模式）
   *
   * - 有选中：仅展开选中的
   * - 无选中：展开全部
   */
  const expandNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const targetNodeIds = selectedNodes.length > 0
      ? selectedNodes.map((n) => n.id)
      : undefined

    workflow.expandNodes(targetNodeIds)

    onShowToast?.(
      'success',
      '展开完成',
      selectedNodes.length > 0
        ? `已展开 ${selectedNodes.length} 个节点`
        : '已展开所有节点'
    )
  }, [getSelectedNodes, workflow, onShowToast])

  /**
   * 自动布局
   *
   * 使用 Dagre 算法重新排列节点
   */
  const autoLayout = useCallback(() => {
    workflow.autoLayout()

    // 布局后自动适应视图
    if (onFitView) {
      setTimeout(() => {
        onFitView()
      }, 100)
    }

    onShowToast?.('success', '布局完成', '已根据拓扑结构重新排列节点')
  }, [workflow, onFitView, onShowToast])

  // 删除单个边（右键菜单）
  const deleteEdge = useCallback((edgeId: string) => {
    workflow.removeEdge(edgeId)
    onShowToast?.('info', '删除成功', '边已删除')
  }, [workflow, onShowToast])

  // 清空画布
  const clearCanvas = useCallback(() => {
    if (workflow.nodes.length === 0) return

    const confirmed = window.confirm('确定要清空画布吗？此操作无法撤销。')
    if (confirmed) {
      workflow.clearWorkflow()
      onShowToast?.('info', '清空成功', '画布已清空')
    }
  }, [workflow, onShowToast])

  return {
    // 选择相关
    getSelectedNodes,
    getSelectedNodesEdges,

    // 剪贴板操作
    copyNodes,
    cutNodes,
    pasteNodes,

    // 删除操作
    deleteSelection,
    deleteNode,
    deleteEdge,
    clearCanvas,

    // 折叠展开
    toggleCollapseSelection,
    toggleNodeCollapse,
    collapseNodes,
    expandNodes,

    // 分组操作
    createGroup,
    ungroupNodes,

    // 布局
    autoLayout,

    // 剪贴板状态
    hasClipboard: clipboard.hasClipboard
  }
}