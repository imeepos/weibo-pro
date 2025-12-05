'use client'

import { useMemo } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import { isNode, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowNode } from '../../types'

/**
 * 获取当前选中的节点
 *
 * 优雅设计：
 * - 自动编译未编译的节点（防御性编程）
 * - 同步编译后的节点回 ReactFlow
 */
export function useSelectedNode(): WorkflowNode | null {
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId)
  const { getNodes, setNodes } = useReactFlow()

  return useMemo(() => {
    if (!selectedNodeId) return null

    const nodes = getNodes() as WorkflowNode[]
    const selectedNode = nodes.find((node) => node.id === selectedNodeId)

    if (!selectedNode) return null

    // 检查节点是否已编译（包含 metadata）
    if (!isNode(selectedNode.data)) {
      console.warn(`[useSelectedNode] 节点未编译，自动修复`, {
        nodeId: selectedNode.id,
        nodeType: selectedNode.data?.type
      })

      // 编译节点
      const compiler = root.get(Compiler)
      const compiledData = compiler.compile(selectedNode.data)

      // 创建新节点并同步回 ReactFlow
      const fixedNode: WorkflowNode = {
        ...selectedNode,
        data: compiledData
      }

      // 同步更新
      setNodes((nodes) =>
        nodes.map((n) => (n.id === selectedNodeId ? fixedNode : n))
      )

      return fixedNode
    }

    return selectedNode
  }, [selectedNodeId, getNodes, setNodes])
}
