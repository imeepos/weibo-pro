import React, { memo } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
// import { EdgeLabel } from './EdgeLabel'  // 标签已禁用

export const DataEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  const { id, sourceX, sourceY, targetX, targetY, data, selected } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  // 注意：标签已禁用，因为技术性的属性映射（mid → mid）对用户意义不大
  // const label = data ? buildDataEdgeLabel(data) : null

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const customEvent = new CustomEvent('edge-delete', {
      detail: { edgeId: id },
    })
    window.dispatchEvent(customEvent)
  }

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const customEvent = new CustomEvent('edge-context-menu', {
      detail: { edgeId: id, event },
    })
    window.dispatchEvent(customEvent)
  }

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          zIndex: 9
        }}
        {...props}
        interactionWidth={20}
      />
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={2}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'pointer' }}
      />
      {/* 标签已禁用 - 技术性的属性映射对用户意义不大 */}
    </>
  )
})

DataEdge.displayName = 'DataEdge'
