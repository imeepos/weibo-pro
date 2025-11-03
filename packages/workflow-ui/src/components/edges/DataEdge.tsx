import React, { memo } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
import { EdgeLabel } from './EdgeLabel'

export const DataEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  console.log({ props })
  const { id, sourceX, sourceY, targetX, targetY, data, selected } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const label = data ? buildDataEdgeLabel(data) : null

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
        strokeWidth={20}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'pointer' }}
      />
      {label && (
        <EdgeLabel
          label={label}
          sourceX={sourceX}
          sourceY={sourceY}
          targetX={targetX}
          targetY={targetY}
        />
      )}
    </>
  )
})

DataEdge.displayName = 'DataEdge'

function buildDataEdgeLabel(data: NonNullable<WorkflowEdge['data']>): string {
  const parts: string[] = []

  if (data.fromProperty) {
    parts.push(data.fromProperty)
  }
  if (data.toProperty) {
    parts.push(`→ ${data.toProperty}`)
  }
  if (data.weight !== undefined) {
    parts.push(`[${data.weight}]`)
  }

  return parts.join(' ')
}
