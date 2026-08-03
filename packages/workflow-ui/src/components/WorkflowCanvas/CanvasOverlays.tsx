'use client'

import React from 'react'
import { WorkflowGraphAst } from '@sker/workflow'
import { Toaster } from '@sker/ui/components/ui'
import { ContextMenu } from './ContextMenu'
import { NodeSelector } from './NodeSelector'
import { ShareDialog } from './ShareDialog'
import { SubWorkflowModal } from '../SubWorkflowModal'
import { LeftDrawer } from '../LeftDrawer'
import { EdgeConfigDialog } from './EdgeConfigDialog'
import { WorkflowSettingsDialog } from './WorkflowSettingsDialog'
import { ScheduleDialog } from './ScheduleDialog'
import { ScheduleList } from './ScheduleList'
import { RunHistoryPanel } from './RunHistoryPanel'
import { RunConfigDialog } from './RunConfigDialog'
import { AiExportDialog } from './AiExportDialog'
import { TimeTravelDebugger } from './TimeTravelDebugger'
import { useCanvasState } from './useCanvasState'
import type { ContextMenuState, NodeSelectorState } from './useContextMenu'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'
import type { TimeTravelState, TimeTravelActions } from '../../hooks/useTimeTravel'

export interface CanvasOverlaysActions {
  handleFitView: () => void
  handleCenterView: () => void
  handleResetZoom: () => void
  handleSelectAll: () => void
  clearCanvas: () => void
  deleteNode: (nodeId: string) => void
  runNode: (nodeId: string) => Promise<unknown>
  runNodeIsolated: (nodeId: string) => Promise<unknown>
  toggleNodeCollapse: (nodeId: string) => void
  deleteEdge: (edgeId: string) => void
  handleConfigEdge: (edgeId: string) => void
  createGroup: () => void
  ungroupNodes: () => void
  collapseNodes: () => void
  expandNodes: () => void
  autoLayout: () => void
  saveSubWorkflow: (parentNodeId: string, updatedAst: WorkflowGraphAst) => string | undefined
  handleSaveEdgeConfig: (edgeConfig: any) => void
  handleSaveWorkflowSettings: (settings: any) => Promise<void>
  handleLocateNode: (nodeId: string) => void
  triggerSave: () => void
  runWorkflow: (inputs?: Record<string, unknown>) => Promise<unknown>
}

export interface CanvasOverlaysProps {
  /** 画布 UI 状态（useCanvasState 的完整返回值） */
  canvasState: ReturnType<typeof useCanvasState>
  workflow: UseWorkflowReturn
  menu: ContextMenuState
  closeMenu: () => void
  nodeSelector: NodeSelectorState
  closeNodeSelector: () => void
  onSelectNode: (metadata: any) => void
  /** 画布控制动作 */
  actions: CanvasOverlaysActions
  timeTravel: TimeTravelState & TimeTravelActions
  eventStoreEnabled: boolean
}

/**
 * 画布覆盖层组件（纯展示）
 *
 * 职责：渲染画布上层的所有浮层 UI：
 * 右键菜单、节点选择器、分享对话框、Toast、子工作流弹框、左侧抽屉、
 * 边配置/工作流设置/调度/运行历史/运行配置/AI 导出对话框、时间旅行调试器。
 */
