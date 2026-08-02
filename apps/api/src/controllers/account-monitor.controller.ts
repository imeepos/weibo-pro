import { Controller, Inject } from '@sker/core'
import * as sdk from '@sker/sdk'
import { WeiboAccountMonitorService } from '@sker/workflow-run'

/**
 * 账号监控控制器
 *
 * 注意：原实现引用了 @sker/workflow-run 不存在的 `WeiboAccountSyncService`（该服务从未从
 * workflow-run 的 index 导出）。getMetrics/getAlerts 使用存在的 `WeiboAccountMonitorService`。
 * triggerSync/triggerHealthCheck 依赖的 `WeiboAccountSyncService` 尚未导出，暂保持未实现状态，
 * 待 workflow-run 导出该服务后即可恢复。
 */
@Controller(sdk.AccountMonitorController)
export class AccountMonitorController implements sdk.AccountMonitorController {
  constructor(
    @Inject(WeiboAccountMonitorService) private monitorService: WeiboAccountMonitorService
  ) {}

  async getMetrics(): Promise<sdk.AccountMetrics> {
    const metrics = await this.monitorService.getMetrics()

    // workflow-run 的 AccountMetrics.lastCheckTime / HourlySnapshot.timestamp 为 Date，
    // SDK 要求 string，这里转换为 ISO 字符串
    return {
      total: metrics.total,
      active: metrics.active,
      expired: metrics.expired,
      available: metrics.available,
      availabilityRate: metrics.availabilityRate,
      lastCheckTime: metrics.lastCheckTime.toISOString(),
      trend: metrics.trend.map((snapshot) => ({
        timestamp: snapshot.timestamp.toISOString(),
        total: snapshot.total,
        active: snapshot.active,
        expired: snapshot.expired,
        availabilityRate: snapshot.availabilityRate,
      })),
    }
  }

  async getAlerts(): Promise<sdk.AccountAlert[]> {
    const metrics = await this.monitorService.getMetrics()
    const alerts = await this.monitorService.checkAlerts(metrics)

    // workflow-run 的 Alert.timestamp 为 Date，SDK 要求 string，转换为 ISO 字符串
    return alerts.map((alert) => ({
      level: alert.level,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp.toISOString(),
    }))
  }

  async triggerSync(): Promise<{ added: number; updated: number; errors: string[] }> {
    // 依赖 WeiboAccountSyncService.syncAccountsToRedis，该服务暂未从 @sker/workflow-run 导出
    throw new Error(
      'method triggerSync not implemented: WeiboAccountSyncService is not exported from @sker/workflow-run'
    )
  }

  async triggerHealthCheck(): Promise<{ total: number; valid: number; expired: number; errors: string[] }> {
    // 依赖 WeiboAccountSyncService.checkAccountsHealth，该服务暂未从 @sker/workflow-run 导出
    throw new Error(
      'method triggerHealthCheck not implemented: WeiboAccountSyncService is not exported from @sker/workflow-run'
    )
  }
}
