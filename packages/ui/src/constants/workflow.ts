/**
 * 工作流节点状态颜色映射
 */
export const NODE_STATE_COLORS: Record<string, string> = {
  pending: '#94a3b8',   // slate-400
  running: '#3b82f6',   // blue-500
  emitting: '#a855f7',  // purple-500
  success: '#22c55e',   // green-500
  fail: '#ef4444',      // red-500
}

/**
 * 工作流节点状态标签
 */
export const NODE_STATE_LABELS: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  emitting: '发送中',
  success: '成功',
  fail: '失败',
}
