import { Controller, Get } from '@sker/core'
import type { AccountMetrics, AccountAlert } from '../types'

@Controller('account-monitor')
export class AccountMonitorController {
  /**
   * 获取账号监控指标
   * 返回当前账号状态统计和可用率
   */
  @Get('metrics')
  async getMetrics(): Promise<AccountMetrics> {
    throw new Error('method getMetrics not implements')
  }

  /**
   * 获取账号告警列表
   * 返回当前活跃的告警信息
   */
  @Get('alerts')
  async getAlerts(): Promise<AccountAlert[]> {
    throw new Error('method getAlerts not implements')
  }

  /**
   * 手动触发账号同步
   * 立即同步 Redis 和数据库账号数据
   */
  @Get('sync')
  async triggerSync(): Promise<{ added: number; updated: number; errors: string[] }> {
    throw new Error('method triggerSync not implements')
  }

  /**
   * 手动触发账号健康检查
   * 立即检查所有账号 Cookie 有效性
   */
  @Get('health-check')
  async triggerHealthCheck(): Promise<{ total: number; valid: number; expired: number; errors: string[] }> {
    throw new Error('method triggerHealthCheck not implements')
  }
}
