/**
 * 微博账号监控：告警构建、抑制、记录与输出工具。
 */
import { RedisClient } from '@sker/redis'

/**
 * 小时快照接口
 */
export interface HourlySnapshot {
  /** 快照时间 */
  timestamp: Date
  /** 总账号数 */
  total: number
  /** ACTIVE 账号数 */
  active: number
  /** EXPIRED 账号数 */
  expired: number
  /** Redis 健康账号数 */
  available: number
  /** 可用率（百分比） */
  availabilityRate: number
}

/**
 * 告警级别
 */
export type AlertLevel = 'critical' | 'warning' | 'emergency'

/**
 * 告警接口
 */
export interface Alert {
  /** 告警级别 */
  level: AlertLevel
  /** 告警消息 */
  message: string
  /** 监控指标 */
  metric: string
  /** 当前值 */
  value: number
  /** 阈值 */
  threshold: number
  /** 告警时间 */
  timestamp: Date
}

/**
 * 账号监控指标接口
 */
export interface AccountMetrics {
  /** 总账号数 */
  total: number
  /** ACTIVE 账号数 */
  active: number
  /** EXPIRED 账号数 */
  expired: number
  /** Redis 健康账号数 */
  available: number
  /** 可用率（百分比，保留两位小数） */
  availabilityRate: number
  /** 最后检查时间 */
  lastCheckTime: Date
  /** 24小时趋势数据 */
  trend: HourlySnapshot[]
}

/**
 * 检查告警。
 * - ACTIVE 账号数 < 2：紧急告警
 * - 可用率 < 50%：严重告警
 * - 可用率 < 70%：警告
 */
export async function buildAlerts(metrics: AccountMetrics, redis: RedisClient): Promise<Alert[]> {
  const alerts: Alert[] = []

  // 1. 检查 ACTIVE 账号数（紧急告警）
  if (metrics.active < 2) {
    const alert: Alert = {
      level: 'emergency',
      message: `账号数量过少: ${metrics.active} 个 (阈值: 2)`,
      metric: 'activeAccounts',
      value: metrics.active,
      threshold: 2,
      timestamp: new Date(),
    }

    if (!await shouldSuppressAlert(redis, alert.level, alert.metric)) {
      alerts.push(alert)
      await recordAlert(redis, alert)
    }
  }

  // 2. 检查可用率（严重告警 < 50%）
  if (metrics.availabilityRate < 50) {
    const alert: Alert = {
      level: 'critical',
      message: `账号可用率过低: ${metrics.availabilityRate}% (阈值: 50%)`,
      metric: 'availabilityRate',
      value: metrics.availabilityRate,
      threshold: 50,
      timestamp: new Date(),
    }

    if (!await shouldSuppressAlert(redis, alert.level, alert.metric)) {
      alerts.push(alert)
      await recordAlert(redis, alert)
    }
  }
  // 3. 检查可用率（警告 < 70%）
  else if (metrics.availabilityRate < 70) {
    const alert: Alert = {
      level: 'warning',
      message: `账号可用率偏低: ${metrics.availabilityRate}% (阈值: 70%)`,
      metric: 'availabilityRate',
      value: metrics.availabilityRate,
      threshold: 70,
      timestamp: new Date(),
    }

    if (!await shouldSuppressAlert(redis, alert.level, alert.metric)) {
      alerts.push(alert)
      await recordAlert(redis, alert)
    }
  }

  return alerts
}

/**
 * 发送告警到控制台
 */
export function emitAlerts(alerts: Alert[]): void {
  if (alerts.length === 0) {
    return
  }

  for (const alert of alerts) {
    const emoji = getAlertEmoji(alert.level)
    const level = alert.level.toUpperCase()
    console.log(`${emoji} [${level}] ${alert.message}`)
  }
}

/**
 * 检查是否应该抑制告警（最近 1 小时内已发送过同类告警）
 */
async function shouldSuppressAlert(redis: RedisClient, level: AlertLevel, metric: string): Promise<boolean> {
  const key = `weibo:account:last_alert:${level}:${metric}`
  const lastAlertTime = await redis.get(key)
  return lastAlertTime !== null
}

/**
 * 记录告警到 Redis（1 小时后自动过期）
 */
async function recordAlert(redis: RedisClient, alert: Alert): Promise<void> {
  const key = `weibo:account:last_alert:${alert.level}:${alert.metric}`
  const value = alert.timestamp.toISOString()

  await redis.set(key, value)
  await redis.expire(key, 3600) // 1小时后自动删除
}

/**
 * 获取告警 emoji
 */
export function getAlertEmoji(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return '🚨'
    case 'warning':
      return '⚠️ '
    case 'emergency':
      return '🚨'
    default:
      return '❓'
  }
}
