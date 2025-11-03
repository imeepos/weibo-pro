/**
 * 边类型视觉配置
 */
export const EDGE_TYPE_STYLES = {
  data: {
    strokeWidth: 2,
    stroke: '#64748b',      // slate-500
    strokeDasharray: 'none',
  },
  control: {
    strokeWidth: 2,
    stroke: '#8b5cf6',      // violet-500
    strokeDasharray: '5,5',
  },
} as const

/**
 * 边验证结果
 */
export interface EdgeValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误原因 */
  reason?: string
}

/**
 * 连接参数（React Flow onConnect 事件）
 */
export interface ConnectionParams {
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}
