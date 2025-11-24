'use client'
import React, { useCallback, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
} from '@xyflow/react'

import { fromJson, toJson, INode, WorkflowGraphAst } from '@sker/workflow'
import { createNodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useCanvasControls } from './useCanvasControls'
import { useCanvasState } from './useCanvasState'
import { useWorkflowOperations } from './useWorkflowOperations'

// 新的业务逻辑钩子
import { useFileOperations } from './hooks/useFileOperations'
import { useNodeOperations } from './hooks/useNodeOperations'
import { useEventHandlers } from './hooks/useEventHandlers'

// 新的UI组件
import { CanvasControls } from './components/CanvasControls'
import { CanvasEmptyState } from './components/CanvasEmptyState'

// 原有组件
import { ContextMenu } from './ContextMenu'
import { NodeSelector } from './NodeSelector'
import { ShareDialog } from './ShareDialog'
import { Toast, type ToastType } from './Toast'
import { SubWorkflowModal } from '../SubWorkflowModal'
import { LeftDrawer } from '../LeftDrawer'
import { SettingPanel } from '../SettingPanel'
import { EdgeConfigDialog } from './EdgeConfigDialog'
import { WorkflowSettingsDialog } from './WorkflowSettingsDialog'
import { cn } from '../../utils/cn'

export interface WorkflowCanvasProps {
  /** 工作流 AST 实例 */
  workflowAst?: INode
  /** 是否显示小地图 */
  showMiniMap?: boolean
  /** 是否显示控制面板 */
  showControls?: boolean
  /** 是否显示背景 */
  showBackground?: boolean
  /** 是否启用网格吸附 */
  snapToGrid?: boolean
  /** 自定义类名 */
  className?: string
  /** 顶部标题 */
  title?: string
  /** 名称 */
  name?: string
  /** 运行全部节点回调 */
  onRunAll?: () => void
  /** 保存工作流回调 */
  onSave?: () => void
  /** 分享工作流回调 */
  onShare?: () => void
}

/**
 * 工作流画布组件 - 重构版
 *
 * 优雅设计：
 * - 职责单一：只负责组件组合和基础状态管理
 * - 业务逻辑委托给专门的钩子
 * - UI组件纯粹化，不包含业务逻辑
 * - 代码简洁，易于维护
 */
