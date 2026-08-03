/**
 * 账号监控相关类型
 */
export interface AccountMetrics {
  total: number              // 总账号数
  active: number             // ACTIVE 账号数
  expired: number            // EXPIRED 账号数
  available: number          // 可用账号数（Redis 中有健康分数）
  availabilityRate: number    // 可用率（active/total * 100）
  lastCheckTime: string      // 最后检查时间
  trend: HourlySnapshot[]    // 24 小时趋势数据
}

export interface HourlySnapshot {
  timestamp: string          // 快照时间
  total: number              // 总账号数
  active: number             // ACTIVE 账号数
  expired: number            // EXPIRED 账号数
  availabilityRate: number    // 可用率
}

export interface AccountAlert {
  level: 'critical' | 'warning' | 'emergency'  // 告警级别
  message: string            // 告警消息
  metric: string             // 监控指标
  value: number              // 当前值
  threshold: number          // 阈值
  timestamp: string          // 告警时间
}

export interface AccountSyncResult {
  added: number              // 新增账号数
  updated: number            // 更新账号数
  errors: string[]           // 错误信息列表
}

export interface AccountHealthCheckResult {
  total: number              // 总账号数
  valid: number              // 有效账号数
  expired: number            // 过期账号数
  errors: string[]           // 错误信息列表
}
