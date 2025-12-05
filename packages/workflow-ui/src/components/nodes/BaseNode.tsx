import React, { memo, useEffect } from 'react'
import { useUpdateNodeInternals, useReactFlow } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { WorkflowNode } from '@sker/ui/components/workflow'
import type { WorkflowNode as WorkflowNodeType } from '../../types'
import { useRender } from './hook'
import { fromJson, WorkflowGraphAst, Compiler } from '@sker/workflow'
import type { INode } from '@sker/workflow'
import { root } from '@sker/core'
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
  // 确保节点已编译（包含 metadata）
  let nodeToUse: INode

  if ('metadata' in data && data.metadata) {
    // ✅ 已编译的节点，直接使用
    nodeToUse = data as INode
  } else {
    // 未编译的节点，需要编译（防御性编程）
    console.warn('[BaseNode] 节点未编译，自动编译', { nodeId: id, nodeType: data.type })
    const compiler = root.get(Compiler)
    nodeToUse = compiler.compile(data as any)
  }

  // ✅ 直接使用 metadata 字段，不需要调用 getNodeMetadata
  const metadata = nodeToUse.metadata!
  const updateNodeInternals = useUpdateNodeInternals()
  const CustomRender = useRender(fromJson(data))
  const { setNodes } = useReactFlow()
  const isCollapsed = data.collapsed ?? false

  // 将 INodeInputMetadata 转换为 WorkflowNodePort
  const inputs = metadata.inputs;

  // 将 INodeOutputMetadata 转换为 WorkflowNodePort
  const outputs = metadata.outputs;

  // 当端口数量或折叠状态变化时，更新节点内部连接点
  // metadata 会根据 data 动态计算，端口变化会反映在 inputs/outputs 长度上
  // 对于 WorkflowGraphAst，还需要监听内部节点和边的变化
  useEffect(() => {
    updateNodeInternals(id)
  }, [
    id,
    metadata.inputs.length,
    metadata.outputs.length,
    isCollapsed,
    // 对于 WorkflowGraphAst，监听内部结构变化
    data.type === 'WorkflowGraphAst' ? (data as WorkflowGraphAst).nodes?.length : 0,
    data.type === 'WorkflowGraphAst' ? (data as WorkflowGraphAst).edges?.length : 0,
    updateNodeInternals
  ])

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
      label={data.name || metadata.class.title || data.type}
      description={data.description}
      color={data.color}
      icon={<BoxIcon />}
      status={data.state}
      statusCount={data.count || 0}
      inputs={inputs}
      outputs={outputs}
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
