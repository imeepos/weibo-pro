import { Controller, Get, Inject } from '@sker/core'
import { root } from '@sker/core'
import * as sdk from '@sker/sdk'
import { WeiboAccountSyncService } from '@sker/workflow-run'
import { WeiboAccountMonitorService } from '@sker/workflow-run'

@Controller(sdk.AccountMonitorController)
export class AccountMonitorController implements sdk.AccountMonitorController {
  constructor(
    @Inject(WeiboAccountSyncService) private syncService: WeiboAccountSyncService,
    @Inject(WeiboAccountMonitorService) private monitorService: WeiboAccountMonitorService
  ) {}

  async getMetrics() {
    return this.monitorService.getMetrics()
  }

  async getAlerts() {
    const metrics = await this.monitorService.getMetrics()
    const alerts = await this.monitorService.checkAlerts(metrics)
    return alerts
  }

  async triggerSync() {
    return this.syncService.syncAccountsToRedis()
  }

  async triggerHealthCheck() {
    return this.syncService.checkAccountsHealth()
  }
}
