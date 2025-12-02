import React, { memo, useEffect } from 'react'
import { useUpdateNodeInternals, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { WorkflowNode } from '@sker/ui/components/workflow'
import type { WorkflowNode as WorkflowNodeType } from '../../types'
import { findNodeType, getNodeMetadata } from '../../adapters'
import { useRender } from './hook'
import { fromJson } from '@sker/workflow'
import { BoxIcon } from 'lucide-react'

/**
 * BaseNode - 工作流节点数据适配器
 *
 * 职责：
 * - 从 Ast 数据提取状态和元数据
 * - 获取自定义渲染器
 * - 传递给 @sker/ui 的 WorkflowNode 进行渲染
 * - 处理工作流特定的交互事件
 */
export const BaseNode = memo(({ id, data, selected }: NodeProps<WorkflowNodeType>) => {
  const nodeClass = findNodeType(data.type)!
  const metadata = getNodeMetadata(nodeClass)
  const updateNodeInternals = useUpdateNodeInternals()
  const CustomRender = useRender(fromJson(data))
  const { setNodes } = useReactFlow()
  const isCollapsed = data.collapsed ?? false

  // 用节点实例的实际值增强端口元数据
  const enhancedInputs = metadata.inputs.map(input => ({
    ...input,
    value: (data as any)[input.property]
  }))

  const enhancedOutputs = metadata.outputs.map(output => ({
    ...output,
    value: (data as any)[output.property]
  }))

  // 当端口或折叠状态变化时，更新节点内部连接点
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, metadata.inputs.length, metadata.outputs.length, isCollapsed, updateNodeInternals])

  // 切换节点折叠状态
  const toggleCollapse = () => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, collapsed: !isCollapsed } }
          : node
      )
    )
  }

  // 右键菜单事件
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const customEvent = new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  // 双击事件
  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const customEvent = new CustomEvent('node-double-click', {
      detail: { nodeId: id, nodeData: data },
    })
    window.dispatchEvent(customEvent)
  }

  // 调用 @sker/ui 的 WorkflowNode 进行渲染
  return (
    <WorkflowNode
      id={id}
      type={data.type}
      label={data.name || metadata.title || data.type}
      description={data.description}
      color={data.color}
      icon={<BoxIcon/>}
      status={data.state}
      statusCount={data.count || 0}
      inputs={enhancedInputs}
      outputs={enhancedOutputs}
      selected={selected}
      collapsed={isCollapsed}
      onToggleCollapse={toggleCollapse}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {CustomRender}
    </WorkflowNode>
  )
})

BaseNode.displayName = 'BaseNode'
