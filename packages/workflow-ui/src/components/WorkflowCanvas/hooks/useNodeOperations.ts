import { useCallback } from 'react'
import type { UseWorkflowReturn } from '../../../hooks/useWorkflow'
import { useNodeClipboardOperations } from './useNodeClipboardOperations'
import { useNodeSelection } from './useNodeSelection'

export interface NodeOperationsOptions {
  onShowToast?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
  onFitView?: () => void
}

export const useNodeOperations = (workflow: UseWorkflowReturn, options: NodeOperationsOptions = {}) => {
  const { onShowToast, onFitView } = options
  const clipboardOps = useNodeClipboardOperations(workflow, options)
  const { getSelectedNodes } = useNodeSelection(workflow)

  const {
    getSelectedNodesEdges,
    copyNodes,
    cutNodes,
    pasteNodes,
    hasClipboard,
  } = clipboardOps

  // 删除选中的节点和边
  const deleteSelection = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const selectedEdges = workflow.edges.filter((edge) => edge.selected)

    selectedNodes.forEach((node) => workflow.removeNode(node.id))
    selectedEdges.forEach((edge) => workflow.removeEdge(edge.id))
  }, [getSelectedNodes, workflow])

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
      (node) => node.type === 'GroupNode'
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
    hasClipboard
  }
}
