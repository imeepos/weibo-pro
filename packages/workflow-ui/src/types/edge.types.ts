import type { EdgeMode } from '@sker/workflow'

/**
 * 边类型视觉配置
 */
export const EDGE_TYPE_STYLES = {
  data: {
    strokeWidth: 2,
    stroke: '#64748b',
    strokeDasharray: 'none',
  },
  control: {
    strokeWidth: 2,
    stroke: '#8b5cf6',
    strokeDasharray: '5,5',
  },
  conditional: {
    strokeWidth: 3,
    stroke: '#f59e0b',
    strokeDasharray: '10,5',
  },
  error: {
    strokeWidth: 2,
    stroke: '#ef4444',
    strokeDasharray: 'none',
  },
  success: {
    strokeWidth: 2,
    stroke: '#10b981',
    strokeDasharray: 'none',
  },
} as const

/**
 * 边模式视觉语言
 *
 * 每种流式合并模式都有独特的视觉身份：
 * - 线条样式：通过虚线模式表达触发节奏
 * - 颜色编码：情感化传达模式语义
 * - 图标标记：形象化表达模式特征
 */
export const EDGE_MODE_STYLES = {
  merge: {
    stroke: '#3b82f6',
    strokeWidth: 2,
    strokeDasharray: 'none',
    icon: '⚡',
    label: 'Merge',
    description: '任一上游立即触发',
    scenario: '并发采集、多数据源汇聚'
  },
  zip: {
    stroke: '#10b981',
    strokeWidth: 2,
    strokeDasharray: '8,4',
    icon: '🔗',
    label: 'Zip',
    description: '按索引配对执行',
    scenario: 'mid[1,2,3] + uid[4,5,6] → 3次执行'
  },
  combineLatest: {
    stroke: '#f59e0b',
    strokeWidth: 2.5,
    strokeDasharray: '4,2',
    icon: '🔄',
    label: 'Combine',
    description: '最新值聚合',
    scenario: '多输入实时监控、表单联动'
  },
  withLatestFrom: {
    stroke: '#8b5cf6',
    strokeWidth: 2,
    strokeDasharray: '12,4,2,4',
    icon: '👑',
    label: 'With',
    description: '主流触发携带辅流',
    scenario: '主事件 + 上下文补充'
  }
} as const satisfies Record<EdgeMode, {
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  icon: string
  label: string
  description: string
  scenario: string
}>

/**
 * 边验证结果
 */
export type EdgeValidation = { valid: boolean; reason?: string }
