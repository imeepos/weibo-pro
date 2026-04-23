import { Injectable, Inject, logger } from '@sker/core'
import { RedisClient } from '@sker/redis'
import { useEntityManager, WeiboAccountEntity, WeiboAccountStatus } from '@sker/entities'
import { PlaywrightService } from './PlaywrightService'
import { WeiboHtmlParser } from './WeiboHtmlParser'

/**
 * 同步结果接口
 */
export interface SyncResult {
  /** 新添加的账号数量 */
  added: number
  /** 更新的账号数量 */
  updated: number
  /** 错误信息列表 */
  errors: string[]
}

/**
 * 健康检查结果接口
 */
export interface HealthCheckResult {
  /** 总账号数 */
  total: number
  /** 有效账号数 */
  valid: number
  /** 过期账号数 */
  expired: number
  /** 错误信息列表 */
  errors: string[]
}

/**
 * 微博账号同步服务
 *
 * 功能：
 * 1. 启动时自动同步 - 确保 Redis 中有所有 ACTIVE 账号的健康分数记录
 * 2. 定期同步任务 - 每小时执行一次，检查数据一致性
 * 3. 健康分数修复 - 发现分数为 0 或负数的账号，自动重置为 10000
 * 4. 清理无效账号 - 移除 Redis 中已删除的账号
 * 5. Cookie 健康检查 - 验证账号 Cookie 是否有效
 */
@Injectable()
export class WeiboAccountSyncService {
  private readonly healthKey = 'weibo:account:health'
  private readonly defaultHealthScore = 10000
  private readonly testUrl = 'https://weibo.com'
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  private readonly concurrentLimit = 3

  constructor(
    @Inject(RedisClient) private readonly redis: RedisClient,
    @Inject(PlaywrightService) private readonly playwright: PlaywrightService,
    @Inject(WeiboHtmlParser) private readonly htmlParser: WeiboHtmlParser
  ) {}

  /**
   * 同步账号到 Redis
   *
   * 执行流程：
   * 1. 从数据库查询所有 ACTIVE 账号
   * 2. 检查每个账号在 Redis 中的健康分数
   * 3. 如果缺失，添加到 Redis（分数 10000）
   * 4. 如果分数 <= 0，重置为 10000
   * 5. 清理 Redis 中已删除的账号
   *
   * @returns 同步结果（添加数量、更新数量、错误列表）
   */
  async syncAccountsToRedis(): Promise<SyncResult> {
    const result: SyncResult = {
      added: 0,
      updated: 0,
      errors: []
    }

    try {
      // 1. 从数据库查询所有 ACTIVE 账号
      const activeAccounts = await useEntityManager(async (manager) => {
        return await manager.find(WeiboAccountEntity, {
          where: { status: WeiboAccountStatus.ACTIVE }
        })
      })

      const activeAccountIds = new Set<string>()

      // 2. 检查每个账号在 Redis 中的状态
      for (const account of activeAccounts) {
        const accountId = account.id.toString()
        activeAccountIds.add(accountId)

        try {
          const score = await this.redis.zscore(this.healthKey, accountId)

          // 账号缺失，添加到 Redis
          if (score === null) {
            await this.redis.zadd(this.healthKey, this.defaultHealthScore, accountId)
            result.added++
            logger.debug(`[WeiboAccountSyncService] 添加账号到 Redis`, {
              accountId,
              score: this.defaultHealthScore
            })
            continue
          }

          // 分数 <= 0，需要修复
          if (score <= 0) {
            await this.redis.zadd(this.healthKey, this.defaultHealthScore, accountId)
            result.updated++
            logger.debug(`[WeiboAccountSyncService] 修复账号健康分数`, {
              accountId,
              oldScore: score,
              newScore: this.defaultHealthScore
            })
            continue
          }

          // 分数正常，无需处理
        } catch (error) {
          const errorMsg = `处理账号 ${accountId} 失败: ${(error as Error).message}`
          result.errors.push(errorMsg)
          logger.error(`[WeiboAccountSyncService] ${errorMsg}`)
        }
      }

      // 3. 清理 Redis 中已删除的账号
      try {
        const allRedisMembers = await this.redis.zrange(this.healthKey, 0, -1)
        for (const member of allRedisMembers) {
          if (!activeAccountIds.has(member)) {
            await this.redis.zrem(this.healthKey, member)
            logger.debug(`[WeiboAccountSyncService] 清理已删除账号`, { accountId: member })
          }
        }
      } catch (error) {
        const errorMsg = `清理 Redis 失败: ${(error as Error).message}`
        result.errors.push(errorMsg)
        logger.error(`[WeiboAccountSyncService] ${errorMsg}`)
      }

      // 4. 记录同步结果日志
      logger.info('[WeiboAccountSyncService] 账号同步完成', {
        added: result.added,
        updated: result.updated,
        errors: result.errors.length,
        totalActiveAccounts: activeAccounts.length
      })

    } catch (error) {
      const errorMsg = `同步失败: ${(error as Error).message}`
      result.errors.push(errorMsg)
      logger.error(`[WeiboAccountSyncService] ${errorMsg}`)
    }

    return result
  }

