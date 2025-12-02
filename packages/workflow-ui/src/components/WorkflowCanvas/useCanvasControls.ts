import { useCallback, useEffect } from 'react'
import { useReactFlow, type Connection, } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import { getAllNodeTypes, getNodeMetadata } from '../../adapters'
import { generateId } from '@sker/workflow'
import type { WorkflowEdge, WorkflowNode, NodeMetadata } from '../../types'
import { useContextMenu } from './useContextMenu'

/**
 * 画布交互控制 Hook
 */
export function useCanvasControls() {
  const {
    getNode,
    screenToFlowPosition,
    fitView,
    setCenter,
    zoomTo,
    zoomIn,
    zoomOut,
    getNodes,
    setNodes,
    setEdges,
    addEdges,
  } = useReactFlow()
  const { selectNode, clearSelection } = useSelectionStore()
  const { menu, openNodeMenu, openEdgeMenu, closeMenu, nodeSelector, openNodeSelector, closeNodeSelector } = useContextMenu()

  /**
   * 监听节点右键菜单事件
   */
  useEffect(() => {
    const handleNodeContextMenu = (e: Event) => {
      const customEvent = e as CustomEvent
      const { nodeId, event, nodeData } = customEvent.detail
      const screenPosition = { x: event.clientX, y: event.clientY }
      const flowPosition = screenToFlowPosition(screenPosition)
      openNodeMenu(screenPosition, flowPosition, nodeId, nodeData)
    }

    window.addEventListener('node-context-menu', handleNodeContextMenu)
    return () => window.removeEventListener('node-context-menu', handleNodeContextMenu)
  }, [openNodeMenu, screenToFlowPosition])

  /**
   * 监听边右键菜单事件
   */
  useEffect(() => {
    const handleEdgeContextMenu = (e: Event) => {
      const customEvent = e as CustomEvent
      const { edgeId, event } = customEvent.detail
      const screenPosition = { x: event.clientX, y: event.clientY }
      const flowPosition = screenToFlowPosition(screenPosition)
      openEdgeMenu(screenPosition, flowPosition, edgeId)
    }

    window.addEventListener('edge-context-menu', handleEdgeContextMenu)
    return () => window.removeEventListener('edge-context-menu', handleEdgeContextMenu)
  }, [openEdgeMenu, screenToFlowPosition])

  /**
   * 注意：边的双击删除事件现在由 WorkflowCanvas 统一处理
   * 以确保同时更新 AST 和 UI 状态
   */

  /**
   * 处理连接事件
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const edge: WorkflowEdge = {
        id: generateId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'workflow-data-edge',
        data: {
          edgeType: 'data',
          edge: {
            id: generateId(),
            type: 'data',
            from: connection.source,
            to: connection.target,
            fromProperty: connection.sourceHandle || undefined,
            toProperty: connection.targetHandle || undefined,
          },
        },
      }

      addEdges([edge])
    },
    [addEdges]
  )

  /**
   * 处理节点选择
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id)
    },
    [selectNode]
  )

  /**
   * 处理画布点击（清空选择）
   */
  const onPaneClick = useCallback(
    (_event: React.MouseEvent) => {
      clearSelection()
    },
    [clearSelection]
  )

  /**
   * 处理节点删除
   */
  const onNodesDelete = useCallback(
    (nodesToDelete: any[]) => {
      const nodeIdsToDelete = new Set(nodesToDelete.map((node) => node.id))
      setNodes((nodes) => nodes.filter((node) => !nodeIdsToDelete.has(node.id)))
      setEdges((edges) =>
        edges.filter((edge) =>
          !nodeIdsToDelete.has(edge.source) && !nodeIdsToDelete.has(edge.target)
        )
      )
    },
    [setNodes, setEdges]
  )

  /**
   * 处理边删除
   */
  const onEdgesDelete = useCallback(
    (edgesToDelete: any[]) => {
      const edgeIdsToDelete = new Set(edgesToDelete.map((edge) => edge.id))
      setEdges((edges) => edges.filter((edge) => !edgeIdsToDelete.has(edge.id)))
    },
    [setEdges]
  )

  /**
   * 处理右键菜单（空白画布：打开节点选择器）
   */
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()

      const screenPosition = { x: event.clientX, y: event.clientY }
      const flowPosition = screenToFlowPosition(screenPosition)

      openNodeSelector(screenPosition, flowPosition)
    },
    [openNodeSelector, screenToFlowPosition]
  )

  /**
   * 从上下文菜单添加节点
   */
  const handleAddNodeFromMenu = useCallback(
    (metadata: NodeMetadata) => {
      const nodeTypes = getAllNodeTypes()
      const NodeClass = nodeTypes.find((type) => type.name === metadata.type)

      if (!NodeClass) {
        console.error(`Node class not found for type: ${metadata.type}`)
        return
      }

      const ast = new NodeClass()
      ast.id = generateId()

      const nodeMetadata = getNodeMetadata(NodeClass)
      const node: WorkflowNode = {
        id: ast.id,
        type: nodeMetadata.type,
        position: menu.flowPosition,
        data: ast,
      }

      setNodes((nodes) => [...nodes, node])
    },
    [setNodes, menu.flowPosition]
  )

  /**
   * 从节点选择器添加节点
   */
  const handleAddNodeFromSelector = useCallback(
    (metadata: NodeMetadata) => {
      const nodeTypes = getAllNodeTypes()
      const NodeClass = nodeTypes.find((type) => type.name === metadata.type)

      if (!NodeClass) {
        console.error(`Node class not found for type: ${metadata.type}`)
        return
      }

      const ast = new NodeClass()
      ast.id = generateId()

      const nodeMetadata = getNodeMetadata(NodeClass)
      const node: WorkflowNode = {
        id: ast.id,
        type: nodeMetadata.type,
        position: nodeSelector.flowPosition,
        data: ast,
      }

      setNodes((nodes) => [...nodes, node])
    },
    [setNodes, nodeSelector.flowPosition]
  )

  /**
   * 适应窗口
   */
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 })
  }, [fitView])

  /**
   * 居中显示
   */
  const handleCenterView = useCallback(() => {
    const nodes = getNodes()
    if (nodes.length === 0) return

    const sumX = nodes.reduce((sum, node) => sum + node.position.x, 0)
    const sumY = nodes.reduce((sum, node) => sum + node.position.y, 0)
    const centerX = sumX / nodes.length
    const centerY = sumY / nodes.length

    setCenter(centerX, centerY, { zoom: 1, duration: 300 })
  }, [getNodes, setCenter])

  /**
   * 重置缩放
   */
  const handleResetZoom = useCallback(() => {
    zoomTo(1, { duration: 300 })
  }, [zoomTo])

  /**
   * 放大
   */
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 })
  }, [zoomIn])

  /**
   * 缩小
   */
  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 })
  }, [zoomOut])

  /**
   * 全选节点
   */
  const handleSelectAll = useCallback(() => {
    const nodes = getNodes()
    const updatedNodes = nodes.map((node) => ({
      ...node,
      selected: true,
    }))
    setNodes(updatedNodes)
  }, [getNodes, setNodes])

  /**
   * 清空画布
   */
  const handleClearCanvas = useCallback(() => {
    const nodes = getNodes()
    if (
      nodes.length === 0 ||
      confirm('确定要清空画布吗？此操作无法撤销。')
    ) {
      setNodes([])
      setEdges([])
    }
  }, [getNodes, setNodes, setEdges])


  /**
   * 运行节点（暂时留空，后续实现）
   */
  const handleRunNode = useCallback((nodeId: string) => {
    // TODO: 实现节点运行逻辑
  }, [])

  /**
   * 定位到指定节点
   */
  const handleLocateNode = useCallback((nodeId: string) => {
    const node = getNode(nodeId)

    if (!node) {
      console.warn(`Node not found: ${nodeId}`)
      return
    }

    const centerX = node.position.x + (node.width || 0) / 2
    const centerY = node.position.y + (node.height || 0) / 2

    setCenter(centerX, centerY, { zoom: 1.2, duration: 300 })

    const updatedNodes = getNodes().map(n => ({
      ...n,
      selected: n.id === nodeId,
    }))
    setNodes(updatedNodes)
    selectNode(nodeId)
  }, [getNode, setCenter, getNodes, setNodes, selectNode])

  return {
    onConnect,
    onNodeClick,
    onPaneClick,
    onNodesDelete,
    onEdgesDelete,
    onPaneContextMenu,
    menu,
    closeMenu,
    nodeSelector,
    openNodeSelector,
    closeNodeSelector,
    handleAddNodeFromMenu,
    handleAddNodeFromSelector,
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleZoomIn,
    handleZoomOut,
    handleSelectAll,
    handleClearCanvas,
    handleRunNode,
    handleLocateNode,
    screenToFlowPosition,
  }
}
