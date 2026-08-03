'use client'

import React from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import { WorkflowMinimap, WorkflowEmptyState, WorkflowProgress } from '@sker/ui/components/workflow'
import type { WorkflowNode, WorkflowEdge } from '../../types'
import type { CanvasExecutionProgress } from './useCanvasInteraction'

export interface CanvasFlowProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onConnectStart: (
    event: MouseEvent | TouchEvent,
    params: { nodeId: string | null; handleId: string | null; handleType: 'source' | 'target' | null }
  ) => void
  onConnectEnd: (event: MouseEvent | TouchEvent) => void
  onNodeClick: (event: React.MouseEvent, node: any) => void
  onPaneClick: (event: React.MouseEvent) => void
  onNodesDelete: (nodes: WorkflowNode[]) => void
  onEdgesDelete: (edges: WorkflowEdge[]) => void
  onEdgeDoubleClick: (event: React.MouseEvent, edge: WorkflowEdge) => void
  onEdgeContextMenu: (event: React.MouseEvent, edge: WorkflowEdge) => void
  onPaneContextMenu: (event: MouseEvent | React.MouseEvent) => void
  onDrop: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
  onMove: () => void
  nodeTypes: NodeTypes
  edgeTypes: EdgeTypes
  /** 是否启用初始 fitView（当工作流还没有保存过 viewport 时） */
  fitView: boolean
  snapToGrid: boolean
  isDark: boolean
  showBackground: boolean
  showMiniMap: boolean
  miniMapNodeColor: (node: any) => string
  isCanvasEmpty: boolean
  isRunning: boolean
  executionProgress: CanvasExecutionProgress
  onCancel: () => void
}

/**
 * 画布渲染组件（纯展示）
 *
 * 职责：渲染 ReactFlow 画布本体（节点、边、背景、小地图）、
 * 空状态提示和执行进度条。
 */
export function CanvasFlow({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onPaneClick,
  onNodesDelete,
  onEdgesDelete,
  onEdgeDoubleClick,
  onEdgeContextMenu,
  onPaneContextMenu,
  onDrop,
  onDragOver,
  onMove,
  nodeTypes,
  edgeTypes,
  fitView,
  snapToGrid,
  isDark,
  showBackground,
  showMiniMap,
  miniMapNodeColor,
  isCanvasEmpty,
  isRunning,
  executionProgress,
  onCancel,
}: CanvasFlowProps) {
  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onMove={onMove}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnScroll
        selectionOnDrag={true}
        panOnDrag={[1]}
        selectionMode={SelectionMode.Partial}
        fitView={fitView}
        deleteKeyCode="Delete"
        snapToGrid={snapToGrid}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        minZoom={0.1}
        maxZoom={4}
        zoomOnDoubleClick={false}
        colorMode={isDark ? 'dark' : 'light'}
      >
        {showBackground && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            style={{
              backgroundColor: isDark
                ? 'oklch(0.175 0 0)'
                : 'oklch(0.985 0 0)'
            }}
          />
        )}
        {showMiniMap && <WorkflowMinimap nodeColor={miniMapNodeColor} />}
      </ReactFlow>

      {isCanvasEmpty && <WorkflowEmptyState />}

      {/* 执行进度条 */}
      <WorkflowProgress
        isRunning={isRunning}
        totalNodes={executionProgress.total}
        completedNodes={executionProgress.completed}
        currentNodeName={executionProgress.currentNodeName}
        failedNodes={executionProgress.failed}
        onCancel={onCancel}
      />
    </>
  )
}
