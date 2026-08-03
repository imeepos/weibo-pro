import { useCallback, useEffect } from 'react'
import { useReactFlow, type Connection, } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import { generateId } from '@sker/workflow'
import type { WorkflowEdge } from '../../types'
import { useContextMenu } from './useContextMenu'
import { useCanvasViewControls } from './useCanvasViewControls'
import { useCanvasNodeAdder } from './useCanvasNodeAdder'

/**
 * 画布交互控制 Hook
 *
 * 职责拆分：
 * - 视图控制：useCanvasViewControls
 * - 添加节点：useCanvasNodeAdder
 */
export function useCanvasControls() {
  const {
    screenToFlowPosition,
    getNodes,
    setNodes,
    setEdges,
    addEdges,
  } = useReactFlow()
  const { selectNode, clearSelection } = useSelectionStore()
  const { menu, openNodeMenu, openEdgeMenu, closeMenu, nodeSelector, openNodeSelector, closeNodeSelector } = useContextMenu()
  const viewControls = useCanvasViewControls()
  const nodeAdder = useCanvasNodeAdder()

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
   * 处理节点选择（分组节点会选中所有子节点）
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      selectNode(node.id)

      // 如果是分组节点，选中所有子节点
      if (node.type === 'GroupNode') {
        const allNodes = getNodes()
        const childIds = new Set<string>()

        // 递归收集所有子节点
        const collectChildren = (parentId: string) => {
          allNodes.forEach(n => {
            if (n.parentId === parentId) {
              childIds.add(n.id)
              if (n.type === 'GroupNode') collectChildren(n.id)
            }
          })
        }
        collectChildren(node.id)

        if (childIds.size > 0) {
          setNodes(nodes => nodes.map(n => ({
            ...n,
            selected: n.id === node.id || childIds.has(n.id)
          })))
        }
      }
    },
    [selectNode, getNodes, setNodes]
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
    ...nodeAdder,
    ...viewControls,
    screenToFlowPosition,
  }
}
