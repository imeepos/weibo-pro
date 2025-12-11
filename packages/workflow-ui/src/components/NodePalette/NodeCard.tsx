'use client'

import { motion } from 'framer-motion'
import { Plus, ArrowRight, ArrowLeft } from 'lucide-react'
import type { NodeMetadata } from '../../types'
import { cn } from '../../utils/cn'

interface NodeCardProps {
  metadata: NodeMetadata
  onAddNode: (metadata: NodeMetadata) => void
}

export function NodeCard({ metadata, onAddNode }: NodeCardProps) {
  const handleClick = () => {
    onAddNode(metadata)
  }

  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={cn(
        'relative p-3 rounded-lg border bg-[var(--node-bg)] border-[var(--node-border)]',
        'cursor-pointer transition-all duration-200',
        'hover:bg-[var(--node-bg-hover)] hover:border-[var(--workflow-primary)] hover:shadow-[var(--shadow-node-hover)]',
        'group'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-200 group-hover:text-[var(--workflow-primary)] transition-colors">
          {metadata.label}
        </h4>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-6 h-6 rounded-full bg-[var(--workflow-primary)]/10 flex items-center justify-center
                   group-hover:bg-[var(--workflow-primary)] transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--workflow-primary)] group-hover:text-slate-900" />
        </motion.div>
      </div>

      <div className="space-y-2 text-xs">
        {metadata.inputs.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <ArrowLeft className="w-3 h-3" />
              <span className="font-medium">输入</span>
            </div>
            <ul className="space-y-0.5 pl-4">
              {metadata.inputs.map((input) => (
                <li key={input.property} className="text-slate-300 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--workflow-primary)]" />
                  <span>{input.label}</span>
                  {input.isMulti && <span className="text-[var(--workflow-muted)] font-mono text-[10px]">[]</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {metadata.outputs.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium">输出</span>
            </div>
            <ul className="space-y-0.5 pl-4">
              {metadata.outputs.map((output, index) => (
                <li key={`${output.property}-${index}`} className="text-slate-300 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[var(--workflow-secondary)]" />
                  <span>{output.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  )
}
