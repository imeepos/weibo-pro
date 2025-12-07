'use client'
import React, { useCallback, useState, useEffect, useImperativeHandle, forwardRef, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  SelectionMode,
  ReactFlowProvider,
  type Connection,
  type NodeChange,
  type EdgeChange,
  useReactFlow,
  useUpdateNodeInternals,
} from '@xyflow/react'

import { fromJson, INode, WorkflowGraphAst, toJson, createWorkflowGraphAst } from '@sker/workflow'
import type { WorkflowNode, WorkflowEdge } from '../../types'
import { createNodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useWorkflowHistory } from '../../hooks/useWorkflowHistory'
import { useCanvasControls } from './useCanvasControls'
import { useCanvasState } from './useCanvasState'
import { useWorkflowOperations } from './useWorkflowOperations'
import { validateEdge } from '../../utils/edgeValidator'

// 新的业务逻辑钩子
import { useFileOperations } from './hooks/useFileOperations'
import { useNodeOperations } from './hooks/useNodeOperations'
import { useEventHandlers } from './hooks/useEventHandlers'
import { WorkflowOperationsContext, type WorkflowOperations } from '../../context/workflow-operations'

// 纯展示组件（来自 @sker/ui）
import { WorkflowControls, WorkflowMenubar, WorkflowEmptyState, WorkflowMinimap } from '@sker/ui/components/workflow'
import { Toaster } from '@sker/ui/components/ui'

// 原有组件
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
import { cn } from '../../utils/cn'
import { getAllNodeTypes } from '../../adapters'

/**
 * WorkflowCanvas 命令式 API 接口
 * 通过 ref 暴露给外部的方法
 */
export interface WorkflowCanvasRef {
  // 文件操作
  importWorkflow: (json: string) => Promise<void>
  exportWorkflow: () => string

  // 执行控制
  runWorkflow: () => Promise<void>
  cancelWorkflow: () => void
  runNode: (nodeId: string) => Promise<void>
  runNodeIsolated: (nodeId: string) => Promise<void>

  // 视图操作
  autoLayout: (direction?: 'TB' | 'LR') => void
  fitView: () => void
  zoomIn: () => void
  zoomOut: () => void
  centerView: () => void
  locateNode: (nodeId: string) => void

  // 节点操作
  selectAll: () => void
  deleteSelection: () => void
  copyNodes: () => void
  pasteNodes: () => void

  // 数据访问
  getWorkflowAst: () => WorkflowGraphAst
  getSelectedNodes: () => INode[]
}

export interface WorkflowCanvasProps {
  /** 工作流 AST 实例 */
  workflowAst?: INode
  /** 是否显示小地图 */
  showMiniMap?: boolean
  /** 是否显示控制面板 */
  showControls?: boolean
  /** 是否使用水平菜单栏（默认 false 使用垂直按钮组） */
  useMenubar?: boolean
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
 * 工作流画布内部组件
 *
 * 职责：包含所有需要访问 ReactFlow 上下文的逻辑
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

