import { Injectable, Inject } from '@sker/core'
import { RedisClient } from '@sker/redis'
import { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'
import {
  HourlySnapshot,
  Alert,
  AccountMetrics,
  buildAlerts,
  emitAlerts,
} from './weibo-account-alert.util'

export type { HourlySnapshot, Alert, AlertLevel, AccountMetrics } from './weibo-account-alert.util'

/**
 * 微博账号监控服务
 *
 * 功能：
 * 1. 统计指标收集 - 总账号数、ACTIVE账号数、EXPIRED账号数、可用率、Redis健康账号数
 * 2. 历史数据记录 - 每小时记录一次统计快照，保存最近24小时数据
 * 3. 监控指标查询 - 提供getMetrics()接口返回当前指标和趋势数据
 */
@Injectable()
export class WeiboAccountMonitorService {
  private readonly healthKey = 'weibo:account:health'
  private readonly snapshotsKey = 'weibo:account:snapshots'
  private readonly maxSnapshots = 24 // 保留最近24小时数据

  constructor(
    @Inject(RedisClient) private readonly redis: RedisClient,
  ) {}

  /**
   * 获取监控指标
   *
   * @returns 账号监控指标（包含当前状态和历史趋势）
   */
  async getMetrics(): Promise<AccountMetrics> {
    // 1. 从数据库查询所有账号
    const accounts = await useEntityManager(async (manager) => {
      return await manager.find(WeiboAccountEntity)
    })

    // 2. 统计各状态账号数量
    const total = accounts.length
    const active = accounts.filter(a => a.status === WeiboAccountStatus.ACTIVE).length
    const expired = accounts.filter(a => a.status === WeiboAccountStatus.EXPIRED).length

    // 3. 获取Redis健康账号数
    const available = await this.redis.zcard(this.healthKey)

    // 4. 计算可用率（四舍五入到两位小数）
    const availabilityRate = total > 0
      ? Math.round((active / total) * 10000) / 100
      : 0

    // 5. 获取历史趋势数据
    const trend = await this.getTrendData()

    return {
      total,
      active,
      expired,
      available,
      availabilityRate,
      lastCheckTime: new Date(),
      trend,
    }
  }

  /**
   * 记录统计快照到Redis
   *
   * @param snapshot 快照数据
   */
  async recordSnapshot(snapshot: HourlySnapshot): Promise<void> {
    // 1. 将快照添加到列表头部
    await this.redis.lpush(
      this.snapshotsKey,
      JSON.stringify(snapshot)
    )

    // 2. 保留最近24条记录（24小时）
    await this.redis.ltrim(this.snapshotsKey, 0, this.maxSnapshots - 1)
  }

  /**
   * 采集当前状态快照并记录到Redis
   *
   * 此方法应每小时执行一次，用于记录历史趋势数据
   */
  async takeSnapshot(): Promise<void> {
    // 1. 获取当前指标
    const metrics = await this.getMetrics()

    // 2. 构建快照数据
    const snapshot: HourlySnapshot = {
      timestamp: metrics.lastCheckTime,
      total: metrics.total,
      active: metrics.active,
      expired: metrics.expired,
      available: metrics.available,
      availabilityRate: metrics.availabilityRate,
    }

    // 3. 记录到Redis
    await this.recordSnapshot(snapshot)
  }

  /**
   * 获取历史趋势数据
   *
   * @returns 最近24小时的快照数据（按时间倒序）
   */
  private async getTrendData(): Promise<HourlySnapshot[]> {
    // 从Redis获取所有快照（按时间倒序，最新的在前）
    const snapshots = await this.redis.lrange(this.snapshotsKey, 0, -1)

    // 如果没有快照数据，返回空数组
    if (!snapshots || snapshots.length === 0) {
      return []
    }

    // 解析并返回快照数据
    return snapshots.map(snapshot => {
      const data = JSON.parse(snapshot)
      return {
        ...data,
        timestamp: new Date(data.timestamp),
      }
    })
  }

  /**
   * 检查告警
   *
   * @param metrics 账号监控指标
   * @returns 告警列表（可能为空）
   */
  async checkAlerts(metrics: AccountMetrics): Promise<Alert[]> {
    return buildAlerts(metrics, this.redis)
  }

  /**
   * 发送告警到控制台
   *
   * @param alerts 告警列表
   */
  sendAlerts(alerts: Alert[]): void {
    emitAlerts(alerts)
  }
}
