'use client'
import React, { useCallback, useState } from 'react'
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

import { WorkflowGraphAst, toJson, execute } from '@sker/workflow'
import type { Ast } from '@sker/workflow'
import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { getAllNodeTypes } from '../../adapters'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useClipboard } from '../../hooks/useClipboard'
import { useCanvasControls } from './useCanvasControls'
import { ContextMenu } from './ContextMenu'
import { NodeSelector } from './NodeSelector'
import { cn } from '../../utils/cn'
import { root } from '@sker/core'
import { WorkflowController } from '@sker/sdk'

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
  title?: string;
  /** 名称 */
  name?: string;
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
  name = '',
  onRunAll,
  onSave,
  onShare,
}: WorkflowCanvasProps) {
  const workflow = useWorkflow(workflowAst)
  const nodes = workflow.nodes
  const edges = workflow.edges
  const isCanvasEmpty = nodes.length === 0
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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
    handleDeleteNode,
    handleDeleteEdge,
    handleRunNode,
  } = useCanvasControls()

  const clipboard = useClipboard()

  const panOnDrag = [1, 2]

  // 获取选中的节点
  const getSelectedNodes = useCallback(() => {
    return nodes.filter((node) => node.selected)
  }, [nodes])

  // 获取选中节点相关的边
  const getSelectedNodesEdges = useCallback(() => {
    const selectedNodeIds = new Set(
      nodes.filter((node) => node.selected).map((node) => node.id)
    )
    return edges.filter(
      (edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    )
  }, [nodes, edges])

  // 复制选中的节点
  const handleCopy = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 0) {
      const selectedEdges = getSelectedNodesEdges()
      clipboard.copyNodes(selectedNodes, selectedEdges)
      console.log(`已复制 ${selectedNodes.length} 个节点`)
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard])

  // 剪切选中的节点
  const handleCut = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length > 0) {
      const selectedEdges = getSelectedNodesEdges()
      clipboard.cutNodes(selectedNodes, selectedEdges)
      // 删除原节点
      selectedNodes.forEach((node) => workflow.removeNode(node.id))
      console.log(`已剪切 ${selectedNodes.length} 个节点`)
    }
  }, [getSelectedNodes, getSelectedNodesEdges, clipboard, workflow])

  // 粘贴节点
  const handlePaste = useCallback(() => {
    if (!clipboard.hasClipboard) return

    // 获取画布中心位置作为粘贴位置
    const viewportCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const flowPosition = { x: 100, y: 100 } // 默认位置，实际应该用 screenToFlowPosition

    clipboard.pasteNodes(flowPosition, (newNodes, newEdges) => {
      // 将新节点添加到工作流
      newNodes.forEach((node) => {
        workflow.addNode(node.data.nodeClass, node.position, node.data.label)
      })
      console.log(`已粘贴 ${newNodes.length} 个节点`)
    })
  }, [clipboard, workflow])

  // 删除选中的节点和边
  const handleDelete = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    const selectedEdges = edges.filter((edge) => edge.selected)

    selectedNodes.forEach((node) => workflow.removeNode(node.id))
    selectedEdges.forEach((edge) => workflow.removeEdge(edge.id))

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      console.log(
        `已删除 ${selectedNodes.length} 个节点和 ${selectedEdges.length} 条边`
      )
    }
  }, [getSelectedNodes, edges, workflow])

  // 集成键盘快捷键
  useKeyboardShortcuts({
    enabled: true,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onSelectAll: handleSelectAll,
  })

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

  /**
   * 运行全部节点
   *
   * 优雅设计：
   * - 直接使用 execute 函数在前端执行
   * - 实时更新节点状态
   * - 提供用户反馈
   */
  const handleRunAll = useCallback(async () => {
    if (onRunAll) {
      onRunAll()
      return
    }

    if (!workflow.workflowAst) {
      console.error('工作流 AST 不存在')
      return
    }

    if (isRunning) {
      console.warn('工作流正在运行中')
      return
    }

    setIsRunning(true)

    try {
      console.log('开始执行工作流', { name: workflow.workflowAst.name })

      // 执行整个工作流
      const result = await execute(workflow.workflowAst, {})

      // 同步状态到 UI
      workflow.syncFromAst()

      console.log('工作流执行完成', {
        name: workflow.workflowAst.name,
        state: workflow.workflowAst.state,
        result,
      })

      // 显示成功提示
      if (workflow.workflowAst.state === 'success') {
        alert('工作流执行成功！')
      } else {
        alert(`工作流执行失败：${workflow.workflowAst.error?.message || '未知错误'}`)
      }
    } catch (error: any) {
      console.error('工作流执行失败', error)
      alert(`工作流执行失败：${error.message}`)
    } finally {
      setIsRunning(false)
    }
  }, [workflow, onRunAll, isRunning])

  /**
   * 保存工作流
   *
   * 优雅设计：
   * - 序列化工作流数据
   * - 调用后端 API 保存
   * - 提供保存反馈
   */
  const handleSave = useCallback(async () => {
    if (onSave) {
      onSave()
      return
    }

    if (!workflow.workflowAst) {
      console.error('工作流 AST 不存在')
      return
    }

    if (isSaving) {
      console.warn('工作流正在保存中')
      return
    }

    setIsSaving(true)

    try {
      // 调用 API 保存
      const controller = root.get<WorkflowController>(WorkflowController)
      const result = await controller.saveWorkflow(workflow.workflowAst)

      console.log('工作流保存成功', result)
    } catch (error: any) {
      console.error('工作流保存失败', error)
    } finally {
      setIsSaving(false)
    }
  }, [workflow, name, onSave, isSaving])

  /**
   * 分享工作流
   *
   * 优雅设计：
   * - 先保存工作流
   * - 生成分享链接
   * - 复制到剪贴板
   */
  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }

    if (!workflow.workflowAst) {
      console.error('工作流 AST 不存在')
      return
    }

    try {
      const controller = root.get<WorkflowController>(WorkflowController)
      // 保存工作流
      const saveResult = await controller.saveWorkflow(workflow.workflowAst)
      // 创建分享链接
      const shareResult = await controller.createShare({
        workflowId: saveResult.code,
      })

      // 生成完整的分享 URL
      const shareUrl = `${window.location.origin}${shareResult.shareUrl}`

      // 复制到剪贴板
      await navigator.clipboard.writeText(shareUrl)

      console.log('分享链接已生成', { shareUrl })
      alert(`分享链接已复制到剪贴板：\n${shareUrl}`)
    } catch (error: any) {
      console.error('创建分享链接失败', error)
      alert(`创建分享链接失败：${error.message || '未知错误'}`)
    }
  }, [workflow, name, onShare])

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
            disabled={isRunning || isCanvasEmpty}
            className="inline-flex items-center gap-2 rounded-lg bg-[#135bec] px-4 py-2 text-sm font-semibold tracking-[0.015em] text-white shadow-lg shadow-blue-500/20 transition hover:bg-[#1b6aff] hover:shadow-blue-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" strokeWidth={2.2} />
            <span>{isRunning ? '运行中...' : '运行全部'}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isCanvasEmpty}
            className="inline-flex items-center gap-2 rounded-lg border border-[#282e39] bg-[#1a1d24] px-4 py-2 text-sm font-semibold tracking-[0.015em] text-white transition hover:border-[#354057] hover:bg-[#212530] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" strokeWidth={1.8} />
            <span>{isSaving ? '保存中...' : '保存工作流'}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={isCanvasEmpty}
            className="inline-flex items-center gap-2 rounded-lg border border-[#282e39] bg-[#1a1d24] px-3 py-2 text-sm font-semibold tracking-[0.015em] text-white transition hover:border-[#354057] hover:bg-[#212530] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-[#111318] disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="absolute bottom-4 left-4 z-[5] flex flex-col gap-2 rounded-xl border border-[#282e39] bg-[#111318] p-1.5 shadow-lg shadow-black/30">
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
        onDeleteNode={handleDeleteNode}
        onRunNode={handleRunNode}
        onDeleteEdge={handleDeleteEdge}
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
