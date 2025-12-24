import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { RetryConfig } from './types';

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  shouldRetry(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= this.config.maxRetries) return false;
    if (!error.response) return true;
    return this.config.retryableStatuses.includes(error.response.status);
  }

  getDelay(retryCount: number): number {
    const delay = this.config.baseDelay * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxDelay);
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    let lastError: any;
    const retryCount = (config as any)?.__retryCount || 0;

    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (!this.shouldRetry(error, i)) {
          throw error;
        }

        const delay = this.getDelay(i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}
