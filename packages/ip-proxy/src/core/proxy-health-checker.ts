import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import { ProxyPool } from './proxy-pool'

/**
 * 代理健康检查器
 *
 * 职责：
 * - 定时检测代理池健康状态
 * - 自动移除失效代理
 * - 自动刷新过期代理
 */
@Injectable()
export class ProxyHealthChecker {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor(
    private readonly pool: ProxyPool,
    private readonly logger: Logger
  ) {}

  /**
   * 启动健康检查
   */
  start(intervalMs: number = 60000): void {
    if (this.isRunning) {
      this.logger.warn('[ProxyHealthChecker] 健康检查已在运行')
      return
    }

    this.logger.info(`[ProxyHealthChecker] 启动健康检查，间隔 ${intervalMs}ms`)

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.check().catch((error) => {
        this.logger.error('[ProxyHealthChecker] 健康检查失败', error)
      })
    }, intervalMs)
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (!this.isRunning || !this.intervalId) {
      return
    }

    clearInterval(this.intervalId)
    this.intervalId = null
    this.isRunning = false
    this.logger.info('[ProxyHealthChecker] 健康检查已停止')
  }

  /**
   * 执行一次健康检查
   */
  async check(): Promise<void> {
    try {
      this.logger.debug('[ProxyHealthChecker] 执行健康检查')
      await this.pool.refreshExpiredProxies()
    } catch (error) {
      this.logger.error('[ProxyHealthChecker] 健康检查执行失败', error)
      throw error
    }
  }
}
