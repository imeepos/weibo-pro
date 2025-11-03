import React, { memo } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge } from '../../types'
import { EdgeLabel } from './EdgeLabel'

export const ControlEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  const { sourceX, sourceY, targetX, targetY, data } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const label = data ? buildControlEdgeLabel(data) : null

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

ControlEdge.displayName = 'ControlEdge'

function buildControlEdgeLabel(data: NonNullable<WorkflowEdge['data']>): string {
  if (!data.condition) return ''

  const { property, value } = data.condition
  return `${property} = ${JSON.stringify(value)}`
}
