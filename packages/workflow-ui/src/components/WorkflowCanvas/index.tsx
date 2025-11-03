'use client'

import React, { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { WorkflowGraphAst } from '@sker/workflow'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { getAllNodeTypes } from '../../adapters'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useCanvasControls } from './useCanvasControls'
import { ContextMenu } from './ContextMenu'

export interface WorkflowCanvasProps {
  /** 工作流 AST 实例 */
  workflowAst?: WorkflowGraphAst
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
}

export function WorkflowCanvas({
  workflowAst,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  className = '',
}: WorkflowCanvasProps) {
  const workflow = useWorkflow(workflowAst)

  const {
    onNodeClick,
    onPaneClick,
    onPaneContextMenu,
    menu,
    closeMenu,
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleSelectAll,
  } = useCanvasControls();

  const panOnDrag = [1, 2]

  const handleNodesChangeInternal = useCallback(
    (changes: NodeChange[]) => {
      workflow.onNodesChange(changes)
    },
    [workflow]
  )

  const handleEdgesChangeInternal = useCallback(
    (changes: EdgeChange[]) => {
      workflow.onEdgesChange(changes)
    },
    [workflow]
  )

  const handleConnectInternal = useCallback(
    (connection: Connection) => {
      workflow.connectNodes(connection)
    },
    [workflow]
  )

  const handleNodesDelete = useCallback(
    (nodesToDelete: any[]) => {
      nodesToDelete.forEach((node) => workflow.removeNode(node.id))
    },
    [workflow]
  )

  const handleEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      edgesToDelete.forEach((edge) => workflow.removeEdge(edge.id))
    },
    [workflow]
  )

  const handleAddNodeFromMenu = useCallback(
    (metadata: any) => {
      const registeredNodeTypes = getAllNodeTypes()
      const NodeClass = registeredNodeTypes.find((type: any) => type.name === metadata.type)
      if (NodeClass) {
        workflow.addNode(NodeClass, menu.flowPosition, metadata.label)
      }
    },
    [workflow, menu.flowPosition]
  )

  const handleClearCanvas = useCallback(() => {
    const nodes = workflow.nodes
    if (nodes.length === 0 || confirm('确定要清空画布吗？此操作无法撤销。')) {
      workflow.clearWorkflow()
    }
  }, [workflow])

  return (
    <div
      className={`workflow-canvas ${className}`}
      style={{ width: '100%', height: '100%' }}
      onContextMenu={onPaneContextMenu}
    >
      <ReactFlow
        nodes={workflow.nodes}
        edges={workflow.edges}
        onNodesChange={handleNodesChangeInternal}
        onEdgesChange={handleEdgesChangeInternal}
        onConnect={handleConnectInternal}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnScroll
        selectionOnDrag={false}
        panOnDrag={panOnDrag}
        selectionMode={SelectionMode.Partial}
        fitView
        deleteKeyCode="Delete"
        snapToGrid={false}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        {showBackground && (
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        )}
        {showControls && <Controls />}
        {showMiniMap && <MiniMap />}
      </ReactFlow>

      <ContextMenu
        menu={menu}
        onAddNode={handleAddNodeFromMenu}
        onFitView={handleFitView}
        onCenterView={handleCenterView}
        onResetZoom={handleResetZoom}
        onSelectAll={handleSelectAll}
        onClearCanvas={handleClearCanvas}
        onClose={closeMenu}
      />
    </div>
  )
}
