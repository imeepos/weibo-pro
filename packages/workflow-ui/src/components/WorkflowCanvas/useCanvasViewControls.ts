import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSelectionStore } from '../../store'

/**
 * 画布视图控制子 Hook
 *
 * 负责：适应窗口、居中、缩放、全选、清空画布、定位节点等视图操作
 */
export function useCanvasViewControls() {
  const {
    fitView,
    setCenter,
    zoomTo,
    zoomIn,
    zoomOut,
    getNodes,
    setNodes,
    setEdges,
    getNode,
  } = useReactFlow()
  const { selectNode } = useSelectionStore()

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
  const handleRunNode = useCallback((_nodeId: string) => {
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
    handleFitView,
    handleCenterView,
    handleResetZoom,
    handleZoomIn,
    handleZoomOut,
    handleSelectAll,
    handleClearCanvas,
    handleRunNode,
    handleLocateNode,
  }
}
