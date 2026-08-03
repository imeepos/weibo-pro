import { useCallback, useMemo } from 'react'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { IEdge } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../../types'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'

export interface UseCanvasInteractionParams {
  workflow: UseWorkflowReturn
  showToast: (type: ToastType, title: string, message?: string) => void
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number }
  openEdgeConfigDialog: (edge: IEdge) => void
  edgeConfigDialog: { visible: boolean; edge: IEdge | null }
  processImportFile: (file: File, isCanvasEmpty: boolean) => Promise<unknown>
  openRunConfigDialog: (defaultInputs?: Record<string, unknown>) => void
  runWorkflow: (inputs?: Record<string, unknown>) => Promise<unknown>
  saveWorkflow: (name: string, onComplete?: () => void) => Promise<void>
  handleEventStoreToggle: (enabled: boolean) => void
}

export interface CanvasExecutionProgress {
  total: number
  completed: number
  failed: number
  currentNodeName: string | undefined
}

/**
 * 画布交互事件 Hook
 *
 * 集中管理画布上的通用事件处理与派生状态：
 * - 节点/边变更与删除
 * - 边双击/右键菜单
 * - 文件拖拽
 * - 边配置、工作流设置保存
 * - 运行相关（输入检测、调试运行）
 * - 执行进度与 MiniMap 节点颜色
 */
