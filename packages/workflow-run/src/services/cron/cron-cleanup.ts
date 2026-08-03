import { logger } from '@sker/core'
import { cleanupIdleConnections } from '@sker/entities'

/**
 * 触发定期清理（浏览器实例 + 数据库连接 + GC）
 */
export async function triggerCleanup(): Promise<void> {
  logger.info('🧹 触发定期清理')

  try {
    // 清理 Playwright 浏览器实例
    const { PlaywrightService } = await import('../PlaywrightService.js')
    await PlaywrightService.cleanup()
    logger.info('✅ Playwright 浏览器实例已清理')
  } catch (error) {
    logger.error('清理 Playwright 失败', { error: (error as Error).message })
  }

  try {
    // 清理空闲数据库连接（空闲超过 60 秒，保留最少 5 个）
    const cleanedCount = await cleanupIdleConnections(60000, 5)
    if (cleanedCount > 0) {
      logger.info(`✅ 数据库空闲连接已清理`, { count: cleanedCount })
    }
  } catch (error) {
    logger.error('清理数据库连接失败', { error: (error as Error).message })
  }

  // 触发 GC（如果可用）
  if (global.gc) {
    global.gc()
    logger.info('✅ 手动触发 GC 完成')
  }

  // 记录内存使用情况
  logMemoryUsage()
}

/**
 * 记录内存使用情况
 */
export function logMemoryUsage(): void {
  const used = process.memoryUsage()
  logger.info('📊 内存使用情况', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(used.external / 1024 / 1024)}MB`
  })
}
