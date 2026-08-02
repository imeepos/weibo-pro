import { Injectable } from "@sker/core";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import { delay } from "./utils";

export interface CookieData {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

@Injectable()
export class PlaywrightService {
    private static sharedBrowser: Browser | null = null;
    private static sharedContext: BrowserContext | null = null;
    private static initializationPromise: Promise<void> | null = null;
    private static requestCount = 0;
    private static readonly MAX_REQUESTS_BEFORE_RESTART = 100;
    private static lastRestartTime = Date.now();
    private static readonly MAX_BROWSER_LIFETIME_MS = 60 * 60 * 1000; // 1小时

    async getHtml(url: string, cookies: string, ua: string): Promise<string> {
        // 检查是否需要重启浏览器
        PlaywrightService.requestCount++;
        const timeSinceRestart = Date.now() - PlaywrightService.lastRestartTime;

        if (
            PlaywrightService.requestCount >= PlaywrightService.MAX_REQUESTS_BEFORE_RESTART ||
            timeSinceRestart >= PlaywrightService.MAX_BROWSER_LIFETIME_MS
        ) {
            console.log('[PlaywrightService] 达到清理阈值，重启浏览器', {
                requestCount: PlaywrightService.requestCount,
                timeSinceRestart: `${Math.round(timeSinceRestart / 1000)}s`
            });
            await this.cleanupSharedBrowser();
            PlaywrightService.requestCount = 0;
            PlaywrightService.lastRestartTime = Date.now();
        }

        const page = await this.createPageForRequest(url, cookies, ua);
        try {
            // 等待关键元素出现，确保页面真正加载完成 - 带重试机制
            const selectorMaxRetries = 2;
            for (let retry = 0; retry < selectorMaxRetries; retry++) {
                try {
                    await page.waitForSelector('div.card, div.m-page, div[action-type="feed_list_item"]', {
                        timeout: 20000
                    });
                    break;
                } catch (_error) {
                    if (retry === selectorMaxRetries - 1) {
                        console.warn(`[PlaywrightService] 等待关键元素超时，但继续处理`);
                    } else {
                        console.warn(`[PlaywrightService] 等待选择器失败，重试 ${retry + 1}/${selectorMaxRetries}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            // 等待页面完全加载（但不等待网络空闲，避免无限等待）
            await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {
                console.warn(`[PlaywrightService] 等待页面完全加载超时，但继续处理`);
            });

            // 额外的稳定性等待
            await delay();

            // 等待页面真正稳定（无导航）- 使用重试机制处理临时性导航
            let pageState: { readyState: string; hasContent: boolean; title: string } | null = null;
            const maxRetries = 3;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    pageState = await page.evaluate(() => ({
                        readyState: document.readyState,
                        hasContent: document.body?.innerText?.length > 0,
                        title: document.title
                    }));
                    break;
                } catch (error) {
                    if (i === maxRetries - 1) throw error;
                    console.warn(`[PlaywrightService] 页面导航中，等待稳定... (${i + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (!pageState) {
                throw new Error('无法获取页面状态');
            }

            return await page.content();
        } finally {
            await this.closePageSafely(page);
        }
    }

    private async createPageForRequest(url: string, cookies: string, ua: string): Promise<Page> {
        await this.ensureBrowserReady(ua);
        const context = PlaywrightService.sharedContext;
        if (!context) throw new Error('Browser context not initialized');

        // 清理旧的 cookies（保留最近的50个）
        const existingCookies = await context.cookies();
        if (existingCookies.length > 50) {
            await context.clearCookies();
        }

        const page = await context.newPage();
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        // 设置 cookies
        if (cookies) {
            const parsedCookies = this.parseCookieString(cookies);
            if (parsedCookies.length > 0) {
                const playwrightCookies = parsedCookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(url),
                    path: cookie.path || '/',
                    expires: cookie.expires || Math.floor(Date.now() / 1000) + 3600,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
                }));
                await context.addCookies(playwrightCookies);
            }
        }

        // 导航到目标 URL
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 45000
        });

        return page;
    }

    private async closePageSafely(page: Page): Promise<void> {
        try {
            if (page && !page.isClosed()) {
                await page.close();
            }
        } catch (error) {
            console.warn('[PlaywrightService] 关闭页面失败:', error);
        }
    }

    private parseCookieString(cookieString: string): CookieData[] {
        const cookies: CookieData[] = [];
        if (!cookieString.trim()) return cookies;

        cookieString.split(';').forEach(cookie => {
            const [name, ...valueParts] = cookie.trim().split('=');
            if (name && valueParts.length > 0) {
                cookies.push({
                    name: name.trim(),
                    value: valueParts.join('=').trim()
                });
            }
        });

        return cookies;
    }

    private extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return '';
        }
    }

    private async ensureBrowserReady(ua: string): Promise<void> {
        if (await this.isBrowserHealthy()) return;

        if (PlaywrightService.initializationPromise) {
            await PlaywrightService.initializationPromise;
            if (await this.isBrowserHealthy()) return;
        }

        PlaywrightService.initializationPromise = this.initializeBrowser(ua);
        await PlaywrightService.initializationPromise;
        PlaywrightService.initializationPromise = null;

        if (!await this.isBrowserHealthy()) {
            throw new Error('浏览器初始化失败');
        }
    }

    private async isBrowserHealthy(): Promise<boolean> {
        try {
            const browser = PlaywrightService.sharedBrowser;
            const context = PlaywrightService.sharedContext;

            if (!browser || !context) return false;

            // 检查浏览器是否连接且上下文有效
            const isBrowserConnected = browser.isConnected();
            if (!isBrowserConnected) return false;

            // 检查上下文是否有效（通过创建测试页面）
            try {
                const testPage = await context.newPage();
                await testPage.close();
                return true;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }

    private async initializeBrowser(ua: string): Promise<void> {
        try {
            await this.cleanupSharedBrowser();

            PlaywrightService.sharedBrowser = await chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ],
                timeout: 30000
            });

            const userAgent = typeof ua === 'string' ? ua : '';

            PlaywrightService.sharedContext = await PlaywrightService.sharedBrowser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent,
                ignoreHTTPSErrors: true,
                javaScriptEnabled: true,
                acceptDownloads: false,
                bypassCSP: true
            });

            PlaywrightService.sharedContext.setDefaultTimeout(60000);
            PlaywrightService.sharedContext.setDefaultNavigationTimeout(60000);
        } catch (error) {
            await this.cleanupSharedBrowser();
            throw error;
        }
    }

    private async cleanupSharedBrowser(): Promise<void> {
        try {
            if (PlaywrightService.sharedContext) {
                await PlaywrightService.sharedContext.close();
                PlaywrightService.sharedContext = null;
            }
            if (PlaywrightService.sharedBrowser) {
                await PlaywrightService.sharedBrowser.close();
                PlaywrightService.sharedBrowser = null;
            }
        } catch (error) {
            console.error('清理浏览器失败:', (error as Error).message);
        }
    }

    static async cleanup(): Promise<void> {
        try {
            if (PlaywrightService.sharedContext) {
                await PlaywrightService.sharedContext.close();
                PlaywrightService.sharedContext = null;
            }
            if (PlaywrightService.sharedBrowser) {
                await PlaywrightService.sharedBrowser.close();
                PlaywrightService.sharedBrowser = null;
            }
        } catch (error) {
            console.error('全局浏览器清理失败:', (error as Error).message);
        }
    }
}