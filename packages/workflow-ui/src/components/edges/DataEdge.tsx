import React, { memo } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'

export const DataEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  const { id, sourceX, sourceY, targetX, targetY, data, selected } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })
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
        id={id}
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
    </>
  )
})

DataEdge.displayName = 'DataEdge'
