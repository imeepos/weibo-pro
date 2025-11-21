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
  useReactFlow,
} from '@xyflow/react'

import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  PlusSquare,
  PlayIcon,
  SaveIcon,
  SettingsIcon,
  Download,
  UploadIcon,
} from 'lucide-react'

import { fromJson, toJson, INode, WorkflowGraphAst, findNodeType, IEdge } from '@sker/workflow'
import { createNodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { getAllNodeTypes } from '../../adapters'
import { useWorkflow } from '../../hooks/useWorkflow'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { useClipboard } from '../../hooks/useClipboard'
import { useCanvasControls } from './useCanvasControls'
import { useCanvasState } from './useCanvasState'
import { useWorkflowOperations } from './useWorkflowOperations'
import { ContextMenu } from './ContextMenu'
import { NodeSelector } from './NodeSelector'
import { ShareDialog } from './ShareDialog'
import { Toast, type ToastType } from './Toast'
import { SubWorkflowModal } from '../SubWorkflowModal'
import { LeftDrawer } from '../LeftDrawer'
import { SettingPanel } from '../SettingPanel'
import { EdgeConfigDialog } from './EdgeConfigDialog'
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
  className = ''
}: WorkflowCanvasProps) {
  const workflow = useWorkflow(fromJson<WorkflowGraphAst>(workflowAst))
  const nodes = workflow.nodes
  const edges = workflow.edges
  const isCanvasEmpty = nodes.length === 0

  // 获取 ReactFlow 实例以访问 viewport API
  const { getViewport, setViewport } = useReactFlow()

  // 使用 CanvasState 集中管理所有状态
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
  } = useCanvasState()

  // 使用 WorkflowOperations 管理业务逻辑
  const { runNode, saveWorkflow, saveSubWorkflow, runWorkflow } = useWorkflowOperations(workflow, {
    onShowToast: showToast,
    onSetRunning: setIsRunning,
    onSetSaving: setIsSaving,
    getViewport,
  })

  /**
   * 恢复视图窗口状态
   *
   * 优雅设计：
   * - 如果 AST 中有保存的 viewport，恢复到该位置
   * - 如果没有，使用 fitView 自动适应
   * - 确保用户体验的连续性
   */
  React.useEffect(() => {
    if (workflow.workflowAst.viewport) {
      // 恢复保存的 viewport
      const { x, y, zoom } = workflow.workflowAst.viewport
      setViewport({ x, y, zoom }, { duration: 0 })
      console.log('恢复 viewport:', workflow.workflowAst.viewport)
    }
    // 注意：如果没有保存的 viewport，ReactFlow 的 fitView prop 会自动适应
  }, [workflow.workflowAst, setViewport])

  /**
   * 监听边双击删除事件
   *
   * 优雅设计：
   * - 边组件通过自定义事件触发删除
   * - 在这里统一处理，同步到 AST 和 UI
   * - 确保数据一致性
   */
  React.useEffect(() => {
    const handleEdgeDelete = (e: Event) => {
      const customEvent = e as CustomEvent
      const { edgeId } = customEvent.detail

      console.log('监听到 edge-delete 事件:', edgeId)

      // 查找完整的 edge 对象
      const edge = edges.find((e) => e.id === edgeId)
      if (edge) {
        console.log('删除边:', edge.id, 'source:', edge.source, 'target:', edge.target)
        workflow.removeEdge(edge)
        console.log('删除后 AST edges:', workflow.workflowAst.edges.length)
      } else {
        console.warn('Edge not found:', edgeId)
      }
    }

    window.addEventListener('edge-delete', handleEdgeDelete)
    return () => window.removeEventListener('edge-delete', handleEdgeDelete)
  }, [workflow, edges])

  /**
   * 监听打开子工作流事件
   *
   * 优雅设计：
   * - WorkflowGraphAstRender 组件通过自定义事件触发
   * - 在这里统一处理子工作流弹框的打开
   * - 确保父子工作流状态的一致性
   */
  React.useEffect(() => {
    const handleOpenSubWorkflow = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId, workflowAst } = customEvent.detail

      console.log('监听到 open-sub-workflow 事件:', { nodeId })

      openSubWorkflowModal({ nodeId, workflowAst })
    }

    window.addEventListener('open-sub-workflow', handleOpenSubWorkflow)
    return () => window.removeEventListener('open-sub-workflow', handleOpenSubWorkflow)
  }, [])

  /**
   * 监听打开设置面板事件
   *
   * 优雅设计：
   * - 节点渲染器通过自定义事件触发
   * - 在这里统一处理设置面板的打开
   * - 支持双击节点展开配置表单
   */
  React.useEffect(() => {
    const handleOpenSettingPanel = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId, nodeData } = customEvent.detail

      console.log('监听到 open-setting-panel 事件:', { nodeId })
      openSettingPanel({ nodeId, nodeData })
    }

    window.addEventListener('open-setting-panel', handleOpenSettingPanel)
    return () => window.removeEventListener('open-setting-panel', handleOpenSettingPanel)
  }, [])

  /**
   * 监听打开边配置对话框事件
   *
   * 优雅设计：
   * - 右键菜单通过自定义事件触发
   * - 在这里统一处理边配置对话框的打开
   */
  React.useEffect(() => {
    const handleOpenEdgeConfig = (e: Event) => {
      const customEvent = e as CustomEvent
      const { edgeId } = customEvent.detail

      console.log('监听到 open-edge-config 事件:', { edgeId })

      // 查找完整的 edge 对象
      const edge = edges.find((e) => e.id === edgeId)
      if (edge?.data?.edge) {
        openEdgeConfigDialog(edge.data.edge)
      }
    }

    window.addEventListener('open-edge-config', handleOpenEdgeConfig)
    return () => window.removeEventListener('open-edge-config', handleOpenEdgeConfig)
  }, [edges, openEdgeConfigDialog])

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
    const flowPosition = { x: 100, y: 100 } // 默认位置，实际应该用 screenToFlowPosition

    clipboard.pasteNodes(flowPosition, (newNodes, newEdges) => {
      // 将新节点添加到工作流
      newNodes.forEach((node) => {
        workflow.addNode(findNodeType(node.data.type), node.position, node.data.label)
      })

      // 将新边添加到工作流（AST + UI）
      newEdges.forEach((edge) => {
        if (edge.data?.edge) {
          // 同步到 AST
          workflow.workflowAst.addEdge(edge.data.edge)
        }
      })

      // 同步到 UI
      workflow.setEdges((currentEdges) => [...currentEdges, ...newEdges])

      console.log(`已粘贴 ${newNodes.length} 个节点和 ${newEdges.length} 条边`)
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

  const handleToggleCollapse = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) return

    workflow.setNodes((nodes) =>
      nodes.map((node) =>
        node.selected
          ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
          : node
      )
    )
  }, [getSelectedNodes, workflow])

  /**
   * 创建分组
   *
   * 将选中的节点组织为一个分组（WorkflowGraphAst）
   */
  const handleCreateGroup = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) {
      showToast('error', '请先选择节点', '至少选择一个节点才能创建分组')
      return
    }

    const selectedNodeIds = selectedNodes.map(n => n.id)
    const groupId = workflow.createGroup(selectedNodeIds)

    if (groupId) {
      showToast('success', '分组创建成功', `已将 ${selectedNodes.length} 个节点组织为分组`)
    }
  }, [getSelectedNodes, workflow, showToast])

  /**
   * 解散分组
   *
   * 如果选中的节点是分组，则解散它
   */
  const handleUngroupNodes = useCallback(() => {
    const selectedNodes = getSelectedNodes()
    if (selectedNodes.length === 0) {
      showToast('error', '请先选择分组', '请选择要解散的分组节点')
      return
    }

    const groupNodes = selectedNodes.filter(
      node => node.data instanceof WorkflowGraphAst && node.data.isGroup
    )

    if (groupNodes.length === 0) {
      showToast('error', '未选中分组', '选中的节点中没有分组')
      return
    }

    groupNodes.forEach(groupNode => {
      workflow.ungroupNodes(groupNode.id)
    })

    showToast('success', '分组已解散', `已解散 ${groupNodes.length} 个分组`)
  }, [getSelectedNodes, workflow, showToast])

  /**
   * 删除单个节点（右键菜单）
   *
   * 确保同步更新 AST 和 UI
   */
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      workflow.removeNode(nodeId)
    },
    [workflow]
  )

  const handleToggleNodeCollapse = useCallback(
    (nodeId: string) => {
      workflow.setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, collapsed: !node.data.collapsed } }
            : node
        )
      )
    },
    [workflow]
  )

  /**
   * 删除单个边（右键菜单）
   *
   * 确保同步更新 AST 和 UI
   */
  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      workflow.removeEdge(edgeId)
    },
    [workflow]
  )

  /**
   * 处理节点双击事件
   *
   * 打开左侧抽屉显示节点属性
   */
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    openDrawer(nodeId)
  }, [openDrawer])

  /**
   * 关闭左侧抽屉
   */
  const handleCloseDrawer = useCallback(() => {
    closeDrawer()
  }, [closeDrawer])

  /**
   * 监听节点双点击查看节点事件
   */
  React.useEffect(() => {
    const handleDoubleClick = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId } = customEvent.detail
      handleNodeDoubleClick(nodeId)
    }

    window.addEventListener('node-double-click', handleDoubleClick)
    return () => window.removeEventListener('node-double-click', handleDoubleClick)
  }, [])

  /**
   * 监听节点选择变化事件
   *
   * 单击节点时选中（高亮），但不自动打开抽屉
   */
  React.useEffect(() => {
    const handleNodeClick = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId } = customEvent.detail
      console.log('节点被选中:', nodeId)
    }

    window.addEventListener('node-selected', handleNodeClick)
    return () => window.removeEventListener('node-selected', handleNodeClick)
  }, [])

  // 处理保存快捷键
  const handleSave = useCallback(() => {
    saveWorkflow(workflow.workflowAst?.name || 'Untitled')
  }, [saveWorkflow, workflow.workflowAst])

  /**
   * 验证工作流数据的完整性
   *
   * 优雅设计：
   * - 分层验证：格式 → 节点类型 → 边完整性
   * - 详细的错误信息，帮助用户定位问题
   * - 返回 { valid, errors } 结构，便于批量展示错误
   */
  const validateWorkflowData = useCallback((data: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // 1. 基础格式验证
    if (!data || typeof data !== 'object') {
      errors.push('无效的数据格式')
      return { valid: false, errors }
    }

    if (!data.workflow) {
      errors.push('缺少 workflow 字段')
      return { valid: false, errors }
    }

    const workflowData = data.workflow

    // 2. 工作流结构验证
    if (!workflowData.type || workflowData.type !== 'WorkflowGraphAst') {
      errors.push(`无效的工作流类型: ${workflowData.type || '未指定'}`)
    }

    if (!Array.isArray(workflowData.nodes)) {
      errors.push('nodes 字段必须是数组')
    }

    if (!Array.isArray(workflowData.edges)) {
      errors.push('edges 字段必须是数组')
    }

    // 如果基础结构有问题，直接返回
    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // 3. 节点类型验证
    const registeredNodeTypes = getAllNodeTypes()
    const nodeTypeNames = new Set(registeredNodeTypes.map((type: any) => type.name))
    const nodeIds = new Set<string>()

    workflowData.nodes.forEach((node: INode, index: number) => {
      // 收集节点 ID
      if (node.id) {
        nodeIds.add(node.id)
      } else {
        errors.push(`节点 #${index + 1} 缺少 id 字段`)
      }

      // 检查节点类型是否已注册
      if (!node.type) {
        errors.push(`节点 #${index + 1} (id: ${node.id || 'unknown'}) 缺少 type 字段`)
      } else if (!nodeTypeNames.has(node.type)) {
        errors.push(
          `节点 #${index + 1} (id: ${node.id}) 的类型 "${node.type}" 未注册。` +
          `请确保所有必需的节点类型已安装。`
        )
      }
    })

    // 4. 边完整性验证
    workflowData.edges.forEach((edge: any, index: number) => {
      if (!edge.from) {
        errors.push(`边 #${index + 1} 缺少 from 字段`)
      } else if (!nodeIds.has(edge.from)) {
        errors.push(`边 #${index + 1} 的源节点 "${edge.from}" 不存在`)
      }

      if (!edge.to) {
        errors.push(`边 #${index + 1} 缺少 to 字段`)
      } else if (!nodeIds.has(edge.to)) {
        errors.push(`边 #${index + 1} 的目标节点 "${edge.to}" 不存在`)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }, [])

  /**
   * 导出工作流为 JSON 文件
   *
   * 优雅设计：
   * - 先保存 viewport 状态，确保导出包含完整的视图信息
   * - 使用工作流名称和时间戳生成文件名
   * - 通过 Blob 和 URL.createObjectURL 触发浏览器下载
   * - 自动清理临时 URL，避免内存泄漏
   */
  const handleExportWorkflow = useCallback(() => {
    try {
      // 保存当前 viewport 状态
      workflow.workflowAst.viewport = getViewport()

      // 序列化工作流数据
      const workflowJson = toJson(workflow.workflowAst)
      const exportData = {
        workflow: workflowJson
      }

      // 创建 Blob 并触发下载
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `workflow-${workflow.workflowAst.name || 'untitled'}-${Date.now()}.json`

      link.href = url
      link.download = filename
      link.click()

      // 清理临时 URL
      URL.revokeObjectURL(url)

      showToast('success', '导出成功', `工作流已导出为 ${filename}`)
    } catch (error) {
      console.error('导出工作流失败:', error)
      showToast('error', '导出失败', error instanceof Error ? error.message : '未知错误')
    }
  }, [workflow, getViewport, showToast])

  /**
   * 从文件导入工作流（通用逻辑）
   *
   * 优雅设计：
   * - 统一处理按钮导入和拖拽导入
   * - 避免代码重复
   * - 便于维护和扩展
   */
  const processImportFile = useCallback(async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // 完整验证数据格式
      const validation = validateWorkflowData(data)
      if (!validation.valid) {
        const errorMessage = validation.errors.join('\n• ')
        throw new Error(`工作流验证失败：\n\n• ${errorMessage}`)
      }

      // 反序列化工作流
      const importedWorkflow = fromJson<WorkflowGraphAst>(data.workflow)

      // 智能检测：画布为空直接导入，否则显示确认对话框
      if (isCanvasEmpty) {
        // 直接替换当前工作流
        Object.assign(workflow.workflowAst, importedWorkflow)
        workflow.syncFromAst()

        // 自动适应视图
        setTimeout(() => {
          handleFitView()
        }, 100)

        showToast('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
      } else {
        // 画布有内容，显示确认对话框
        const confirmReplace = window.confirm(
          '当前画布已有内容。\n\n' +
          '• 确定：覆盖当前工作流\n' +
          '• 取消：取消导入'
        )

        if (confirmReplace) {
          Object.assign(workflow.workflowAst, importedWorkflow)
          workflow.syncFromAst()

          setTimeout(() => {
            handleFitView()
          }, 100)

          showToast('success', '导入成功', `已导入工作流 "${importedWorkflow.name || '未命名'}"`)
        }
      }
    } catch (error) {
      console.error('导入工作流失败:', error)
      showToast('error', '导入失败', error instanceof Error ? error.message : '文件格式不正确')
    }
  }, [workflow, isCanvasEmpty, handleFitView, showToast, validateWorkflowData])

  /**
   * 导入工作流从 JSON 文件（按钮触发）
   *
   * 优雅设计：
   * - 使用隐藏的 input 元素触发文件选择
   * - 委托给 processImportFile 处理具体逻辑
   */
  const handleImportWorkflow = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await processImportFile(file)
      }
    }

    input.click()
  }, [processImportFile])

  /**
   * 处理文件拖拽到画布
   *
   * 优雅设计：
   * - 阻止默认行为，确保浏览器不会打开文件
   * - 只接受 JSON 文件
   * - 复用 processImportFile 处理导入逻辑
   */
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const files = Array.from(event.dataTransfer.files)
      const jsonFile = files.find((file) => file.name.endsWith('.json'))

      if (jsonFile) {
        processImportFile(jsonFile)
      } else if (files.length > 0) {
        showToast('error', '文件类型错误', '请拖拽 JSON 格式的工作流文件')
      }
    },
    [processImportFile, showToast]
  )

  /**
   * 处理拖拽经过画布
   *
   * 优雅设计：
   * - 阻止默认行为，允许拖放
   * - 提供视觉反馈
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    // 设置拖放效果
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  // 集成键盘快捷键
  useKeyboardShortcuts({
    enabled: true,
    onCopy: handleCopy,
    onCut: handleCut,
    onPaste: handlePaste,
    onDelete: handleDelete,
    onSelectAll: handleSelectAll,
    onSave: handleSave,
    onToggleCollapse: handleToggleCollapse,
    onCreateGroup: handleCreateGroup,
    onUngroupNodes: handleUngroupNodes,
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
      console.log('删除边:', edgesToDelete.length, '条')
      edgesToDelete.forEach((edge) => {
        console.log('删除边:', edge.id, 'source:', edge.source, 'target:', edge.target)
        workflow.removeEdge(edge)  // 传入完整的 edge 对象
      })
      console.log('删除后 AST edges:', workflow.workflowAst.edges.length)
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
   * 关闭子工作流弹框
   */
  const handleCloseSubWorkflowModal = useCallback(() => {
    closeSubWorkflowModal()
  }, [closeSubWorkflowModal])

  /**
   * 关闭设置面板
   */
  const handleCloseSettingPanel = useCallback(() => {
    closeSettingPanel()
  }, [closeSettingPanel])

  /**
   * 保存边配置
   *
   * 优雅设计：
   * - 同步更新 AST 和 UI
   * - 确保数据一致性
   */
  const handleSaveEdgeConfig = useCallback((edgeConfig: Partial<IEdge>) => {
    if (!edgeConfigDialog.edge) return

    const edgeId = edgeConfigDialog.edge.id
    console.log('保存边配置:', edgeId, edgeConfig)

    // 更新 AST 中的边
    const astEdge = workflow.workflowAst.edges.find((e: IEdge) => e.id === edgeId)
    if (astEdge) {
      Object.assign(astEdge, edgeConfig)
    }

    // 更新 UI 中的边
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

  /**
   * 配置边（右键菜单触发）
   *
   * 优雅设计：
   * - 触发自定义事件，统一处理边配置对话框的打开
   */
  const handleConfigEdge = useCallback((edgeId: string) => {
    const customEvent = new CustomEvent('open-edge-config', {
      detail: { edgeId },
    })
    window.dispatchEvent(customEvent)
  }, [])

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
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            nodeTypes={createNodeTypes()}
            edgeTypes={edgeTypes}
            panOnScroll
            selectionOnDrag={true}
            panOnDrag={panOnDrag}
            selectionMode={SelectionMode.Partial}
            fitView={!workflow.workflowAst.viewport}  // 只有在没有保存的 viewport 时才自动适应
            deleteKeyCode="Delete"
            snapToGrid={snapToGrid}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            minZoom={0.1}
            maxZoom={4}
            zoomOnDoubleClick={false}  // 禁用双击缩放，确保双击空白区域只打开节点选择器
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
            <div className="absolute bottom-60 right-4 z-[5] flex flex-col gap-2 rounded-xl border border-[#282e39] bg-[#111318] p-1.5 shadow-lg shadow-black/30">
              <button
                onClick={() => runWorkflow()}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <PlayIcon className="h-4 w-4" strokeWidth={2} />
              </button>

              <button
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <SettingsIcon className="h-4 w-4" strokeWidth={2} />
              </button>

              <button
                onClick={() => handleSave()}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
              >
                <SaveIcon className="h-4 w-4" strokeWidth={2} />
              </button>

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

              <button
                onClick={handleImportWorkflow}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
                title="导入工作流"
              >
                <UploadIcon className="h-4 w-4" strokeWidth={2}/>
              </button>

              <button
                onClick={handleExportWorkflow}
                className="flex h-9 w-9 items-center justify-center rounded-md text-[#9da6b9] transition hover:bg-[#282e39] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]"
                title="导出工作流"
              >
                <Download className="h-4 w-4" strokeWidth={2} />
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
        onRunNode={runNode}
        onToggleNodeCollapse={handleToggleNodeCollapse}
        onDeleteEdge={handleDeleteEdge}
        onConfigEdge={handleConfigEdge}
        onCreateGroup={handleCreateGroup}
        onUngroupNodes={handleUngroupNodes}
        onClose={closeMenu}
        nodeData={menu.contextType === 'node' && menu.targetId ? nodes.find(n => n.id === menu.targetId)?.data : undefined}
        hasMultipleSelectedNodes={getSelectedNodes().length > 1}
        isGroupNode={
          menu.contextType === 'node' && menu.targetId
            ? nodes.find(n => n.id === menu.targetId)?.data instanceof WorkflowGraphAst && nodes.find(n => n.id === menu.targetId)?.data.isGroup
            : false
        }
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
        onClose={handleCloseSubWorkflowModal}
        onSave={saveSubWorkflow}
      />

      {settingPanel.visible && (
        <SettingPanel
          nodeId={settingPanel.nodeId || null}
          nodeData={settingPanel.nodeData}
          onClose={handleCloseSettingPanel}
        />
      )}

      <LeftDrawer
        visible={drawer.visible}
        onClose={handleCloseDrawer}
        onRunNode={runNode}
        onLocateNode={handleLocateNode}
      />

      <EdgeConfigDialog
        visible={edgeConfigDialog.visible}
        edge={edgeConfigDialog.edge}
        onClose={closeEdgeConfigDialog}
        onSave={handleSaveEdgeConfig}
      />
    </div>
  )
}
