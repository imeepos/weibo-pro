'use client'

import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  BackgroundVariant,
  SelectionMode,
  ConnectionMode,
} from '@xyflow/react'

import { cn } from '@sker/ui/lib/utils'
import { useWorkflowNodes } from './hooks/use-workflow-nodes'
import { useWorkflowEdges } from './hooks/use-workflow-edges'
import { useWorkflowActions } from './hooks/use-workflow-actions'
import { WorkflowCanvasControls } from './workflow-canvas-controls'
import { WorkflowContextMenu } from './workflow-context-menu'
import { WorkflowNodeSelector } from './workflow-node-selector'
import { WorkflowMinimap } from './workflow-minimap'

import type { WorkflowCanvasProps } from './types/workflow-canvas'

const defaultNodeTypes = {}
const defaultEdgeTypes = {}

export function WorkflowCanvas({
  nodes: externalNodes,
  edges: externalEdges,
  nodeTypes = defaultNodeTypes,
  edgeTypes = defaultEdgeTypes,
  showControls = true,
  showMiniMap = true,
  showBackground = true,
  snapToGrid = false,
  fitViewOnInit = true,
  connectionMode = ConnectionMode.Loose,
  selectionMode = SelectionMode.Partial,
  backgroundVariant = BackgroundVariant.Dots,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onViewportChange,
  onRun,
  onSave,
  onExport,
  onImport,
  className,
  style,
}: WorkflowCanvasProps) {
  // 状态管理
  const {
    nodes: internalNodes,
    handleNodesChange,
  } = useWorkflowNodes()

  const {
    edges: internalEdges,
    handleEdgesChange,
    handleConnect,
  } = useWorkflowEdges()

  const {
    runWorkflow,
    saveWorkflow,
    exportWorkflow,
    importWorkflow,
    fitView,
    zoomIn,
    zoomOut,
    resetView,
  } = useWorkflowActions()

  // 使用外部传入的节点和边，或者内部状态
  const nodes = externalNodes || internalNodes
  const edges = externalEdges || internalEdges

  // 合并事件处理器
  const handleNodesChangeCombined = useCallback(
    (changes: any) => {
      handleNodesChange(changes)
      onNodesChange?.(changes)
    },
    [handleNodesChange, onNodesChange]
  )

  const handleEdgesChangeCombined = useCallback(
    (changes: any) => {
      handleEdgesChange(changes)
      onEdgesChange?.(changes)
    },
    [handleEdgesChange, onEdgesChange]
  )

  const handleConnectCombined = useCallback(
    (connection: any) => {
      handleConnect(connection)
      onConnect?.(connection)
    },
    [handleConnect, onConnect]
  )

  // 右键菜单状态
  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    isOpen: boolean
  }>({ x: 0, y: 0, isOpen: false })

  const [nodeSelector, setNodeSelector] = React.useState<{
    isOpen: boolean
    x: number
    y: number
  }>({ isOpen: false, x: 0, y: 0 })

  // 右键菜单处理
  const handlePaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    event.preventDefault()
    const clientX = 'clientX' in event ? event.clientX : 0
    const clientY = 'clientY' in event ? event.clientY : 0
    setContextMenu({
      x: clientX,
      y: clientY,
      isOpen: true,
    })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleCloseNodeSelector = useCallback(() => {
    setNodeSelector((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const handleAddNode = useCallback((type: string, position: { x: number; y: number }) => {
    // 这里可以添加创建新节点的逻辑
    console.log('Adding node:', type, position)
  }, [])

  const handleSelectNodeType = useCallback((type: string) => {
    handleAddNode(type, { x: nodeSelector.x, y: nodeSelector.y })
    handleCloseNodeSelector()
  }, [handleAddNode, handleCloseNodeSelector, nodeSelector.x, nodeSelector.y])

  // 控制栏回调
  const handleRun = useCallback(() => {
    runWorkflow()
    onRun?.()
  }, [runWorkflow, onRun])

  const handleSave = useCallback(() => {
    saveWorkflow()
    onSave?.()
  }, [saveWorkflow, onSave])

  const handleExport = useCallback(
    (format: 'json' | 'image') => {
      exportWorkflow(format)
      onExport?.(format)
    },
    [exportWorkflow, onExport]
  )

  const handleImport = useCallback(
    (data: any) => {
      importWorkflow(data)
      onImport?.(data)
    },
    [importWorkflow, onImport]
  )

  return (
    <div
      className={cn(
        'relative w-full h-full bg-background border border-border rounded-lg overflow-hidden',
        className
      )}
      style={style}
    >
      {/* 控制栏 */}
      {showControls && (
        <WorkflowCanvasControls
          onRun={handleRun}
          onSave={handleSave}
          onExport={handleExport}
          onImport={handleImport}
          onFitView={fitView}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
          className="absolute top-4 left-4 z-10"
        />
      )}

      {/* React Flow 画布 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChangeCombined}
        onEdgesChange={handleEdgesChangeCombined}
        onConnect={handleConnectCombined}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onMove={(event, viewport) => onViewportChange?.(viewport)}
        onPaneContextMenu={handlePaneContextMenu}
        connectionMode={connectionMode}
        selectionMode={selectionMode}
        snapToGrid={snapToGrid}
        fitView={fitViewOnInit}
        className="w-full h-full"
      >
        {/* 背景 */}
        {showBackground && (
          <Background
            variant={backgroundVariant}
            gap={20}
            size={1}
            color="#e5e7eb"
            className="dark:bg-gray-800"
          />
        )}

        {/* 小地图 */}
        {showMiniMap && <WorkflowMinimap />}

        {/* 控制按钮 */}
        <Controls position="top-right" />
      </ReactFlow>

      {/* 右键菜单 */}
      <WorkflowContextMenu
        position={{ x: contextMenu.x, y: contextMenu.y }}
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        onAddNode={(type) => {
          handleAddNode(type, { x: contextMenu.x, y: contextMenu.y })
          handleCloseContextMenu()
        }}
      />

      {/* 节点选择器 */}
      <WorkflowNodeSelector
        isOpen={nodeSelector.isOpen}
        onClose={handleCloseNodeSelector}
        onSelectNodeType={handleSelectNodeType}
        position={{ x: nodeSelector.x, y: nodeSelector.y }}
      />
    </div>
  )
}