  const { triggerSave, saveNow } = useAutoSave(workflow.workflowAst, {
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
  const {
    isRunning,
    setIsRunning,
    isSaving,
    setIsSaving,
    shareDialog,
    closeShareDialog,
    subWorkflowModal,
    openSubWorkflowModal,
    closeSubWorkflowModal,
    showToast,
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
    scheduleDialog,
    openScheduleDialog,
    closeScheduleDialog,
    schedulePanel,
    openSchedulePanel,
    closeSchedulePanel,
    runHistoryPanel,
    openRunHistoryPanel,
    closeRunHistoryPanel,
    runConfigDialog,
    openRunConfigDialog,
    closeRunConfigDialog,
  } = useCanvasState()

  // 撤销/重做历史（直接从 workflow 实例获取）
  const { canUndo, canRedo, undo, redo } = workflow

  // 连线状态追踪
  const [connectingInfo, setConnectingInfo] = useState<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  } | null>(null)

  // 鼠标位置追踪（用于智能粘贴）
  const [lastMousePosition, setLastMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // 全局鼠标移动监听（确保始终追踪到最新位置）
  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      setLastMousePosition({
        x: event.clientX,
        y: event.clientY
      })
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove)
  }, [])

  // 主题检测
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

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
  const { runNode, runNodeIsolated, saveWorkflow, saveSubWorkflow: originalSaveSubWorkflow, runWorkflow, cancelWorkflow } = useWorkflowOperations(workflow, {
    onShowToast: showToast,
    onSetRunning: setIsRunning,
    onSetSaving: setIsSaving,
    getViewport,
  })

  // 包装 saveSubWorkflow，保存后刷新节点端口
  const saveSubWorkflow = useCallback(
    (parentNodeId: string, updatedAst: WorkflowGraphAst) => {
      const result = originalSaveSubWorkflow(parentNodeId, updatedAst)

      // 如果保存成功（返回了 parentNodeId），刷新该节点的端口
      if (result) {
        // 使用 requestAnimationFrame 确保在下一帧渲染后刷新
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updateNodeInternals(result)
          })
        })
      }

      return result
    },
    [originalSaveSubWorkflow, updateNodeInternals]
  )

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
    onPaste: () => {
      // 将屏幕坐标转换为 Flow 坐标
      const flowPosition = screenToFlowPosition(lastMousePosition)
      pasteNodes(flowPosition)
    },
    onDelete: deleteSelection,
    onSelectAll: handleSelectAll,
    onSave: customOnSave || (() => saveWorkflow(workflow.workflowAst?.name || 'Untitled')),
    onCancel: cancelWorkflow,
    onToggleCollapse: () => { }, // 通过节点操作钩子处理
    onUndo: undo,
    onRedo: redo,
    onCreateGroup: createGroup,
    onUngroupNodes: ungroupNodes,
    onCollapseNodes: collapseNodes,
    onExpandNodes: expandNodes,
    onAutoLayout: autoLayout,
  })

  // 暴露命令式 API
  useImperativeHandle(ref, () => ({
    // 文件操作
    importWorkflow: async (json: string) => {
      try {
        // importWorkflow 是按钮触发函数，不接受参数
        // 这里需要直接处理 JSON 字符串
        const data = JSON.parse(json)
        const importedWorkflow = fromJson<WorkflowGraphAst>(data.workflow || data)

        Object.assign(workflow.workflowAst, importedWorkflow)
        workflow.syncFromAst()

        if (handleFitView) {
          setTimeout(() => {
            handleFitView()
          }, 100)
        }

        showToast('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
      } catch (error) {
        console.error('导入工作流失败:', error)
        showToast('error', '导入失败', error instanceof Error ? error.message : '未知错误')
        throw error
      }
    },
    exportWorkflow: () => {
      try {
        if (!workflow?.workflowAst) {
          return ''
        }

        const workflowJson = toJson(workflow.workflowAst)
        const exportData = {
          workflow: workflowJson
        }

        return JSON.stringify(exportData, null, 2)
      } catch (error) {
        console.error('导出工作流失败:', error)
        return ''
      }
    },

    // 执行控制
    runWorkflow: async () => {
      await runWorkflow()
    },
    cancelWorkflow: () => {
      cancelWorkflow()
    },
    runNode: async (nodeId: string) => {
      await runNode(nodeId)
    },
    runNodeIsolated: async (nodeId: string) => {
      await runNodeIsolated(nodeId)
    },

    // 视图操作
    autoLayout: (direction?: 'TB' | 'LR') => {
      // autoLayout 不接受参数，这里忽略参数
      autoLayout()
    },
    fitView: () => {
      handleFitView()
    },
    zoomIn: () => {
      handleZoomIn()
    },
    zoomOut: () => {
      handleZoomOut()
    },
    centerView: () => {
      handleCenterView()
    },
    locateNode: (nodeId: string) => {
      handleLocateNode(nodeId)
    },

    // 节点操作
    selectAll: () => {
      handleSelectAll()
    },
    deleteSelection: () => {
      deleteSelection()
    },
    copyNodes: () => {
      copyNodes()
    },
    pasteNodes: () => {
      pasteNodes()
    },

    // 数据访问
    getWorkflowAst: () => {
      workflow.workflowAst.viewport = getViewport()
      return workflow.workflowAst
    },
    getSelectedNodes: () => {
      return workflow.nodes.filter((n) => n.selected).map((n) => n.data)
    },
  }), [
    exportWorkflow,
    runWorkflow, cancelWorkflow, runNode, runNodeIsolated,
    autoLayout, handleFitView, handleZoomIn, handleZoomOut, handleCenterView, handleLocateNode,
    handleSelectAll, deleteSelection, copyNodes, pasteNodes,
    workflow, showToast
  ])

  // 处理连线
  const handleNodesChangeInternal = useCallback((changes: NodeChange[]) => {
    workflow.onNodesChange(changes)
  }, [workflow])

  const handleEdgesChangeInternal = useCallback((changes: EdgeChange[]) => {
    // 检测边选中事件并打印边数据结构
    workflow.onEdgesChange(changes)
  }, [workflow])

  const handleConnectInternal = useCallback((connection: Connection) => {
    // 创建临时边对象用于验证
    const tempEdge: WorkflowEdge = {
      id: `temp-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'workflow-data-edge',
      data: { edgeType: 'data' }
    }

    // 验证边的合法性
    const { valid, errors } = validateEdge(
      tempEdge,
      workflow.nodes.map((n) => n.data),
      workflow.edges
    )

    if (!valid) {
      showToast('error', '连接失败', errors.join('；'))
      return
    }

    workflow.connectNodes(connection)
  }, [workflow, showToast])

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

  const handleNodesDelete = useCallback((nodesToDelete: WorkflowNode[]) => {
    nodesToDelete.forEach((node) => workflow.removeNode(node.id))
  }, [workflow])

  const handleEdgesDelete = useCallback((edgesToDelete: WorkflowEdge[]) => {
    edgesToDelete.forEach((edge) => workflow.removeEdge(edge))
  }, [workflow])

  // 边事件处理
  const handleEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: WorkflowEdge) => {
    // 直接打开边配置对话框
    const astEdge = workflow.workflowAst.edges.find((e) => e.id === edge.id)
    if (astEdge) {
      openEdgeConfigDialog(astEdge)
    }
  }, [workflow.workflowAst.edges, openEdgeConfigDialog])

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: WorkflowEdge) => {
    event.preventDefault()
    console.log('[handleEdgeContextMenu] 右键边:', edge.id)
    // 打开右键菜单
    const screenPosition = { x: event.clientX, y: event.clientY }
    const flowPosition = screenToFlowPosition(screenPosition)

    // 使用 useCanvasControls 的 menu 系统
    const customEvent = new CustomEvent('edge-context-menu', {
      detail: { edgeId: edge.id, event },
    })
    window.dispatchEvent(customEvent)
  }, [screenToFlowPosition])

  const handleAddNodeFromSelector = useCallback((metadata: any) => {
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

    workflow.setEdges((currentEdges) =>
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
  const handleSaveWorkflowSettings = useCallback(async (settings: any) => {
    if (settings.name) {
      workflow.workflowAst.name = settings.name
    }
    if (settings.description !== undefined) {
      workflow.workflowAst.description = settings.description
    }
    if (settings.color) {
      workflow.workflowAst.color = settings.color
    }
    if (settings.tags !== undefined) {
      workflow.workflowAst.tags = settings.tags
    }

    // 保存到后端
    await saveWorkflow(settings.name || workflow.workflowAst.name)

    showToast('success', '工作流设置已保存', `已更新工作流 "${settings.name || '未命名'}" 的属性`)
  }, [workflow, showToast, saveWorkflow])

  /**
   * 检测工作流是否有需要配置的输入节点
   * 优雅设计：只要有入度为 0 的起始节点，就认为需要配置
   */
  const hasConfigurableInputs = useCallback(() => {
    if (!workflow.workflowAst?.nodes || !workflow.workflowAst?.edges) {
      return false
    }

    return workflow.workflowAst.nodes.some((node) => {
      const hasIncomingEdges = workflow.workflowAst!.edges.some(
        (edge: any) => edge.to === node.id
      )
      return !hasIncomingEdges  // 没有输入边 = 起始节点
    })
  }, [workflow])

  /**
   * 处理工作流运行
   * 优雅设计：自动检测是否需要配置输入，提供流畅的用户体验
   */
  const handleRunWorkflow = useCallback(() => {
    if (hasConfigurableInputs()) {
      openRunConfigDialog()
    } else {
      runWorkflow()
    }
  }, [hasConfigurableInputs, openRunConfigDialog, runWorkflow])

  const isCanvasEmpty = workflow.nodes.length === 0

  // MiniMap 节点颜色映射
  const getMiniMapNodeColor = useCallback((node: any) => {
    const status = node.data?.state
    if (!status || status === 'pending') {
      return 'hsl(var(--muted-foreground))'
    }

    const statusColors: Record<string, string> = {
      running: 'hsl(var(--node-running))',
      emitting: 'hsl(var(--node-emitting))',
      success: 'hsl(var(--node-success))',
      fail: 'hsl(var(--node-error))',
    }

    return statusColors[status] || 'hsl(var(--muted-foreground))'
  }, [])

  // 准备工作流操作上下文
  const workflowOps: WorkflowOperations = useMemo(() => ({
    toggleGroupCollapse: workflow.toggleGroupCollapse,
    openSubWorkflow: (nodeId, workflowAst) => {
      openSubWorkflowModal({ nodeId, workflowAst })
    },
    selectNode: (nodeId) => {
      const targetNode = workflow.nodes.find(n => n.id === nodeId)
      if (targetNode && onNodeClick) {
        const mouseEvent = new MouseEvent('click') as unknown as React.MouseEvent
        onNodeClick(mouseEvent, targetNode)
      }
    }
  }), [workflow, openSubWorkflowModal, onNodeClick])

  return (
    <WorkflowOperationsContext.Provider value={workflowOps}>
      <div
        className={cn(
          'workflow-canvas relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#111318] text-white',
          className
        )}
      >
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
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMove={handleViewportChange}
        nodeTypes={nodeTypes}
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
        {showMiniMap && <WorkflowMinimap nodeColor={getMiniMapNodeColor} />}
      </ReactFlow>

      {isCanvasEmpty && <WorkflowEmptyState />}

      {showControls && !useMenubar && (
        <WorkflowControls
          className="absolute left-4 top-4 z-[5]"
          onRun={handleRunWorkflow}
          onCancel={cancelWorkflow}
          onSave={customOnSave || (() => saveWorkflow(workflow.workflowAst?.name || 'Untitled'))}
          onExport={exportWorkflow}
          onImport={importWorkflow}
          onSettings={openWorkflowSettingsDialog}
          onSchedule={() => {
            const workflowName = workflow.workflowAst?.name
            if (workflowName) {
              openScheduleDialog(workflowName)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能创建调度')
            }
          }}
          onScheduleList={() => {
            const workflowName = workflow.workflowAst?.name
            if (workflowName) {
              openSchedulePanel(workflowName)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能查看调度')
            }
          }}
          onRunHistory={() => {
            const workflowId = workflow.workflowAst?.id
            if (workflowId) {
              openRunHistoryPanel(workflowId)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能查看运行历史')
            }
          }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onCollapseNodes={collapseNodes}
          onExpandNodes={expandNodes}
          onAutoLayout={autoLayout}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          isRunning={isRunning}
          isSaving={isSaving}
        />
      )}

      {showControls && useMenubar && (
        <WorkflowMenubar
          className="absolute left-4 top-4 z-[5]"
          onRun={handleRunWorkflow}
          onCancel={cancelWorkflow}
          onSave={customOnSave || (() => saveWorkflow(workflow.workflowAst?.name || 'Untitled'))}
          onExport={exportWorkflow}
          onImport={importWorkflow}
          onSettings={openWorkflowSettingsDialog}
          onSchedule={() => {
            const workflowName = workflow.workflowAst?.name
            if (workflowName) {
              openScheduleDialog(workflowName)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能创建调度')
            }
          }}
          onScheduleList={() => {
            const workflowName = workflow.workflowAst?.name
            if (workflowName) {
              openSchedulePanel(workflowName)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能查看调度')
            }
          }}
          onRunHistory={() => {
            const workflowId = workflow.workflowAst?.id
            if (workflowId) {
              openRunHistoryPanel(workflowId)
            } else {
              showToast('error', '请先保存工作流', '只有保存的工作流才能查看运行历史')
            }
          }}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitView={handleFitView}
          onCollapseNodes={collapseNodes}
          onExpandNodes={expandNodes}
          onAutoLayout={autoLayout}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          isRunning={isRunning}
          isSaving={isSaving}
        />
      )}
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