  /**
   * 检查所有账号的 Cookie 健康状态
   *
   * 执行流程：
   * 1. 从数据库查询所有 ACTIVE 账号
   * 2. 并发检查每个账号的 Cookie 有效性（每批最多 3 个）
   * 3. 自动标记过期账号为 EXPIRED 并从 Redis 移除
   * 4. 返回健康检查统计结果
   *
   * @returns 健康检查结果（总数、有效数、过期数、错误列表）
   */
  async checkAccountsHealth(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      total: 0,
      valid: 0,
      expired: 0,
      errors: []
    }

    try {
      // 1. 从数据库查询所有 ACTIVE 账号
      const activeAccounts = await useEntityManager(async (manager) => {
        return await manager.find(WeiboAccountEntity, {
          where: { status: WeiboAccountStatus.ACTIVE }
        })
      })

      result.total = activeAccounts.length

      if (activeAccounts.length === 0) {
        logger.info('[WeiboAccountSyncService] 健康检查完成：无账号需要检查')
        return result
      }

      logger.info('[WeiboAccountSyncService] 开始健康检查', {
        totalAccounts: activeAccounts.length
      })

      // 2. 分批并发检查（每批最多 3 个账号）
      for (let i = 0; i < activeAccounts.length; i += this.concurrentLimit) {
        const batch = activeAccounts.slice(i, i + this.concurrentLimit)

        // 并发检查当前批次
        const batchResults = await Promise.allSettled(
          batch.map(account => this.checkAccountHealth(account))
        )

        // 处理批次结果
        for (let j = 0; j < batchResults.length; j++) {
          const account = batch[j]
          const checkResult = batchResults[j]

          if (!account || !checkResult) continue

          if (checkResult.status === 'fulfilled') {
            if (checkResult.value) {
              result.valid++
              logger.debug(`[WeiboAccountSyncService] 账号 ${account.id} Cookie 有效`)
            } else {
              result.expired++
              // 自动标记为过期并从 Redis 移除
              await this.redis.zrem(this.healthKey, account.id)

              await useEntityManager(async (manager) => {
                const expiredAccount = await manager.findOne(WeiboAccountEntity, {
                  where: { id: account.id }
                })
                if (expiredAccount) {
                  expiredAccount.status = WeiboAccountStatus.EXPIRED
                  expiredAccount.lastCheckAt = new Date()
                  await manager.save(expiredAccount)
                  logger.info(`[WeiboAccountSyncService] 账号 ${account.id} (${expiredAccount.weiboNickname}) Cookie 已过期，标记为 EXPIRED`)
                }
              })
            }
          } else {
            // 检查失败，记录错误
            const errorMsg = `检查账号 ${account.id} 失败: ${(checkResult.reason as Error).message}`
            result.errors.push(errorMsg)
            logger.error(`[WeiboAccountSyncService] ${errorMsg}`)
          }
        }
      }

      logger.info('[WeiboAccountSyncService] 健康检查完成', {
        total: result.total,
        valid: result.valid,
        expired: result.expired,
        errors: result.errors.length
      })

    } catch (error) {
      const errorMsg = `健康检查失败: ${(error as Error).message}`
      result.errors.push(errorMsg)
      logger.error(`[WeiboAccountSyncService] ${errorMsg}`)
    }

    return result
  }

  /**
   * 检查单个账号的 Cookie 是否有效
   *
   * @param account 账号实体
   * @returns true=有效, false=无效/过期
   */
  private async checkAccountHealth(account: WeiboAccountEntity): Promise<boolean> {
    try {
      // 1. 将 JSON 格式的 cookies 转换为 Cookie Header 格式
      const cookieHeader = this.composeCookieHeader(account.cookies)
      if (!cookieHeader) {
        throw new Error('Cookie 格式无效或为空')
      }

      // 2. 使用 Playwright 获取微博首页 HTML
      const html = await this.playwright.getHtml(this.testUrl, cookieHeader, this.userAgent)

      // 3. 使用 WeiboHtmlParser 检测登录失效
      try {
        this.htmlParser.parseSearchResultHtml(html)
        // 没有抛出 LOGIN_EXPIRED 错误，说明 Cookie 有效
        return true
      } catch (error) {
        if (error instanceof Error && error.message === 'LOGIN_EXPIRED') {
          logger.debug(`[WeiboAccountSyncService] 账号 ${account.id} Cookie 已过期`)
          return false
        }
        // 其他解析错误，向上抛出
        throw error
      }

    } catch (error) {
      // 网络错误等，向上抛出，由调用方处理
      throw error
    }
  }

  /**
   * 将 JSON 格式的 cookies 转换为 Cookie Header 格式
   * （复用 WeiboAccountService 的逻辑）
   */
  private composeCookieHeader(raw: string | null | undefined): string | null {
    if (!raw || !raw.trim()) {
      return null
    }

    const trimmed = raw.trim()

    try {
      const parsed = JSON.parse(trimmed)

      if (Array.isArray(parsed)) {
        const fragments = parsed
          .map((entry) => {
            if (!entry) {
              return ''
            }
            const name = typeof entry.name === 'string' ? entry.name.trim() : ''
            const value = typeof entry.value === 'string' ? entry.value.trim() : ''
            if (!name || !value) {
              return ''
            }
            return `${name}=${value}`
          })
          .filter((fragment) => fragment.length > 0)

        return fragments.length > 0 ? fragments.join('; ') : null
      }
    } catch {
      // fall through - treat as plain cookie string
    }

    return trimmed.includes('=') ? trimmed : null
  }
}
