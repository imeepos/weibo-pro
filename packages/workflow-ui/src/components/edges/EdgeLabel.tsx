import React from 'react'
import { motion } from 'framer-motion'
import { EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

interface EdgeLabelProps {
  label: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export function EdgeLabel({
  label,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: EdgeLabelProps) {
  const [, , labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <EdgeLabelRenderer>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="absolute pointer-events-auto"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }}
      >
        <div className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm text-xs text-gray-700 font-medium whitespace-nowrap">
          {label}
        </div>
      </motion.div>
    </EdgeLabelRenderer>
  )
}
