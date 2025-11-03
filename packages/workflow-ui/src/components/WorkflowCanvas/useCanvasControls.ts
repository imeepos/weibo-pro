import { useCallback, useRef } from 'react'
import { useReactFlow, type Connection, type XYPosition } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import { getAllNodeTypes } from '../../adapters'
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
  const { menu, openMenu, closeMenu, nodeSelector, openNodeSelector, closeNodeSelector } = useContextMenu()

  const lastClickTimeRef = useRef<number>(0)
  const DOUBLE_CLICK_DELAY = 300

  /**
   * 处理连接事件
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      const edge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        type: 'workflow-data-edge',
        data: {
          edgeType: 'data',
          edge: {
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
   * 处理画布点击（清空选择 + 双击检测）
   */
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      const now = Date.now()
      const timeSinceLastClick = now - lastClickTimeRef.current

      if (timeSinceLastClick < DOUBLE_CLICK_DELAY) {
        const screenPosition = { x: event.clientX, y: event.clientY }
        const flowPosition = screenToFlowPosition(screenPosition)
        openNodeSelector(screenPosition, flowPosition)
        lastClickTimeRef.current = 0
      } else {
        lastClickTimeRef.current = now
        clearSelection()
      }
    },
    [clearSelection, openNodeSelector, screenToFlowPosition]
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
   * 处理右键菜单
   */
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      console.log('[useCanvasControls] onPaneContextMenu triggered', {
        clientX: event.clientX,
        clientY: event.clientY,
        type: event.type,
      })

      event.preventDefault()
      event.stopPropagation()

      const screenPosition = { x: event.clientX, y: event.clientY }
      const flowPosition = screenToFlowPosition(screenPosition)

      console.log('[useCanvasControls] Opening menu at', {
        screenPosition,
        flowPosition,
      })

      openMenu(screenPosition, flowPosition)
    },
    [openMenu, screenToFlowPosition]
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

      const node: WorkflowNode = {
        id: ast.id,
        type: 'workflow-node',
        position: menu.flowPosition,
        data: {
          ast,
          nodeClass: NodeClass,
          label: metadata.label,
          state: 'pending',
        },
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

      const node: WorkflowNode = {
        id: ast.id,
        type: 'workflow-node',
        position: nodeSelector.flowPosition,
        data: {
          ast,
          nodeClass: NodeClass,
          label: metadata.label,
          state: 'pending',
        },
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
  }
}
