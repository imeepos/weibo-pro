import React, { useEffect, useMemo, useState } from 'react'
import { BaseEdge, getBezierPath, getSmoothStepPath, getStraightPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'
import type { WorkflowEdge as IWorkflowEdge } from '../../types'
import { EDGE_TYPE_STYLES, EDGE_MODE_STYLES } from '../../types/edge.types'
import { EdgeMode } from '@sker/workflow'

export const WorkflowEdge = (props: EdgeProps<IWorkflowEdge>) => {
  const { sourceX, sourceY, targetX, targetY, data } = props
  const edge = props.data?.edge;
  const [edgePath, setEdgePath] = useState<any>()
  useEffect(() => {
    if (edge && edge.isLoopBack) {
      const [edgePath] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
      })
      setEdgePath(edgePath)
    } else {
      const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        curvature: 0.3
      })
      setEdgePath(edgePath)
    }
  }, [edge, sourceX,
    sourceY,
    targetX,
    targetY])

  const edgeStyle = useMemo(() => {
    const mode = data?.edge?.mode as EdgeMode | undefined
    if (mode && mode in EDGE_MODE_STYLES) {
      return EDGE_MODE_STYLES[mode]
    }
    const styleType = data?.styleType || data?.edgeType || 'data'
    return EDGE_TYPE_STYLES[styleType]
  }, [data?.edge?.mode, data?.styleType, data?.edgeType])

  // React Flow 会自动处理 onEdgeDoubleClick 和 onEdgeContextMenu
  // 不需要在这里添加自定义事件处理
  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: edgeStyle.stroke,
        strokeWidth: edgeStyle.strokeWidth,
        strokeDasharray: edgeStyle.strokeDasharray,
      }}
      interactionWidth={20}
    />
  )
}

WorkflowEdge.displayName = 'WorkflowEdge'
