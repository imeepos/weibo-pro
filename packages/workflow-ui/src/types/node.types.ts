import type { IAstStates } from '@sker/workflow'
import type { Position } from '@xyflow/react'

/**
 * 节点状态视觉映射
 */
export const NODE_STATE_COLORS: Record<IAstStates, string> = {
  pending: '#94a3b8',   // slate-400
  running: '#3b82f6',   // blue-500
  success: '#22c55e',   // green-500
  fail: '#ef4444',      // red-500
}

/**
 * 节点状态标签
 */
export const NODE_STATE_LABELS: Record<IAstStates, string> = {
  pending: '待执行',
  running: '执行中',
  success: '成功',
  fail: '失败',
}

/**
 * 节点句柄配置
 */
export interface NodeHandleConfig {
  property: string
  type: 'source' | 'target'
  position: Position
  label: string
  isMulti?: boolean
}
