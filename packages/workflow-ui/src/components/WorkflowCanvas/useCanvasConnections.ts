import { useCallback, useState } from 'react'
import type { Connection } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
import { validateEdge } from '../../utils/edgeValidator'
import { getAllNodeTypes } from '../../adapters'
import type { UseWorkflowReturn } from '../../hooks/useWorkflow'
import type { ToastType } from './useCanvasState'

export interface UseCanvasConnectionsParams {
  workflow: UseWorkflowReturn
  showToast: (type: ToastType, title: string, message?: string) => void
  screenToFlowPosition: (screenPosition: { x: number; y: number }) => { x: number; y: number }
  openNodeSelector: (screenPosition: { x: number; y: number }, flowPosition: { x: number; y: number }) => void
  /** 节点选择器当前所处的 Flow 坐标 */
  nodeSelectorFlowPosition: { x: number; y: number }
}

/**
 * 画布连线逻辑 Hook
 *
 * 集中管理连线相关的状态与事件：
 * - connectingInfo：当前正在拖拽的连接源信息
 * - 连线校验（validateEdge）
 * - 连线开始/结束、从节点选择器添加节点时自动连线
 */
export function useCanvasConnections({
  workflow,
  showToast,
  screenToFlowPosition,
  openNodeSelector,
  nodeSelectorFlowPosition,
}: UseCanvasConnectionsParams) {
  // 连线状态追踪
  const [connectingInfo, setConnectingInfo] = useState<{
    nodeId: string | null
    handleId: string | null
    handleType: 'source' | 'target' | null
  } | null>(null)

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

  const handleAddNodeFromSelector = useCallback((metadata: any) => {
    const registeredNodeTypes = getAllNodeTypes()
    const NodeClass = registeredNodeTypes.find((type: any) => type.name === metadata.type)

    if (NodeClass) {
      const newNode = workflow.addNode(NodeClass, nodeSelectorFlowPosition, metadata.label)

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
  }, [workflow, nodeSelectorFlowPosition, connectingInfo])

  return {
    connectingInfo,
    handleConnectInternal,
    handleConnectStart,
    handleConnectEnd,
    handleAddNodeFromSelector,
  }
}