export function useCanvasInteraction({
  workflow,
  showToast,
  screenToFlowPosition,
  openEdgeConfigDialog,
  edgeConfigDialog,
  processImportFile,
  openRunConfigDialog,
  runWorkflow,
  saveWorkflow,
  handleEventStoreToggle,
}: UseCanvasInteractionParams) {
  // 处理连线（节点/边变更）
  const handleNodesChangeInternal = useCallback((changes: NodeChange[]) => {
    workflow.onNodesChange(changes)
  }, [workflow])

  const handleEdgesChangeInternal = useCallback((changes: EdgeChange[]) => {
    workflow.onEdgesChange(changes)
  }, [workflow])

  const handleNodesDelete = useCallback((nodesToDelete: WorkflowNode[]) => {
    nodesToDelete.forEach((node) => workflow.removeNode(node.id))
  }, [workflow])

  const handleEdgesDelete = useCallback((edgesToDelete: WorkflowEdge[]) => {
    edgesToDelete.forEach((edge) => workflow.removeEdge(edge))
  }, [workflow])

  // 边事件处理
  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: WorkflowEdge) => {
    // 直接打开边配置对话框
    const astEdge = workflow.workflowAst.edges.find((e) => e.id === edge.id)
    if (astEdge) {
      openEdgeConfigDialog(astEdge)
    }
  }, [workflow.workflowAst.edges, openEdgeConfigDialog])

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: WorkflowEdge) => {
    event.preventDefault()
    console.log('[handleEdgeContextMenu] 右键边:', edge.id)
    // 打开右键菜单
    const screenPosition = { x: event.clientX, y: event.clientY }
    const _flowPosition = screenToFlowPosition(screenPosition)

    // 使用 useCanvasControls 的 menu 系统
    const customEvent = new CustomEvent('edge-context-menu', {
      detail: { edgeId: edge.id, event },
    })
    window.dispatchEvent(customEvent)
  }, [screenToFlowPosition])

  // 拖拽处理
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const files = Array.from(event.dataTransfer.files)
    const jsonFile = files.find((file) => file.name.endsWith('.json'))

    if (jsonFile) {
      const isCanvasEmpty = workflow.nodes.length === 0
      await processImportFile(jsonFile, isCanvasEmpty)
    } else if (files.length > 0) {
      showToast('error', '文件类型错误', '请拖拽 JSON 格式的工作流文件')
    }
  }, [processImportFile, workflow.nodes.length, showToast])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  // 边配置处理
  const handleSaveEdgeConfig = useCallback((edgeConfig: any) => {
    if (!edgeConfigDialog.edge) return

    const edgeId = edgeConfigDialog.edge.id

    // 不可变更新 AST 中的边
    workflow.workflowAst.edges = workflow.workflowAst.edges.map((e: any) =>
      e.id === edgeId ? { ...e, ...edgeConfig } : e
    )

    workflow.setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        if (edge.id === edgeId && edge.data?.edge) {
          return {
            ...edge,
            data: {
              ...edge.data,
              edge: { ...edge.data.edge, ...edgeConfig }
            }
          }
        }
        return edge
      })
    )

    showToast('success', '边配置已更新')
  }, [edgeConfigDialog.edge, workflow, showToast])

  const handleConfigEdge = useCallback((edgeId: string) => {
    const customEvent = new CustomEvent('open-edge-config', {
      detail: { edgeId },
    })
    window.dispatchEvent(customEvent)
  }, [])

  // 工作流设置
  const handleSaveWorkflowSettings = useCallback(async (settings: any) => {
    if (settings.name) {
      workflow.workflowAst.name = settings.name
    }
    if (settings.description !== undefined) {
      workflow.workflowAst.description = settings.description
    }
    if (settings.color) {
      workflow.workflowAst.color = settings.color
    }
    if (settings.tags !== undefined) {
      workflow.workflowAst.tags = settings.tags
    }

    // 保存到后端
    await saveWorkflow(settings.name || workflow.workflowAst.name)

    showToast('success', '工作流设置已保存', `已更新工作流 "${settings.name || '未命名'}" 的属性`)
  }, [workflow, showToast, saveWorkflow])

  /**
   * 检测工作流是否有需要配置的输入节点
   * 优雅设计：只要有入度为 0 的起始节点，就认为需要配置
   */
  const hasConfigurableInputs = useCallback(() => {
    return !!(workflow.workflowAst?.entryNodeIds && workflow.workflowAst.entryNodeIds.length > 0)
  }, [workflow])

  /**
   * 处理工作流运行
   * 优雅设计：自动检测是否需要配置输入，提供流畅的用户体验
   */
  const handleRunWorkflow = useCallback(() => {
    if (hasConfigurableInputs()) {
      openRunConfigDialog()
    } else {
      runWorkflow()
    }
  }, [hasConfigurableInputs, openRunConfigDialog, runWorkflow])

  /**
   * 调试运行工作流
   * 自动开启事件存储并运行工作流
   */
  const handleDebugRun = useCallback(() => {
    handleEventStoreToggle(true)
    handleRunWorkflow()
  }, [handleEventStoreToggle, handleRunWorkflow])

  // 执行进度计算
  const executionProgress: CanvasExecutionProgress = useMemo(() => {
    const nodes = workflow.workflowAst?.nodes || []
    const total = nodes.length
    const completed = nodes.filter(n => n.state === 'success' || n.state === 'fail').length
    const failed = nodes.filter(n => n.state === 'fail').length
    const runningNode = nodes.find(n => n.state === 'running')

    return {
      total,
      completed,
      failed,
      currentNodeName: runningNode?.title || runningNode?.name,
    }
  }, [workflow.workflowAst?.nodes])

  // MiniMap 节点颜色映射
  const getMiniMapNodeColor = useCallback((node: any) => {
    const status = node.data?.state
    if (!status || status === 'pending') {
      return 'hsl(var(--muted-foreground))'
    }

    const statusColors: Record<string, string> = {
      running: 'hsl(var(--node-running))',
      emitting: 'hsl(var(--node-emitting))',
      success: 'hsl(var(--node-success))',
      fail: 'hsl(var(--node-error))',
    }

    return statusColors[status] || 'hsl(var(--muted-foreground))'
  }, [])

  return {
    handleNodesChangeInternal,
    handleEdgesChangeInternal,
    handleNodesDelete,
    handleEdgesDelete,
    handleEdgeDoubleClick,
    handleEdgeContextMenu,
    handleDrop,
    handleDragOver,
    handleSaveEdgeConfig,
    handleConfigEdge,
    handleSaveWorkflowSettings,
    hasConfigurableInputs,
    handleRunWorkflow,
    handleDebugRun,
    executionProgress,
    getMiniMapNodeColor,
  }
}
