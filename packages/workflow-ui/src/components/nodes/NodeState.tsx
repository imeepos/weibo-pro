import React from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Clock, Play } from 'lucide-react'
import type { IAstStates } from '@sker/workflow'
import { NODE_STATE_COLORS, NODE_STATE_LABELS } from '../../types'
import { cn } from '../../utils/cn'

interface NodeStateProps {
  state: IAstStates
  error?: Error
}

const stateIcons = {
  pending: Clock,
  running: Play,
  success: CheckCircle2,
  fail: AlertCircle,
}

const stateStyles = {
  pending: 'bg-gray-100 text-gray-600 border-gray-300',
  running: 'bg-blue-100 text-blue-700 border-blue-300',
  success: 'bg-green-100 text-green-700 border-green-300',
  fail: 'bg-red-100 text-red-700 border-red-300',
}

export function NodeState({ state, error }: NodeStateProps) {
  const label = NODE_STATE_LABELS[state]
  const Icon = stateIcons[state]

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-xs whitespace-nowrap flex-shrink-0',
        stateStyles[state]
      )}
      title={label}
    >
      <motion.div
        animate={
          state === 'running'
            ? {
                rotate: 360,
                transition: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' },
              }
            : {}
        }
      >
        <Icon className="w-3 h-3" />
      </motion.div>

      {/* 显示状态标签 */}
      {!error && (
        <span className="select-none">{label}</span>
      )}

      {error && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15 }}
          className="flex items-center"
          title={error.message}
        >
          <AlertCircle className="w-3 h-3 text-[var(--workflow-error)]" />
        </motion.div>
      )}

      {state === 'running' && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-400/50"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.div>
  )
}
