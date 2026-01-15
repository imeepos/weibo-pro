import type { BrowserRenderRequest, BrowserRenderResponse, BrowserRenderError, Env } from '../types';
import { Logger } from '../utils/logger';
import puppeteer from '@cloudflare/puppeteer';

/**
 * 浏览器渲染处理器
 * 使用 Cloudflare Browser Rendering API 渲染页面并返回 HTML
 */
export class BrowserRenderHandler {
  private static logger = new Logger(undefined, 'browser-render');

  static async handle(request: Request, env: Env): Promise<Response> {
    if (env?.LOGS_STREAM) {
      this.logger = new Logger(env.LOGS_STREAM, 'browser-render');
    }

    const startTime = Date.now();

    try {
      const req: BrowserRenderRequest = await request.json();

      if (!req.url) {
        this.logger.warn('Missing URL in browser render request');
        return this.errorResponse(400, 'URL is required');
      }

      if (!env?.BROWSER) {
        this.logger.warn('Browser binding not available');
        return this.errorResponse(500, 'Browser binding not available - please check Cloudflare Workers configuration');
      }

      this.logger.info('browser-render.start', { url: req.url });

      // 使用 Cloudflare Browser Rendering API 启动浏览器
      const browser = await puppeteer.launch(env.BROWSER);

      const page = await browser.newPage();

      // 设置 User Agent
      if (req.userAgent) {
        await page.setUserAgent(req.userAgent);
      }

      // 设置 Cookie
      if (req.cookies) {
        const cookies = this.parseCookieString(req.cookies, req.url);
        if (cookies.length > 0) {
          await page.setCookie(...cookies);
        }
      }

      // 导航到目标 URL
      await page.goto(req.url, {
        waitUntil: 'domcontentloaded',
        timeout: req.timeout || 45000
      });

      // 等待关键选择器
      const selector = req.waitForSelector || 'div.card, div.m-page, div[action-type="feed_list_item"]';
      await page.waitForSelector(selector, { timeout: 20000 }).catch(() => {
        this.logger.warn('Selector timeout, continuing...', { selector });
      });

      // 获取 HTML
      const html = await page.content();
      const title = await page.title();

      // 关闭页面和断开连接
      await page.close();
      await browser.disconnect();

      const duration = Date.now() - startTime;
      this.logger.info('browser-render.success', {
        url: req.url,
        duration_ms: duration,
        html_length: html.length
      });

      return new Response(JSON.stringify({
        html,
        title,
        url: req.url
      } as BrowserRenderResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(error, { duration_ms: duration });
      return this.errorResponse(500, 'Browser render error', error);
    }
  }

  private static parseCookieString(cookieString: string, url?: string): Array<{ name: string; value: string; domain?: string }> {
    const cookies: Array<{ name: string; value: string; domain?: string }> = [];
    if (!cookieString?.trim()) return cookies;

    // 从 URL 提取 domain
    let domain: string | undefined;
    if (url) {
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch {
        // URL 解析失败，忽略 domain
      }
    }

    cookieString.split(';').forEach(cookie => {
      const [name, ...valueParts] = cookie.trim().split('=');
      if (name && valueParts.length > 0) {
        cookies.push({ name: name.trim(), value: valueParts.join('=').trim(), domain });
      }
    });
    return cookies;
  }

  private static errorResponse(status: number, message: string, details?: unknown): Response {
    const error: BrowserRenderError = {
      error: `BrowserRenderError:${status}`,
      message,
      details
    };
    return new Response(JSON.stringify(error), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
