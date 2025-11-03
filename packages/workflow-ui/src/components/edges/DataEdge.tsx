import React, { memo } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
import { EdgeLabel } from './EdgeLabel'

export const DataEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  console.log({ props })
  const { sourceX, sourceY, targetX, targetY, data, selected } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const label = data ? buildDataEdgeLabel(data) : null

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          zIndex: 9
        }}
        {...props}
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
