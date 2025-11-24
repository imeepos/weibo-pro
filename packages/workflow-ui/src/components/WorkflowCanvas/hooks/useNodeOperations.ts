import { useCallback } from 'react'
import { findNodeType, WorkflowGraphAst } from '@sker/workflow'
import { useClipboard } from '../../../hooks/useClipboard'

export interface NodeOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

export const useNodeOperations = (workflow: any, options: NodeOperationsOptions = {}) => {
  const { onShowToast, onFitView } = options
  const clipboard = useClipboard()

  // 获取选中的节点
  const getSelectedNodes = useCallback(() => {
    return workflow.nodes.filter((node: any) => node.selected)
  }, [workflow.nodes])

  // 获取选中节点相关的边
  const getSelectedNodesEdges = useCallback(() => {
    const selectedNodeIds = new Set(
      workflow.nodes.filter((node: any) => node.selected).map((node: any) => node.id)
    )
    return workflow.edges.filter(
      (edge: any) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )
  }, [workflow.nodes, workflow.edges])

  // 复制选中的节点
  const copyNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 0) {
      const selectedEdges = getSelectedNodesEdges()
      clipboard.copyNodes(selectedNodes, selectedEdges)
      console.log(`已复制 ${selectedNodes.length} 个节点`)
      onShowToast?.('info', '复制成功', `已复制 ${selectedNodes.length} 个节点`)
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, onShowToast])

  // 剪切选中的节点
  const cutNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 0) {
      const selectedEdges = getSelectedNodesEdges()
      clipboard.cutNodes(selectedNodes, selectedEdges)
      // 删除原节点
      selectedNodes.forEach((node: any) => workflow.removeNode(node.id))
      console.log(`已剪切 ${selectedNodes.length} 个节点`)
      onShowToast?.('info', '剪切成功', `已剪切 ${selectedNodes.length} 个节点`)
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, workflow, onShowToast])

  // 粘贴节点
  const pasteNodes = useCallback((targetPosition?: { x: number; y: number }) => {
    if (!clipboard.hasClipboard) return

    // 获取粘贴位置
    const flowPosition = targetPosition || { x: 100, y: 100 }

    clipboard.pasteNodes(flowPosition, (newNodes: any[], newEdges: any[]) => {
      // 将新节点添加到工作流
      newNodes.forEach((node) => {
        workflow.addNode(findNodeType(node.data.type), node.position, node.data.label)
      })

      // 将新边添加到工作流（AST + UI）
      newEdges.forEach((edge) => {
        if (edge.data?.edge) {
          // 同步到 AST
          workflow.workflowAst.addEdge(edge.data.edge)
        }
      })

      // 同步到 UI
      workflow.setEdges((currentEdges: any[]) => [...currentEdges, ...newEdges])

      console.log(`已粘贴 ${newNodes.length} 个节点和 ${newEdges.length} 条边`)
      onShowToast?.('success', '粘贴成功', `已粘贴 ${newNodes.length} 个节点`)
    })
  }, [clipboard, workflow, onShowToast])

  // 删除选中的节点和边
  const deleteSelection = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const selectedEdges = workflow.edges.filter((edge: any) => edge.selected)

    selectedNodes.forEach((node: any) => workflow.removeNode(node.id))
    selectedEdges.forEach((edge: any) => workflow.removeEdge(edge.id))

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

    workflow.setNodes((nodes: any[]) =>
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

    const selectedNodeIds = selectedNodes.map((n: any) => n.id)
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
      (node: any) => node.data instanceof WorkflowGraphAst && node.data.isGroup
    )

    if (groupNodes.length === 0) {
      onShowToast?.('error', '未选中分组', '选中的节点中没有分组')
      return
    }

    groupNodes.forEach((groupNode: any) => {
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
    workflow.setNodes((nodes: any[]) =>
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
      ? selectedNodes.map((n: any) => n.id)
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
      ? selectedNodes.map((n: any) => n.id)
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

export interface NodeOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onFitView?: () => void
}