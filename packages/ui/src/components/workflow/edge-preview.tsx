'use client'

import React from 'react'
import { EdgeMode } from './types'
import { Label } from '../ui/label'

export interface EdgeModeStyle {
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  icon: string
  label: string
}

export interface EdgePreviewProps {
  mode: EdgeMode
  modeStyles: Record<EdgeMode, EdgeModeStyle>
}

export function EdgePreview({ mode, modeStyles }: EdgePreviewProps) {
  const config = modeStyles[mode]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">预览</Label>
      <div className="flex h-24 items-center justify-center rounded-lg border bg-card p-4">
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
            className="absolute left-1/2 -translate-x-1/2 rounded-md border bg-background px-2 py-1 text-xs shadow-lg"
            style={{ color: config.stroke }}
          >
            <span className="mr-1">{config.icon}</span>
            <span>{config.label}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
