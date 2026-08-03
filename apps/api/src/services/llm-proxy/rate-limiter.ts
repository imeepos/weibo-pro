import { logger } from '@sker/core';
import { RATE_LIMIT_COOLDOWN_MS } from './types';

/**
 * 限流状态管理：记录被 429 限流的 provider 及解锁时间
 */
export class RateLimiter {
  /** 被限流的 provider，value 为解锁时间戳 */
  private rateLimitedProviders = new Map<string, number>();

  isRateLimited(providerId: string): boolean {
    const unlockTime = this.rateLimitedProviders.get(providerId)
    if (!unlockTime) return false
    if (Date.now() >= unlockTime) {
      this.rateLimitedProviders.delete(providerId)
      logger.info(`Provider ${providerId} 冷却结束，已解锁`)
      return false
    }
    return true
  }

  setRateLimited(providerId: string): void {
    const unlockTime = Date.now() + RATE_LIMIT_COOLDOWN_MS
    this.rateLimitedProviders.set(providerId, unlockTime)
    logger.warn(`Provider ${providerId} 被限流`, { unlockTime: new Date(unlockTime).toLocaleTimeString() })
  }

  getActiveProviderIds(): string[] {
    return [...this.rateLimitedProviders.keys()].filter(id => this.isRateLimited(id))
  }
}
