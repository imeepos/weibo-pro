'use client'

import { useMemo, useEffect, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useSelectionStore } from '../../store'
import { isNode, Compiler } from '@sker/workflow'
import { root } from '@sker/core'
import type { WorkflowNode } from '../../types'

/**
 * 获取当前选中的节点
 */
export function useSelectedNode(): WorkflowNode | null {
  const selectedNodeId = useSelectionStore((state) => state.selectedNodeId)
  const { getNodes, setNodes } = useReactFlow()
  const needsCompileRef = useRef<string | null>(null)

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    const nodes = getNodes() as WorkflowNode[]
    return nodes.find((node) => node.id === selectedNodeId) || null
  }, [selectedNodeId, getNodes])

  // 检查是否需要编译
  useEffect(() => {
    if (selectedNode && !isNode(selectedNode.data)) {
      needsCompileRef.current = selectedNode.id
      const compiler = root.get(Compiler)
      const compiledData = compiler.compile(selectedNode.data)
      setNodes((nodes) =>
        nodes.map((n) => n.id === selectedNode.id ? { ...n, data: compiledData } : n)
      )
    }
  }, [selectedNode, setNodes])

  return selectedNode
}