export function CanvasOverlays({
  canvasState,
  workflow,
  menu,
  closeMenu,
  nodeSelector,
  closeNodeSelector,
  onSelectNode,
  actions,
  timeTravel,
  eventStoreEnabled,
}: CanvasOverlaysProps) {
  const {
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
  } = actions
  const {
    shareDialog,
    closeShareDialog,
    subWorkflowModal,
    closeSubWorkflowModal,
    drawer,
    closeDrawer,
    edgeConfigDialog,
    closeEdgeConfigDialog,
    workflowSettingsDialog,
    closeWorkflowSettingsDialog,
    scheduleDialog,
    closeScheduleDialog,
    schedulePanel,
    closeSchedulePanel,
    runHistoryPanel,
    closeRunHistoryPanel,
    runConfigDialog,
    closeRunConfigDialog,
    aiExportDialog,
    closeAiExportDialog,
    showToast,
  } = canvasState

  return (
    <>
      <ContextMenu
        menu={menu}
        onFitView={handleFitView}
        onCenterView={handleCenterView}
        onResetZoom={handleResetZoom}
        onSelectAll={handleSelectAll}
        onClearCanvas={clearCanvas}
        onDeleteNode={deleteNode}
        onRunNode={runNode}
        onRunNodeIsolated={runNodeIsolated}
        onToggleNodeCollapse={toggleNodeCollapse}
        onDeleteEdge={deleteEdge}
        onConfigEdge={handleConfigEdge}
        onCreateGroup={createGroup}
        onUngroupNodes={ungroupNodes}
        onCollapseNodes={collapseNodes}
        onExpandNodes={expandNodes}
        onAutoLayout={autoLayout}
        onToggleEntryNode={workflow.toggleEntryNode}
        onToggleEndNode={workflow.toggleEndNode}
        onClose={closeMenu}
        nodeData={menu.contextType === 'node' && menu.targetId
          ? workflow.nodes.find((n) => n.id === menu.targetId)?.data
          : undefined}
        hasMultipleSelectedNodes={workflow.nodes.filter((n) => n.selected).length > 1}
        isGroupNode={
          menu.contextType === 'node' && menu.targetId
            ? (() => {
                const node = workflow.nodes.find((n) => n.id === menu.targetId)
                return node?.data instanceof WorkflowGraphAst && node.data.isGroup
              })()
            : false
        }
        selectedNodesCount={workflow.nodes.filter((n) => n.selected).length}
        isEntryNode={
          menu.contextType === 'node' && menu.targetId
            ? workflow.isEntryNode(menu.targetId)
            : false
        }
        isEndNode={
          menu.contextType === 'node' && menu.targetId
            ? workflow.isEndNode(menu.targetId)
            : false
        }
      />

      <NodeSelector
        visible={nodeSelector.visible}
        position={nodeSelector.screenPosition}
        onSelect={onSelectNode}
        onClose={closeNodeSelector}
      />

      <ShareDialog
        visible={shareDialog.visible}
        shareUrl={shareDialog.url}
        onClose={closeShareDialog}
      />

      <Toaster />

      <SubWorkflowModal
        visible={subWorkflowModal.visible}
        workflowAst={subWorkflowModal.workflowAst}
        parentNodeId={subWorkflowModal.nodeId}
        onClose={closeSubWorkflowModal}
        onSave={saveSubWorkflow}
      />

      <LeftDrawer
        visible={drawer.visible}
        onClose={closeDrawer}
        onRunNode={runNode}
        onLocateNode={handleLocateNode}
        onAutoSave={triggerSave}
        onUpdateNode={workflow.updateNode}
      />

      <EdgeConfigDialog
        visible={edgeConfigDialog.visible}
        edge={edgeConfigDialog.edge}
        onClose={closeEdgeConfigDialog}
        onSave={handleSaveEdgeConfig}
      />

      <WorkflowSettingsDialog
        visible={workflowSettingsDialog.visible}
        workflow={workflow.workflowAst}
        onClose={closeWorkflowSettingsDialog}
        onSave={handleSaveWorkflowSettings}
      />

      {/* 调度对话框 */}
      {scheduleDialog.visible && scheduleDialog.workflowName && (
        <ScheduleDialog
          workflowName={scheduleDialog.workflowName}
          open={scheduleDialog.visible}
          onOpenChange={closeScheduleDialog}
          onSuccess={() => {
            showToast('success', '调度创建成功', '工作流调度已创建成功')
            // 如果调度面板是打开的，刷新列表
            if (schedulePanel.visible) {
              // 这里可以添加刷新逻辑
            }
          }}
        />
      )}

      {/* 调度列表面板 */}
      {schedulePanel.visible && schedulePanel.workflowName && (
        <ScheduleList
          workflowName={schedulePanel.workflowName}
          onClose={closeSchedulePanel}
          className="absolute top-4 right-4 w-[600px] max-h-[80vh] overflow-y-auto z-[5]"
        />
      )}

      {/* 运行历史面板 */}
      {runHistoryPanel.visible && runHistoryPanel.workflowId && (
        <RunHistoryPanel
          visible={runHistoryPanel.visible}
          workflowId={runHistoryPanel.workflowId}
          onClose={closeRunHistoryPanel}
        />
      )}

      {/* 运行配置对话框 */}
      <RunConfigDialog
        visible={runConfigDialog.visible}
        workflow={workflow.workflowAst}
        defaultInputs={runConfigDialog.defaultInputs}
        onConfirm={(inputs) => {
          closeRunConfigDialog()
          runWorkflow(inputs)
        }}
        onCancel={closeRunConfigDialog}
      />

      {/* AI导出对话框 */}
      <AiExportDialog
        visible={aiExportDialog.visible}
        workflow={workflow.workflowAst}
        onClose={closeAiExportDialog}
      />

      {/* 时间旅行调试器 - 只要开启事件存储就显示 */}
      {eventStoreEnabled && (
        <TimeTravelDebugger
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10]"
          onLocateNode={handleLocateNode}
          {...timeTravel}
        />
      )}
    </>
  )
}
