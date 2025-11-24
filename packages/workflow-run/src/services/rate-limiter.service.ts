import { Injectable } from '@sker/core';

class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private capacity: number,
    private refillRate: number,
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

@Injectable({ providedIn: 'root' })
export class RateLimiterService {
  private globalBucket: TokenBucket;
  private accountBuckets = new Map<string, TokenBucket>();

  constructor() {
    this.globalBucket = new TokenBucket(10, 10);
  }

  async acquire(accountId?: string): Promise<void> {
    while (!this.globalBucket.tryConsume(1)) {
      await this.sleep(50);
    }

    if (accountId) {
      const accountBucket = this.getAccountBucket(accountId);
      while (!accountBucket.tryConsume(1)) {
        await this.sleep(50);
      }
    }
  }

  private getAccountBucket(accountId: string): TokenBucket {
    if (!this.accountBuckets.has(accountId)) {
      this.accountBuckets.set(accountId, new TokenBucket(5, 5));
    }
    return this.accountBuckets.get(accountId)!;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setGlobalRate(capacity: number, refillRate: number): void {
    this.globalBucket = new TokenBucket(capacity, refillRate);
  }

  setAccountRate(accountId: string, capacity: number, refillRate: number): void {
    this.accountBuckets.set(accountId, new TokenBucket(capacity, refillRate));
  }

  getGlobalAvailableTokens(): number {
    return this.globalBucket.getAvailableTokens();
  }

  getAccountAvailableTokens(accountId: string): number {
    return this.getAccountBucket(accountId).getAvailableTokens();
  }

  clearAccountBucket(accountId: string): void {
    this.accountBuckets.delete(accountId);
  }
}