export function WorkflowCanvas({
  workflowAst,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  snapToGrid = false,
  className = ''
}: WorkflowCanvasProps) {
  // 工作流上下文
  const workflow = useWorkflow(fromJson<WorkflowGraphAst>(workflowAst))
  const { getViewport, setViewport } = useReactFlow()

  // 状态管理
  const {
    setIsRunning,
    setIsSaving,
    shareDialog,
    closeShareDialog,
    subWorkflowModal,
    openSubWorkflowModal,
    closeSubWorkflowModal,
    toast,
    showToast,
    hideToast,
    settingPanel,
    openSettingPanel,
    closeSettingPanel,
    drawer,
    openDrawer,
    closeDrawer,
    edgeConfigDialog,
    openEdgeConfigDialog,
    closeEdgeConfigDialog,
    workflowSettingsDialog,
    openWorkflowSettingsDialog,
    closeWorkflowSettingsDialog,
  } = useCanvasState()

  // 连线状态追踪
  const [connectingInfo, setConnectingInfo] = useState<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  } | null>(null)

  // 画布控制 - 先获取，供业务钩子使用
  const {
    onNodeClick,
    onPaneClick,
    onPaneContextMenu,
    menu,
    closeMenu,
    nodeSelector,
    openNodeSelector,
    closeNodeSelector,
    screenToFlowPosition,
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleSelectAll,
    handleZoomIn,
    handleZoomOut,
    handleLocateNode,
  } = useCanvasControls()

  // 业务逻辑钩子 - 正确在组件顶层调用
  const { exportWorkflow, importWorkflow, processImportFile } = useFileOperations(workflow, {
    onShowToast: showToast,
    onGetViewport: getViewport,
    onFitView: handleFitView
  })

  const {
    copyNodes,
    cutNodes,
    pasteNodes,
    deleteSelection,
    createGroup,
    ungroupNodes,
    collapseNodes,
    expandNodes,
    autoLayout,
    deleteNode,
    deleteEdge,
    toggleNodeCollapse,
    clearCanvas
  } = useNodeOperations(workflow, {
    onShowToast: showToast,
    onFitView: handleFitView
  })

  // 工作流操作
  const { runNode, saveWorkflow, saveSubWorkflow, runWorkflow } = useWorkflowOperations(workflow, {
    onShowToast: showToast,
    onSetRunning: setIsRunning,
    onSetSaving: setIsSaving,
    getViewport,
  })

  // 事件处理统一委托
  useEventHandlers({
    onEdgeDelete: useCallback((edgeId: string) => {
      const edge = workflow.edges.find((e) => e.id === edgeId)
      if (edge) {
        workflow.removeEdge(edge)
      }
    }, [workflow]),

    onOpenSubWorkflow: useCallback((nodeId: string, workflowAst: any) => {
      openSubWorkflowModal({ nodeId, workflowAst })
    }, [openSubWorkflowModal]),

    onOpenSettingPanel: useCallback((nodeId: string, nodeData: any) => {
      openSettingPanel({ nodeId, nodeData })
    }, [openSettingPanel]),

    onOpenEdgeConfig: useCallback((edgeId: string) => {
      const edge = workflow.edges.find((e) => e.id === edgeId)
      if (edge?.data?.edge) {
        openEdgeConfigDialog(edge.data.edge)
      }
    }, [workflow.edges, openEdgeConfigDialog]),

    onNodeDoubleClick: useCallback((nodeId: string) => {
      openDrawer(nodeId)
    }, [openDrawer]),
  })

  // 恢复视图窗口状态
  useEffect(() => {
    if (workflow.workflowAst.viewport) {
      const { x, y, zoom } = workflow.workflowAst.viewport
      setViewport({ x, y, zoom }, { duration: 0 })
    }
  }, [workflow.workflowAst, setViewport])

  // 键盘快捷键
  useKeyboardShortcuts({
    enabled: true,
    onCopy: copyNodes,
    onCut: cutNodes,
    onPaste: () => pasteNodes(),
    onDelete: deleteSelection,
    onSelectAll: handleSelectAll,
    onSave: () => saveWorkflow(workflow.workflowAst?.name || 'Untitled'),
    onToggleCollapse: () => {}, // 通过节点操作钩子处理
    onCreateGroup: createGroup,
    onUngroupNodes: ungroupNodes,
    onCollapseNodes: collapseNodes,
    onExpandNodes: expandNodes,
    onAutoLayout: autoLayout,
  })

  // 处理连线
  const handleNodesChangeInternal = useCallback((changes: NodeChange[]) => {
    workflow.onNodesChange(changes)
  }, [workflow])

  const handleEdgesChangeInternal = useCallback((changes: EdgeChange[]) => {
    workflow.onEdgesChange(changes)
  }, [workflow])

  const handleConnectInternal = useCallback((connection: Connection) => {
    workflow.connectNodes(connection)
  }, [workflow])

  const handleConnectStart = useCallback((
    _event: MouseEvent | TouchEvent,
    params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }
  ) => {
    setConnectingInfo({
      nodeId: params.nodeId,
      handleId: params.handleId,
      handleType: params.handleType,
    })
  }, [])

  const handleConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    if (connectingInfo && connectingInfo.nodeId) {
      const clientX = 'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX
      const clientY = 'touches' in event ? event.touches[0]?.clientY ?? 0 : event.clientY

      const screenPosition = { x: clientX, y: clientY }
      const flowPosition = screenToFlowPosition(screenPosition)

      openNodeSelector(screenPosition, flowPosition)
    }

    setConnectingInfo(null)
  }, [connectingInfo, screenToFlowPosition, openNodeSelector])

  const handleNodesDelete = useCallback((nodesToDelete: any[]) => {
    nodesToDelete.forEach((node) => workflow.removeNode(node.id))
  }, [workflow])

  const handleEdgesDelete = useCallback((edgesToDelete: any[]) => {
    edgesToDelete.forEach((edge) => workflow.removeEdge(edge))
  }, [workflow])

  const handleAddNodeFromSelector = useCallback((metadata: any) => {
    const { getAllNodeTypes } = require('../../adapters')
    const registeredNodeTypes = getAllNodeTypes()
    const NodeClass = registeredNodeTypes.find((type: any) => type.name === metadata.type)

    if (NodeClass) {
      const newNode = workflow.addNode(NodeClass, nodeSelector.flowPosition, metadata.label)

      if (connectingInfo && connectingInfo.nodeId && newNode) {
        const connection: Connection = {
          source: connectingInfo.handleType === 'source' ? connectingInfo.nodeId : newNode.id,
          target: connectingInfo.handleType === 'source' ? newNode.id : connectingInfo.nodeId,
          sourceHandle: connectingInfo.handleType === 'source' ? connectingInfo.handleId : null,
          targetHandle: connectingInfo.handleType === 'source' ? null : connectingInfo.handleId,
        }
        workflow.connectNodes(connection)
      }
    }
  }, [workflow, nodeSelector.flowPosition, connectingInfo])

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
    const astEdge = workflow.workflowAst.edges.find((e: any) => e.id === edgeId)

    if (astEdge) {
      Object.assign(astEdge, edgeConfig)
    }

    workflow.setEdges((currentEdges: any[]) =>
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
  const handleSaveWorkflowSettings = useCallback((settings: any) => {
    if (settings.name) {
      workflow.workflowAst.name = settings.name
    }
    if (settings.description !== undefined) {
      workflow.workflowAst.description = settings.description
    }
    if (settings.color) {
      workflow.workflowAst.groupColor = settings.color
    }
    if (settings.tags !== undefined) {
      workflow.workflowAst.tags = settings.tags
    }

    showToast('success', '工作流设置已保存', `已更新工作流 "${settings.name || '未命名'}" 的属性`)
  }, [workflow, showToast])

  const isCanvasEmpty = workflow.nodes.length === 0

  return (
    <div
      className={cn(
        'workflow-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#111318] text-white',
        className
      )}
    >
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex flex-1">
          <ReactFlow
            nodes={workflow.nodes}
            edges={workflow.edges}
            onNodesChange={handleNodesChangeInternal}
            onEdgesChange={handleEdgesChangeInternal}
            onConnect={handleConnectInternal}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            onPaneContextMenu={onPaneContextMenu}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            nodeTypes={createNodeTypes()}
            edgeTypes={edgeTypes}
            panOnScroll
            selectionOnDrag={true}
            panOnDrag={[1, 2]}
            selectionMode={SelectionMode.Partial}
            fitView={!workflow.workflowAst.viewport}
            deleteKeyCode="Delete"
            snapToGrid={snapToGrid}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            minZoom={0.1}
            maxZoom={4}
            zoomOnDoubleClick={false}
            className="workflow-canvas__reactflow"
            style={{ background: '#1a1d24' }}
          >
            {showBackground && (
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1}
                color="#2f3542"
              />
            )}
            {showMiniMap && (
              <MiniMap
                className="!bg-[#111318]/80 !text-[#9da6b9]"
                maskColor="rgba(17, 19, 24, 0.85)"
                pannable
                zoomable
              />
            )}
          </ReactFlow>

          {isCanvasEmpty && <CanvasEmptyState />}

          {showControls && (
            <CanvasControls
              onRunWorkflow={() => runWorkflow(() => {
                // 运行完成后的回调，可以在这里添加完成逻辑
                console.log('工作流执行完成')
              })}
              onSaveWorkflow={() => saveWorkflow(workflow.workflowAst?.name || 'Untitled')}
              onExportWorkflow={exportWorkflow}
              onImportWorkflow={importWorkflow}
              onOpenWorkflowSettings={openWorkflowSettingsDialog}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onFitView={handleFitView}
              onCollapseNodes={collapseNodes}
              onExpandNodes={expandNodes}
              onAutoLayout={autoLayout}
              isRunning={false} // 需要从状态管理获取
              isSaving={false}  // 需要从状态管理获取
            />
          )}
        </div>
      </div>

      <ContextMenu
        menu={menu}
        onFitView={handleFitView}
        onCenterView={handleCenterView}
        onResetZoom={handleResetZoom}
        onSelectAll={handleSelectAll}
        onClearCanvas={clearCanvas}
        onDeleteNode={deleteNode}
        onRunNode={runNode}
        onToggleNodeCollapse={toggleNodeCollapse}
        onDeleteEdge={deleteEdge}
        onConfigEdge={handleConfigEdge}
        onCreateGroup={createGroup}
        onUngroupNodes={ungroupNodes}
        onCollapseNodes={collapseNodes}
        onExpandNodes={expandNodes}
        onAutoLayout={autoLayout}
        onClose={closeMenu}
        nodeData={menu.contextType === 'node' && menu.targetId
          ? workflow.nodes.find((n: any) => n.id === menu.targetId)?.data
          : undefined}
        hasMultipleSelectedNodes={workflow.nodes.filter((n: any) => n.selected).length > 1}
        isGroupNode={
          menu.contextType === 'node' && menu.targetId
            ? workflow.nodes.find((n: any) => n.id === menu.targetId)?.data instanceof WorkflowGraphAst && workflow.nodes.find((n: any) => n.id === menu.targetId)?.data.isGroup
            : false
        }
        selectedNodesCount={workflow.nodes.filter((n: any) => n.selected).length}
      />

      <NodeSelector
        visible={nodeSelector.visible}
        position={nodeSelector.screenPosition}
        onSelect={handleAddNodeFromSelector}
        onClose={closeNodeSelector}
      />

      <ShareDialog
        visible={shareDialog.visible}
        shareUrl={shareDialog.url}
        onClose={closeShareDialog}
      />

      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />

      <SubWorkflowModal
        visible={subWorkflowModal.visible}
        workflowAst={subWorkflowModal.workflowAst}
        parentNodeId={subWorkflowModal.nodeId}
        onClose={closeSubWorkflowModal}
        onSave={saveSubWorkflow}
      />

      {settingPanel.visible && (
        <SettingPanel
          nodeId={settingPanel.nodeId || null}
          nodeData={settingPanel.nodeData}
          onClose={closeSettingPanel}
        />
      )}

      <LeftDrawer
        visible={drawer.visible}
        onClose={closeDrawer}
        onRunNode={runNode}
        onLocateNode={handleLocateNode}
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
    </div>
  )
}

WorkflowCanvas.displayName = 'WorkflowCanvas'