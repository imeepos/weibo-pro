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
 * 边验证结果
 */
export type EdgeValidation = { valid: boolean; reason?: string }
