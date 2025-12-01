'use client'
import React from 'react'
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

import { PlusSquare } from 'lucide-react'

import { createNodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { cn } from '../../utils/cn'

export interface CanvasRendererProps {
  /** 节点数据 */
  nodes: any[]
  /** 边数据 */
  edges: any[]
  /** 是否显示小地图 */
  showMiniMap?: boolean
  /** 是否显示背景 */
  showBackground?: boolean
  /** 是否启用网格吸附 */
  snapToGrid?: boolean
  /** 是否自动适应视图 */
  fitView?: boolean
  /** 节点变化回调 */
  onNodesChange?: (changes: NodeChange[]) => void
  /** 边变化回调 */
  onEdgesChange?: (changes: EdgeChange[]) => void
  /** 连接回调 */
  onConnect?: (connection: Connection) => void
  /** 节点点击回调 */
  onNodeClick?: (event: React.MouseEvent, node: any) => void
  /** 画布点击回调 */
  onPaneClick?: (event: React.MouseEvent) => void
  /** 节点删除回调 */
  onNodesDelete?: (nodes: any[]) => void
  /** 边删除回调 */
  onEdgesDelete?: (edges: any[]) => void
  /** 画布右键菜单回调 */
  onPaneContextMenu?: (event: MouseEvent | React.MouseEvent) => void
  /** 自定义类名 */
  className?: string
}

export function CanvasRenderer({
  nodes,
  edges,
  showMiniMap = true,
  showBackground = true,
  snapToGrid = false,
  fitView = false,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onNodesDelete,
  onEdgesDelete,
  onPaneContextMenu,
  className = '',
}: CanvasRendererProps) {
  const isCanvasEmpty = nodes.length === 0
  const panOnDrag = [1, 2]

  return (
    <div
      className={cn(
        'workflow-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-card text-white',
        className
      )}
    >
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            onEdgesDelete={onEdgesDelete}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={createNodeTypes()}
            edgeTypes={edgeTypes}
            panOnScroll
            selectionOnDrag={false}
            panOnDrag={panOnDrag}
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
                className="!bg-card/80 !text-muted-foreground"
                maskColor="rgba(17, 19, 24, 0.85)"
                pannable
                zoomable
              />
            )}
          </ReactFlow>

          {isCanvasEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex max-w-lg flex-col items-center gap-4 rounded-lg border-2 border-dashed border-border bg-card/80 px-10 py-12 text-center backdrop-blur-sm">
                <div className="rounded-full bg-secondary p-3 text-muted-foreground/50">
                  <PlusSquare className="h-8 w-8" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold leading-tight tracking-[-0.015em]">
                  工作流画布
                </h3>
                <p className="text-sm text-muted-foreground">
                  双击画布空白区域以搜索并添加新节点。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}