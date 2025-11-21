import React, { useMemo, useRef } from 'react'
import { BaseEdge, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge as IWorkflowEdge } from '../../types'
import { EDGE_TYPE_STYLES, EDGE_MODE_STYLES } from '../../types/edge.types'
import { EdgeMode } from '@sker/workflow'

export const WorkflowEdge = (props: EdgeProps<IWorkflowEdge>) => {
  const { id, sourceX, sourceY, targetX, targetY, data } = props
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature: 0.3
  })

  const pathRef = useRef<SVGPathElement>(null)
  const edgeStyle = useMemo(() => {
    const mode = data?.edge?.mode as EdgeMode | undefined
    if (mode && mode in EDGE_MODE_STYLES) {
      return EDGE_MODE_STYLES[mode]
    }
    const styleType = data?.styleType || data?.edgeType || 'data'
    return EDGE_TYPE_STYLES[styleType]
  }, [data?.edge?.mode, data?.styleType, data?.edgeType])

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    const customEvent = new CustomEvent('edge-context-menu', {
      detail: { edgeId: id, event },
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
          stroke: edgeStyle.stroke,
          strokeWidth: edgeStyle.strokeWidth,
          strokeDasharray: edgeStyle.strokeDasharray,
          zIndex: 9,
        }}
        id={id}
        label={undefined}
        labelStyle={{ fill: '#fff', fontWeight: 600, fontSize: 12 }}
        labelBgStyle={{ fill: '#3b82f6' }}
        labelBgPadding={[4, 6] as [number, number]}
        labelBgBorderRadius={4}
        interactionWidth={20}
      />
      <path
        ref={pathRef}
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={6}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ cursor: 'pointer', zIndex: 11 }}
      />
    </>
  )
}

WorkflowEdge.displayName = 'WorkflowEdge'
