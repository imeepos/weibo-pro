import React from 'react'
import { EdgeMode } from '@sker/workflow'
import { EDGE_MODE_STYLES } from '../../types/edge.types'

export interface EdgePreviewProps {
  mode: EdgeMode
}

/**
 * 边预览组件
 *
 * 优雅设计：
 * - 实时展示边的视觉效果
 * - 线条样式 + 颜色 + 图标 = 完整的视觉身份
 */
export function EdgePreview({ mode }: EdgePreviewProps) {
  const config = EDGE_MODE_STYLES[mode]

  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-[#282e39] bg-[#1a1d24] p-4">
      <div className="relative flex w-full items-center justify-center">
        <svg width="100%" height="60" className="overflow-visible">
          <defs>
            <marker
              id={`arrow-${mode}`}
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill={config.stroke} />
            </marker>
          </defs>
          <line
            x1="20"
            y1="30"
            x2="calc(100% - 20)"
            y2="30"
            stroke={config.stroke}
            strokeWidth={config.strokeWidth}
            strokeDasharray={config.strokeDasharray}
            markerEnd={`url(#arrow-${mode})`}
          />
        </svg>
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-md border border-[#282e39] bg-[#111318] px-2 py-1 text-xs shadow-lg"
          style={{ color: config.stroke }}
        >
          <span className="mr-1">{config.icon}</span>
          <span>{config.label}</span>
        </div>
      </div>
    </div>
  )
}
