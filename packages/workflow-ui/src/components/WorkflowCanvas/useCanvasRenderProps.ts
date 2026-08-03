import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import type { WorkflowGraphAst } from '@sker/workflow'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'
import type { useCanvasState } from './useCanvasState'
import type { useCanvasControls } from './useCanvasControls'
import type { useNodeOperations } from './hooks/useNodeOperations'
import type { useFileOperations } from './hooks/useFileOperations'
import type { useWorkflowOperations } from './useWorkflowOperations'
import type { useCanvasConnections } from './useCanvasConnections'
import type { useCanvasInteraction } from './useCanvasInteraction'
import type { CanvasFlowProps } from './CanvasFlow'
import type { CanvasControlsProps } from './CanvasControls'
import type { CanvasOverlaysActions } from './CanvasOverlays'

export interface UseCanvasRenderPropsParams {
  workflow: UseWorkflowReturn
  nodeTypes: NodeTypes
  edgeTypes: EdgeTypes
  canvasState: ReturnType<typeof useCanvasState>
  canvasControls: ReturnType<typeof useCanvasControls>
  nodeOperations: ReturnType<typeof useNodeOperations>
  fileOperations: ReturnType<typeof useFileOperations>
  workflowOperations: ReturnType<typeof useWorkflowOperations>
  connections: ReturnType<typeof useCanvasConnections>
  interaction: ReturnType<typeof useCanvasInteraction>
  /** 配置项 */
  showControls: boolean
  useMenubar: boolean
  isDark: boolean
  showBackground: boolean
  showMiniMap: boolean
  snapToGrid: boolean
  customOnSave?: () => void
  isCanvasEmpty: boolean
  isRunning: boolean
  isSaving: boolean
  workflowName?: string
  workflowId?: string
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  handleViewportChange: () => void
  handleEventStoreToggle: (enabled: boolean) => void
  triggerSave: () => void
  saveSubWorkflow: (parentNodeId: string, updatedAst: WorkflowGraphAst) => string | undefined
  eventStoreEnabled: boolean
}

/**
 * 画布渲染属性适配 Hook
 *
 * 将业务 Hook 的返回值映射为纯展示组件（CanvasFlow / CanvasControls / CanvasOverlays）
 * 所需的扁平 props，使 index.tsx 保持精简，同时让展示组件保持无业务依赖。
 */
export function useCanvasRenderProps({
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
}: UseCanvasRenderPropsParams) {
  const {
    showToast,
    openAiExportDialog,
    openWorkflowSettingsDialog,
    openScheduleDialog,
    openSchedulePanel,
    openRunHistoryPanel,
  } = canvasState
  const {
    onNodeClick,
    onPaneClick,
    onPaneContextMenu,
    menu,
    closeMenu,
    nodeSelector,
    closeNodeSelector,
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleSelectAll,
    handleZoomIn,
    handleZoomOut,
    handleLocateNode,
  } = canvasControls
  const {
    createGroup,
    ungroupNodes,
    collapseNodes,
    expandNodes,
    autoLayout,
    deleteNode,
    deleteEdge,
    toggleNodeCollapse,
    clearCanvas,
  } = nodeOperations
  const { runNode, runNodeIsolated, saveWorkflow, cancelWorkflow, runWorkflow } = workflowOperations
  const { handleConnectInternal, handleConnectStart, handleConnectEnd, handleAddNodeFromSelector } = connections
  const {
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
    handleRunWorkflow,
    handleDebugRun,
    executionProgress,
    getMiniMapNodeColor,
  } = interaction

  const flowProps: CanvasFlowProps = {
    nodes: workflow.nodes,
    edges: workflow.edges,
    nodeTypes,
    edgeTypes,
    fitView: !workflow.workflowAst.viewport,
    snapToGrid,
    isDark,
    showBackground,
    showMiniMap,
    miniMapNodeColor: getMiniMapNodeColor,
    isCanvasEmpty,
    isRunning,
    executionProgress,
    onCancel: cancelWorkflow,
    onMove: handleViewportChange,
    onNodesChange: handleNodesChangeInternal,
    onEdgesChange: handleEdgesChangeInternal,
    onConnect: handleConnectInternal,
    onConnectStart: handleConnectStart,
    onConnectEnd: handleConnectEnd,
    onNodeClick,
    onPaneClick,
    onNodesDelete: handleNodesDelete,
    onEdgesDelete: handleEdgesDelete,
    onEdgeDoubleClick: handleEdgeDoubleClick,
    onEdgeContextMenu: handleEdgeContextMenu,
    onPaneContextMenu,
    onDrop: handleDrop,
    onDragOver: handleDragOver,
  }

  const controlsProps: CanvasControlsProps = {
    showControls,
    useMenubar,
    workflowName,
    workflowId,
    onRun: handleRunWorkflow,
    onDebugRun: handleDebugRun,
    onCancel: cancelWorkflow,
    onSave: customOnSave || (() => saveWorkflow(workflow.workflowAst?.name || 'Untitled')),
    onExport: fileOperations.exportWorkflow,
    onAiExport: openAiExportDialog,
    onImport: fileOperations.importWorkflow,
    onSettings: openWorkflowSettingsDialog,
    openScheduleDialog,
    openSchedulePanel,
    openRunHistoryPanel,
    showToast,
    onEventStoreToggle: handleEventStoreToggle,
    eventStoreEnabled,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitView: handleFitView,
    onCollapseNodes: collapseNodes,
    onExpandNodes: expandNodes,
    onAutoLayout: autoLayout,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    isRunning,
    isSaving,
  }

  const overlaysActions: CanvasOverlaysActions = {
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleSelectAll,
    clearCanvas,
    deleteNode,
    runNode,
    runNodeIsolated,
    toggleNodeCollapse,
    deleteEdge,
    handleConfigEdge,
    createGroup,
    ungroupNodes,
    collapseNodes,
    expandNodes,
    autoLayout,
    saveSubWorkflow,
    handleSaveEdgeConfig,
    handleSaveWorkflowSettings,
    handleLocateNode,
    triggerSave,
    runWorkflow,
  }

  return {
    flowProps,
    controlsProps,
    overlaysActions,
    overlaysStructural: { menu, closeMenu, nodeSelector, closeNodeSelector, onSelectNode: handleAddNodeFromSelector },
  }
}
