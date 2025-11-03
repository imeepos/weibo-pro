import type { IAstStates } from '@sker/workflow'

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
 * 端口位置类型
 */
export type HandlePosition = 'top' | 'right' | 'bottom' | 'left'

/**
 * 端口类型
 */
export type HandleType = 'source' | 'target'

/**
 * 节点句柄配置
 */
export interface NodeHandleConfig {
  /** 句柄 ID（对应属性名） */
  id: string
  /** 句柄类型 */
  type: HandleType
  /** 句柄位置 */
  position: HandlePosition
  /** 显示标签 */
  label: string
  /** 是否为多输入 */
  isMulti?: boolean
}
