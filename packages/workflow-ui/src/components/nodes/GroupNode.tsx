import React, { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import { NodeResizer } from '@xyflow/react'
import type { WorkflowNode as WorkflowNodeType } from '../../types'
import { WorkflowGraphAst } from '@sker/workflow'
import { cn } from '@sker/ui/lib/utils'

/**
 * GroupNode - 分组容器节点
 *
 * 使用 React Flow 的 parentId 机制实现分组
 * 子节点会自动跟随分组移动
 */
export const GroupNode = memo(({ id, data, selected, width, height }: NodeProps<WorkflowNodeType>) => {
  const groupData = data as any
  const w = width ?? groupData.width ?? 200
  const h = height ?? groupData.height ?? 150

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    window.dispatchEvent(new CustomEvent('node-context-menu', {
      detail: { nodeId: id, event, nodeData: data },
    }))
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-dashed bg-slate-900/30 relative',
        selected ? 'border-blue-500' : 'border-slate-500'
      )}
      style={{ width: w, height: h }}
      onContextMenu={handleContextMenu}
    >
      <NodeResizer
        minWidth={100}
        minHeight={50}
        isVisible={selected}
        lineClassName="border-blue-400"
        handleClassName="h-3 w-3 bg-white border-2 border-blue-400 rounded"
      />
      <div className="px-2 py-1 text-xs font-medium text-slate-400 border-b border-dashed border-slate-500">
        {groupData.name || '分组'}
      </div>
    </div>
  )
})

GroupNode.displayName = 'GroupNode'
