import { Injectable } from '@sker/core';
import type { MarkdownRequest, MarkdownResponse } from '@sker/sdk';

/**
 * Cloudflare Browser Rendering API 配置
 */
interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

/**
 * Markdown 转换服务
 * 使用 Cloudflare Browser Rendering API 将网页转换为 Markdown
 */
@Injectable({ providedIn: 'root' })
export class MarkdownService {
  private baseUrl = 'https://api.cloudflare.com/client/v4/accounts';

  /**
   * 转换为 Markdown
   */
  async convertToMarkdown(request: MarkdownRequest): Promise<MarkdownResponse> {
    const config = this.getConfig();

    if (!request.url && !request.html) {
      throw new Error('必须提供 url 或 html 参数');
    }

    const body = this.buildRequestBody(request);

    const response = await fetch(`${this.baseUrl}/${config.accountId}/browser-rendering/markdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudflare API 错误: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare API 返回失败: ${JSON.stringify(data)}`);
    }

    return {
      success: true,
      result: data.result,
    };
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(request: MarkdownRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    if (request.url) {
      body.url = request.url;
    }
    if (request.html) {
      body.html = request.html;
    }
    if (request.rejectRequestPattern) {
      body.rejectRequestPattern = request.rejectRequestPattern;
    }
    if (request.gotoOptions) {
      body.gotoOptions = request.gotoOptions;
    }
    if (request.waitForSelector) {
      body.waitForSelector = request.waitForSelector;
    }
    if (request.userAgent) {
      body.userAgent = request.userAgent;
    }

    return body;
  }

  /**
   * 获取配置
   * 优先从环境变量读取，否则使用默认值
   */
  private getConfig(): CloudflareConfig {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      throw new Error('缺少 Cloudflare 配置: 请设置 CLOUDFLARE_ACCOUNT_ID 和 CLOUDFLARE_API_TOKEN 环境变量');
    }

    return { accountId, apiToken };
  }
}
