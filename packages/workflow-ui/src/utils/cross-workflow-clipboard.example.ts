/**
 * 跨工作流剪贴板使用示例
 *
 * 演示如何使用类型定义、常量和序列化工具
 */

import type { CrossWorkflowClipboardData, SerializedNode, SerializedEdge } from '../types/cross-workflow-clipboard.types'
import { WORKFLOW_CLIPBOARD_CHANNEL, BROADCAST_MESSAGE_TYPES, CLIPBOARD_DATA_VERSION } from '../constants/broadcast-channels'
import { serializeNode, serializeEdge, deserializeNode, deserializeEdge, calculateBoundingBox } from '../utils/serialize-node'
import type { INode, IEdge } from '@sker/workflow'
import { Compiler } from '@sker/workflow/src/compiler'

/**
 * 示例 1: 序列化节点数据
 */
export function example1SerializeNodes(nodes: INode[], edges: IEdge[]) {
  // 1. 序列化节点
  const serializedNodes = nodes.map(serializeNode)

  // 2. 序列化边
  const serializedEdges = edges.map(serializeEdge)

  // 3. 计算包围盒
  const boundingBox = calculateBoundingBox(nodes)

  return { serializedNodes, serializedEdges, boundingBox }
}

/**
 * 示例 2: 创建剪贴板数据
 */
export function example2CreateClipboardData(
  sourceWorkflowId: string,
  sourceWorkflowName: string,
  nodes: INode[],
  edges: IEdge[]
): CrossWorkflowClipboardData {
  // 1. 序列化节点和边
  const { serializedNodes, serializedEdges, boundingBox } = example1SerializeNodes(nodes, edges)

  // 2. 创建剪贴板数据
  const clipboardData: CrossWorkflowClipboardData = {
    version: CLIPBOARD_DATA_VERSION,
    sourceWorkflowId,
    sourceWorkflowName,
    timestamp: Date.now(),
    nodes: serializedNodes,
    edges: serializedEdges,
    metadata: {
      nodeCount: serializedNodes.length,
      edgeCount: serializedEdges.length,
      boundingBox,
    },
  }

  return clipboardData
}

/**
 * 示例 3: 通过 BroadcastChannel 发送剪贴板数据
 */
export function example3BroadcastClipboard(clipboardData: CrossWorkflowClipboardData) {
  // 1. 创建 BroadcastChannel
  const channel = new BroadcastChannel(WORKFLOW_CLIPBOARD_CHANNEL)

  // 2. 发送消息
  channel.postMessage({
    type: BROADCAST_MESSAGE_TYPES.COPY_NODES,
    sourceWorkflowId: clipboardData.sourceWorkflowId,
    sourceWorkflowName: clipboardData.sourceWorkflowName,
    timestamp: clipboardData.timestamp,
    data: clipboardData,
  })

  // 3. 关闭频道（注意：在实际应用中，应该保持频道打开以监听消息）
  channel.close()
}

/**
 * 示例 4: 接收剪贴板数据
 */
export function example4ReceiveClipboard() {
  // 1. 创建 BroadcastChannel
  const channel = new BroadcastChannel(WORKFLOW_CLIPBOARD_CHANNEL)

  // 2. 监听消息
  channel.onmessage = (event) => {
    const message = event.data

    // 3. 验证消息类型
    if (message.type === BROADCAST_MESSAGE_TYPES.COPY_NODES) {
      const clipboardData = message.data as CrossWorkflowClipboardData

      console.log(`收到来自 ${clipboardData.sourceWorkflowName} 的节点数据`)
      console.log(`节点数量: ${clipboardData.metadata?.nodeCount}`)
      console.log(`边数量: ${clipboardData.metadata?.edgeCount}`)

      // 4. 反序列化节点（需要编译器实例）
      // const compiler = new Compiler()
      // const nodes = clipboardData.nodes.map(node => deserializeNode(node, compiler))
      // const edges = clipboardData.edges.map(deserializeEdge)
    }
  }

  // 5. 返回清理函数
  return () => channel.close()
}

/**
 * 示例 5: 反序列化节点数据
 */
export function example5DeserializeNodes(
  clipboardData: CrossWorkflowClipboardData,
  compiler: Compiler
) {
  // 1. 反序列化节点
  const nodes = clipboardData.nodes.map((node) => deserializeNode(node, compiler))

  // 2. 反序列化边
  const edges = clipboardData.edges.map(deserializeEdge)

  return { nodes, edges }
}

/**
 * 示例 6: 计算节点偏移量
 */
export function example6CalculateNodeOffset(
  clipboardData: CrossWorkflowClipboardData,
  targetPosition: { x: number; y: number }
) {
  const boundingBox = clipboardData.metadata?.boundingBox

  if (!boundingBox) {
    throw new Error('剪贴板数据缺少包围盒信息')
  }

  // 计算目标位置与包围盒中心的偏移量
  const offsetX = targetPosition.x - boundingBox.centerX
  const offsetY = targetPosition.y - boundingBox.centerY

  return { offsetX, offsetY }
}
