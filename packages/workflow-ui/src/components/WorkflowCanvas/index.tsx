'use client'

import React, { useCallback } from 'react'
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  SelectionMode,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  Play,
  Save,
  Share2,
  Workflow,
  ZoomIn,
  ZoomOut,
  Maximize2,
  PlusSquare,
} from 'lucide-react'

import { WorkflowGraphAst } from '@sker/workflow'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { getAllNodeTypes } from '../../adapters'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useCanvasControls } from './useCanvasControls'
import { ContextMenu } from './ContextMenu'
import { NodeSelector } from './NodeSelector'
import { cn } from '../../utils/cn'

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
  /** 顶部标题 */
  title?: string
  /** 运行全部节点回调 */
  onRunAll?: () => void
  /** 保存工作流回调 */
  onSave?: () => void
  /** 分享工作流回调 */
  onShare?: () => void
}

export function WorkflowCanvas({
  workflowAst,
  showMiniMap = true,
  showControls = true,
  showBackground = true,
  snapToGrid = false,
  className = '',
  title = '工作流',
  onRunAll,
  onSave,
  onShare,
}: WorkflowCanvasProps) {
  const workflow = useWorkflow(workflowAst)
  const nodes = workflow.nodes
  const edges = workflow.edges
  const isCanvasEmpty = nodes.length === 0

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
  } = useCanvasControls()

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

  const handleAddNodeFromSelector = useCallback(
    (metadata: any) => {
      const registeredNodeTypes = getAllNodeTypes()
      const NodeClass = registeredNodeTypes.find((type: any) => type.name === metadata.type)
      if (NodeClass) {
        workflow.addNode(NodeClass, nodeSelector.flowPosition, metadata.label)
      }
    },
    [workflow, nodeSelector.flowPosition]
  )

  const handleClearCanvas = useCallback(() => {
    if (nodes.length === 0 || confirm('确定要清空画布吗？此操作无法撤销。')) {
      workflow.clearWorkflow()
    }
  }, [nodes.length, workflow])

  const handleRunAll = useCallback(() => {
    onRunAll?.()
  }, [onRunAll])

  const handleSave = useCallback(() => {
    onSave?.()
  }, [onSave])

  const handleShare = useCallback(() => {
    onShare?.()
  }, [onShare])

  return (
    <div
      className={cn(
        'workflow-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#111318] text-white',
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-[#282e39] bg-[#111318] px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2531] text-[#135bec]">
            <Workflow className="h-5 w-5" strokeWidth={1.8} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-base font-semibold leading-tight tracking-[-0.015em]">{title}</h2>
            <p className="text-xs text-[#9da6b9]">双击画布空白区域以搜索并添加新节点。</p>
          </div>
        </div>

        <div className="flex flex-1 justify-end gap-3">
          <button
            type="button"
            onClick={handleRunAll}
            className="inline-flex items-center gap-2 rounded-lg bg-[#135bec] px-4 py-2 text-sm font-semibold tracking-[0.015em] text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#1b6aff] hover:shadow-blue-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318]"
          >
            <Play className="h-4 w-4" strokeWidth={2.2} />
            <span>运行全部</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg border border-[#282e39] bg-[#1a1d24] px-4 py-2 text-sm font-semibold tracking-[0.015em] text-white transition hover:border-[#354057] hover:bg-[#212530] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318]"
          >
            <Save className="h-4 w-4" strokeWidth={1.8} />
            <span>保存工作流</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-lg border border-[#282e39] bg-[#1a1d24] px-3 py-2 text-sm font-semibold tracking-[0.015em] text-white transition hover:border-[#354057] hover:bg-[#212530] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318]"
          >
            <Share2 className="h-4 w-4" strokeWidth={1.8} />
            <span className="hidden sm:inline">分享</span>
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
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
            snapToGrid={snapToGrid}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
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

          {isCanvasEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex max-w-lg flex-col items-center gap-4 rounded-lg border-2 border-dashed border-[#3b4354] bg-[#111318]/80 px-10 py-12 text-center backdrop-blur-sm">
                <div className="rounded-full bg-[#1f2531] p-3 text-[#3b4354]">
                  <PlusSquare className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold leading-tight tracking-[-0.015em]">
                  工作流画布
                </h3>
                <p className="text-sm text-[#9da6b9]">
                  双击画布空白区域以搜索并添加新节点。
                </p>
              </div>
            </div>
          )}

          {showControls && (
            <div className="absolute bottom-4 right-4 z-[5] flex flex-col gap-2 rounded-xl border border-[#282e39] bg-[#111318] p-1.5 shadow-lg shadow-black/30">
              <button
                type="button"
                onClick={handleZoomIn}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <ZoomIn className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <ZoomOut className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={handleFitView}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <Maximize2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      <ContextMenu
        menu={menu}
        onFitView={handleFitView}
        onCenterView={handleCenterView}
        onResetZoom={handleResetZoom}
        onSelectAll={handleSelectAll}
        onClearCanvas={handleClearCanvas}
        onClose={closeMenu}
      />

      <NodeSelector
        visible={nodeSelector.visible}
        position={nodeSelector.screenPosition}
        onSelect={handleAddNodeFromSelector}
        onClose={closeNodeSelector}
      />
    </div>
  )
}
