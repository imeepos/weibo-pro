import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'
import { getAllNodeTypes } from '../../adapters'
import { createCompiledNode } from '../../utils/createCompiledNode'
import type { WorkflowNode, UINodeMetadata } from '../../types'
import { useContextMenu } from './useContextMenu'

/**
 * 从上下文菜单 / 节点选择器添加节点 子 Hook
 */
export function useCanvasNodeAdder() {
  const { setNodes } = useReactFlow()
  const { menu, nodeSelector } = useContextMenu()

  /**
   * 从上下文菜单添加节点
   */
  const handleAddNodeFromMenu = useCallback(
    (metadata: UINodeMetadata) => {
      const nodeTypes = getAllNodeTypes()
      const NodeClass = nodeTypes.find((type) => type.name === metadata.type)

      if (!NodeClass) {
        console.error(`Node class not found for type: ${metadata.type}`)
        return
      }

      // 使用工具函数创建并编译节点
      const compiledNode = createCompiledNode(NodeClass, {
        position: menu.flowPosition
      })

      const node: WorkflowNode = {
        id: compiledNode.id,
        type: compiledNode.metadata.type,
        position: menu.flowPosition,
        data: compiledNode,  // ✅ 使用编译后的节点
      }

      setNodes((nodes) => [...nodes, node])
    },
    [setNodes, menu.flowPosition]
  )

  /**
   * 从节点选择器添加节点
   */
  const handleAddNodeFromSelector = useCallback(
    (metadata: UINodeMetadata) => {
      const nodeTypes = getAllNodeTypes()
      const NodeClass = nodeTypes.find((type) => type.name === metadata.type)

      if (!NodeClass) {
        console.error(`Node class not found for type: ${metadata.type}`)
        return
      }

      // 使用工具函数创建并编译节点
      const compiledNode = createCompiledNode(NodeClass, {
        position: nodeSelector.flowPosition
      })

      const node: WorkflowNode = {
        id: compiledNode.id,
        type: metadata.type,
        position: nodeSelector.flowPosition,
        data: compiledNode,  // ✅ 使用编译后的节点
      }

      setNodes((nodes) => [...nodes, node])
    },
    [setNodes, nodeSelector.flowPosition]
  )

  return {
    handleAddNodeFromMenu,
    handleAddNodeFromSelector,
  }
}
