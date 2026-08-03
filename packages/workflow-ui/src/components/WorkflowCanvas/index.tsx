'use client'
import React, { useCallback, useImperativeHandle, forwardRef, useMemo, useRef, useEffect } from 'react'
import {
  ReactFlowProvider,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'

import { fromJson, createWorkflowGraphAst } from '@sker/workflow'
import type { WorkflowGraphAst } from '@sker/workflow'
import { createNodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useCanvasControls } from './useCanvasControls'
import { useCanvasState } from './useCanvasState'
import { useWorkflowOperations } from './useWorkflowOperations'
import { useFileOperations } from './hooks/useFileOperations'
import { useNodeOperations } from './hooks/useNodeOperations'
import { WorkflowOperationsContext } from '../../context/workflow-operations'
import { cn } from '../../utils/cn'

// 拆分后的子组件与 Hooks
import { CanvasFlow } from './CanvasFlow'
import { CanvasControls } from './CanvasControls'
import { CanvasOverlays } from './CanvasOverlays'
import { useCanvasEnvironment } from './useCanvasEnvironment'
import { useEventStoreToggle } from './useEventStoreToggle'
import { useCanvasTimeTravel } from './useCanvasTimeTravel'
import { useCanvasConnections } from './useCanvasConnections'
import { useCanvasInteraction } from './useCanvasInteraction'
import { useCanvasImperativeApi } from './useCanvasImperativeApi'
import { useCanvasEventHandlers } from './useCanvasEventHandlers'
import { useCanvasKeyboardShortcuts } from './useCanvasKeyboardShortcuts'
import { useCanvasWorkflowOps } from './useCanvasWorkflowOps'
import { useCanvasSaveSubWorkflow } from './useCanvasSaveSubWorkflow'
import { useCanvasRenderProps } from './useCanvasRenderProps'

// 公共 API 类型（保持向后兼容）
import type { WorkflowCanvasRef, WorkflowCanvasProps } from './types'
export type { WorkflowCanvasRef, WorkflowCanvasProps } from './types'

/**
 * 工作流画布内部组件
 *
 * 职责：包含所有需要访问 ReactFlow 上下文的逻辑（画布组合）
 */
const WorkflowCanvasInner = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>(({
  workflowAst,
  showMiniMap = true,
  showControls = true,
  useMenubar = false,
  showBackground = true,
  snapToGrid = false,
  className = '',
  name = 'default',
  onSave: customOnSave
}, ref) => {
  // 缓存 nodeTypes 避免每次渲染都创建新对象导致 React Flow 重新初始化节点
  const nodeTypes = useMemo(() => createNodeTypes(), [])

  const { getViewport, setViewport } = useReactFlow()
  const updateNodeInternals = useUpdateNodeInternals()

  // 自动保存触发器 ref - 用于在 useWorkflow 回调中调用
  const triggerSaveRef = useRef<(() => void) | null>(null)

  const workflow = useWorkflow(
    workflowAst
      ? fromJson<WorkflowGraphAst>({ ...workflowAst, name })
      : createWorkflowGraphAst({ name }),
    {
      onWorkflowChange: () => {
        triggerSaveRef.current?.()
      }
    }
  )

  const { triggerSave } = useAutoSave(workflow.workflowAst, {
    debounce: 1000,
    enabled: true,
    onSaveSuccess: useCallback(() => {}, []),
    onSaveError: useCallback((error: Error) => {
      console.error('[AutoSave] 保存失败:', error)
    }, []),
    getViewport
  })

  useEffect(() => {
    triggerSaveRef.current = triggerSave
  }, [triggerSave])

  const handleViewportChange = useCallback(() => {
    triggerSave()
  }, [triggerSave])

  // 状态管理
  const canvasState = useCanvasState()
  const canvasControls = useCanvasControls()
  const { isRunning, isSaving, showToast, openSettingPanel, openEdgeConfigDialog, openDrawer, openSubWorkflowModal, openRunConfigDialog } = canvasState

  // 撤销/重做历史（直接从 workflow 实例获取）
  const { canUndo, canRedo, undo, redo } = workflow

  // 环境状态（明暗主题、全局鼠标位置、事件存储开关、时间旅行）
  const { isDark, lastMousePosition } = useCanvasEnvironment()
  const { eventStoreEnabled, handleEventStoreToggle } = useEventStoreToggle()
  const timeTravel = useCanvasTimeTravel(workflow)

  // 业务逻辑钩子 - 正确在组件顶层调用
  const fileOperations = useFileOperations(workflow, {
    onShowToast: showToast,
    onGetViewport: getViewport,
    onFitView: canvasControls.handleFitView
  })

  const nodeOperations = useNodeOperations(workflow, {
    onShowToast: showToast,
    onFitView: canvasControls.handleFitView
  })

  const workflowOperations = useWorkflowOperations(workflow, {
    onShowToast: showToast,
    onSetRunning: canvasState.setIsRunning,
    onSetSaving: canvasState.setIsSaving,
    getViewport,
  })

  // 包装 saveSubWorkflow，保存后刷新节点端口
  const saveSubWorkflow = useCanvasSaveSubWorkflow(workflowOperations.saveSubWorkflow, updateNodeInternals)

  // 事件处理统一委托
  useCanvasEventHandlers({
    workflow,
    openSubWorkflowModal,
    openSettingPanel,
    openEdgeConfigDialog,
    openDrawer,
    copyNodes: nodeOperations.copyNodes,
    pasteNodes: nodeOperations.pasteNodes,
  })

  // 恢复视图窗口状态
  useEffect(() => {
    if (workflow.workflowAst.viewport) {
      const { x, y, zoom } = workflow.workflowAst.viewport
      setViewport({ x, y, zoom }, { duration: 0 })
    }
  }, [workflow.workflowAst, setViewport])

  // 连线逻辑
  const connections = useCanvasConnections({
    workflow,
    showToast,
    screenToFlowPosition: canvasControls.screenToFlowPosition,
    openNodeSelector: canvasControls.openNodeSelector,
    nodeSelectorFlowPosition: canvasControls.nodeSelector.flowPosition,
  })

  // 通用交互事件与派生状态
  const interaction = useCanvasInteraction({
    workflow,
    showToast,
    screenToFlowPosition: canvasControls.screenToFlowPosition,
    openEdgeConfigDialog,
    edgeConfigDialog: canvasState.edgeConfigDialog,
    processImportFile: fileOperations.processImportFile,
    openRunConfigDialog,
    runWorkflow: workflowOperations.runWorkflow,
    saveWorkflow: workflowOperations.saveWorkflow,
    handleEventStoreToggle,
  })

  // 键盘快捷键
  useCanvasKeyboardShortcuts({
    customOnSave,
    workflowName: workflow.workflowAst?.name,
    saveWorkflow: workflowOperations.saveWorkflow,
    cancelWorkflow: workflowOperations.cancelWorkflow,
    undo,
    redo,
    copyNodes: nodeOperations.copyNodes,
    cutNodes: nodeOperations.cutNodes,
    pasteNodes: nodeOperations.pasteNodes,
    deleteSelection: nodeOperations.deleteSelection,
    handleSelectAll: canvasControls.handleSelectAll,
    createGroup: nodeOperations.createGroup,
    ungroupNodes: nodeOperations.ungroupNodes,
    collapseNodes: nodeOperations.collapseNodes,
    expandNodes: nodeOperations.expandNodes,
    autoLayout: nodeOperations.autoLayout,
    screenToFlowPosition: canvasControls.screenToFlowPosition,
    lastMousePosition,
  })

  // 暴露命令式 API
  const imperativeApi = useCanvasImperativeApi({
    workflow,
    getViewport,
    runWorkflow: workflowOperations.runWorkflow,
    cancelWorkflow: workflowOperations.cancelWorkflow,
    runNode: workflowOperations.runNode,
    runNodeIsolated: workflowOperations.runNodeIsolated,
    autoLayout: nodeOperations.autoLayout,
    handleFitView: canvasControls.handleFitView,
    handleZoomIn: canvasControls.handleZoomIn,
    handleZoomOut: canvasControls.handleZoomOut,
    handleCenterView: canvasControls.handleCenterView,
    handleLocateNode: canvasControls.handleLocateNode,
    handleSelectAll: canvasControls.handleSelectAll,
    deleteSelection: nodeOperations.deleteSelection,
    copyNodes: nodeOperations.copyNodes,
    pasteNodes: nodeOperations.pasteNodes,
    showToast,
  })
  useImperativeHandle(ref, () => imperativeApi, [imperativeApi])

  // 准备工作流操作上下文
  const workflowOps = useCanvasWorkflowOps(workflow, openSubWorkflowModal, canvasControls.onNodeClick)

  const isCanvasEmpty = workflow.nodes.length === 0
  const workflowName = workflow.workflowAst?.name
  const workflowId = workflow.workflowAst?.id

  // 渲染属性适配（业务 Hook → 展示组件 props）
  const { flowProps, controlsProps, overlaysActions, overlaysStructural } = useCanvasRenderProps({
    workflow,
    nodeTypes,
    edgeTypes,
    canvasState,
    canvasControls,
    nodeOperations,
    fileOperations,
    workflowOperations,
    connections,
    interaction,
    showControls,
    useMenubar,
    isDark,
    showBackground,
    showMiniMap,
    snapToGrid,
    customOnSave,
    isCanvasEmpty,
    isRunning,
    isSaving,
    workflowName,
    workflowId,
    canUndo,
    canRedo,
    undo,
    redo,
    handleViewportChange,
    handleEventStoreToggle,
    triggerSave,
    saveSubWorkflow,
    eventStoreEnabled,
  })

  return (
    <WorkflowOperationsContext.Provider value={workflowOps}>
      <div
        className={cn(
          'workflow-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#111318] text-white',
          className
        )}
      >
        <CanvasFlow {...flowProps} />
        <CanvasControls {...controlsProps} />
        <CanvasOverlays
          canvasState={canvasState}
          workflow={workflow}
          {...overlaysStructural}
          actions={overlaysActions}
          timeTravel={timeTravel}
          eventStoreEnabled={eventStoreEnabled}
        />
      </div>
    </WorkflowOperationsContext.Provider>
  )
})

WorkflowCanvasInner.displayName = 'WorkflowCanvasInner'

/**
 * 工作流画布组件 - 外层容器
 *
 * 职责：提供 ReactFlowProvider 上下文
 * 优雅设计：最小化的包装，仅负责提供必要的上下文
 */
export const WorkflowCanvas = forwardRef<WorkflowCanvasRef, WorkflowCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  )
})

WorkflowCanvas.displayName = 'WorkflowCanvas'
