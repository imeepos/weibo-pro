import { Injectable, createLogger } from '@sker/core';

const logger = createLogger('WorkerBrowserService');

@Injectable()
export class WorkerBrowserService {
  private readonly enabled: boolean;
  private readonly workerUrl: string;
  private readonly maxRetries: number;

  constructor() {
    this.enabled = process.env.WORKER_BROWSER_ENABLED === 'true';
    this.workerUrl = process.env.WORKER_BROWSER_URL || 'https://api.sker.us/browser-render';
    this.maxRetries = Number(process.env.WORKER_BROWSER_MAX_RETRIES) || 3;

    if (this.enabled) {
      logger.info('WorkerBrowserService 已启用', {
        workerUrl: this.workerUrl,
        maxRetries: this.maxRetries
      });
    }
  }

  /**
   * 获取渲染后的 HTML - 与 PlaywrightService 接口兼容
   */
  async getHtml(url: string, cookies: string, ua: string): Promise<string> {
    if (!this.enabled) {
      throw new Error('WorkerBrowserService 未启用，请设置 WORKER_BROWSER_ENABLED=true');
    }

    logger.info('请求 Worker Browser 渲染', { url });

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.workerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            cookies,
            userAgent: ua,
            waitForSelector: 'div.card, div.m-page, div[action-type="feed_list_item"]',
            timeout: 45000,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Worker Browser error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (!data.html) {
          throw new Error('响应中缺少 HTML 内容');
        }

        logger.info('Worker Browser 渲染成功', {
          url,
          htmlLength: data.html.length,
          attempt: attempt + 1
        });

        return data.html;

      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;

        logger.warn('Worker Browser 请求失败', {
          url,
          attempt: attempt + 1,
          isLastAttempt,
          error: (error as Error).message
        });

        if (isLastAttempt) {
          throw error;
        }

        await this.sleep(1000 * Math.pow(2, attempt));
      }
    }

    throw new Error('获取 HTML 失败：已达最大重试次数');
  }

  /**
   * 静态清理方法 - 与 PlaywrightService 兼容
   */
  static async cleanup(): Promise<void> {
    // Worker 模式无需清理资源
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
