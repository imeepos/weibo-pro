import { Injectable } from '@sker/core';

interface BackoffState {
  errorCount: number;
  lastErrorTime: number;
}

@Injectable({ providedIn: 'root' })
export class DelayService {
  private backoffStates = new Map<string, BackoffState>();

  async randomDelay(minSeconds: number, maxSeconds: number): Promise<void> {
    const delayMs = (minSeconds + Math.random() * (maxSeconds - minSeconds)) * 1000;
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async fixedDelay(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  recordError(key: string): void {
    // 惰性淘汰：顺带清理超过 1 小时的过期退避状态，防止账号增删后 Map 缓慢增长
    this.clearOldBackoffStates();
    const state = this.backoffStates.get(key) || { errorCount: 0, lastErrorTime: 0 };
    state.errorCount++;
    state.lastErrorTime = Date.now();
    this.backoffStates.set(key, state);
  }

  recordSuccess(key: string): void {
    this.backoffStates.delete(key);
  }

  async backoffDelay(key: string, baseSeconds: number = 1, maxSeconds: number = 60): Promise<void> {
    const state = this.backoffStates.get(key);
    if (!state) {
      return;
    }

    // 限制最大退避时间为 60 秒，防止过度延迟
    // 当错误计数过高时，应该放弃而不是继续重试
    if (state.errorCount > 10) {
      throw new Error(`账号 ${key} 连续失败 ${state.errorCount} 次，超过最大重试次数`);
    }

    const backoffSeconds = Math.min(baseSeconds * Math.pow(2, state.errorCount - 1), maxSeconds);
    await this.fixedDelay(backoffSeconds);
  }

  getErrorCount(key: string): number {
    return this.backoffStates.get(key)?.errorCount || 0;
  }

  clearOldBackoffStates(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [key, state] of this.backoffStates.entries()) {
      if (now - state.lastErrorTime > maxAgeMs) {
        this.backoffStates.delete(key);
      }
    }
  }
}
