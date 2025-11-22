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
    private static isInitializing = false;

    private page: Page | null = null;

    async getHtml(url: string, cookies: string, ua: string): Promise<string> {
        const maxRetries = 2; // 减少重试次数，避免过度重试
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // 为每个请求创建独立的页面和cookies上下文
                await this.ensureBrowserReady(ua);
                if (!this.page) throw new Error(`创建页面失败`)

                // 在页面导航之前设置cookies
                await this.setCookiesForPage(cookies, url);

                console.log(`[PlaywrightService] 导航到页面: ${url} (第${attempt}次尝试)`);

                // 使用更可靠的等待策略 - 针对微博搜索页面优化
                if (!this.page) {
                    throw new Error('页面意外关闭，无法导航');
                }
                await this.page.goto(url, {
                    waitUntil: 'domcontentloaded', // 先等待DOM加载完成
                    timeout: 45000 // 增加超时时间
                });

                // 等待关键元素出现，确保页面真正加载完成
                if (!this.page) {
                    throw new Error('页面意外关闭，无法等待元素');
                }
                await this.page.waitForSelector('div.card, div.m-page, div[action-type="feed_list_item"]', {
                    timeout: 30000
                }).catch(() => {
                    console.warn(`[PlaywrightService] 等待关键元素超时，但继续处理`);
                });

                // 等待页面完全加载（但不等待网络空闲，避免无限等待）
                if (!this.page) {
                    throw new Error('页面意外关闭，无法等待加载状态');
                }
                await this.page.waitForLoadState('load', { timeout: 10000 }).catch(() => {
                    console.warn(`[PlaywrightService] 等待页面完全加载超时，但继续处理`);
                });

                // 额外的稳定性等待
                await delay();

                // 检查页面是否真正稳定
                if (!this.page) {
                    throw new Error('页面意外关闭，无法执行 evaluate');
                }
                const pageState = await this.page.evaluate(() => ({
                    readyState: document.readyState,
                    hasContent: document.body?.innerText?.length > 0,
                    title: document.title
                }));

                console.log(`[PlaywrightService] 页面状态: readyState=${pageState.readyState}, hasContent=${pageState.hasContent}, title=${pageState.title}`);

                // 检查页面内容，检测登录失效
                if (!this.page) {
                    throw new Error('页面意外关闭，无法获取URL');
                }
                const currentUrl = this.page.url();
                console.log(`[PlaywrightService] 当前页面URL: ${currentUrl}`);

                if (!this.page) {
                    throw new Error('页面意外关闭，无法获取内容');
                }
                const html = await this.page.content();
                console.log(`[PlaywrightService] 成功获取页面内容，长度: ${html.length}`);
                return html;
            } catch (error) {
                lastError = error as Error;
                console.error(`[PlaywrightService] 第${attempt}次尝试失败:`, error);

                // 更精确的重试条件：只在特定错误时重试
                const shouldRetry = error instanceof Error && (
                    // 页面导航相关错误
                    error.message.includes('Target page, context or browser has been closed') ||
                    error.message.includes('Execution context was destroyed') ||
                    error.message.includes('Protocol error') ||
                    // 网络相关错误
                    (error.message.includes('net::') && !error.message.includes('net::ERR_ABORTED')) ||
                    // 超时错误
                    error.message.includes('Timeout')
                );

                if (shouldRetry && attempt < maxRetries) {
                    console.warn(`[PlaywrightService] 检测到可重试错误，第${attempt}次重试: ${error.message}`);
                    await this.closePage();
                    await delay();
                    continue;
                }

                // 其他错误直接抛出
                throw error;
            } finally {
                await this.closePage();
            }
        }

        throw new Error(`获取页面内容失败，重试${maxRetries}次后仍然失败: ${lastError?.message}`);
    }
    private async setCookiesForPage(cookiesInput: string, url: string): Promise<void> {
        if (!cookiesInput || !this.page) {
            console.warn('[PlaywrightService] 缺少cookies或页面');
            return;
        }

        try {
            // 解析cookies数据
            const parsedCookies = this.parseCookieString(cookiesInput);

            if (parsedCookies.length > 0) {
                console.log(`[PlaywrightService] 准备为页面设置 ${parsedCookies.length} 个cookies`);

                // 为页面设置cookies - 使用页面级别的cookies设置
                const playwrightCookies = parsedCookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(url),
                    path: cookie.path || '/',
                    expires: cookie.expires || Math.floor(Date.now() / 1000) + 3600, // 默认1小时过期
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
                }));

                // 使用页面上下文设置cookies，避免影响其他页面
                await this.page.context().addCookies(playwrightCookies);
                console.log(`[PlaywrightService] 成功为页面设置 ${playwrightCookies.length} 个cookies`);
            } else {
                console.warn('[PlaywrightService] 解析后没有有效的cookies');
            }

        } catch (error) {
            console.error('[PlaywrightService] 设置页面cookies失败:', error);
            throw new Error(`设置页面cookies失败: ${(error as Error).message}`);
        }
    }

    private async setCookies(cookiesInput: string, url: string): Promise<void> {
        const context = PlaywrightService.sharedContext;
        if (!cookiesInput || !context) {
            console.warn('[PlaywrightService] 缺少cookies或浏览器上下文');
            return;
        }

        try {
            await context.clearCookies();

            // 解析cookies数据
            let parsedCookies: CookieData[] = [];

            // cookiesInput 始终是字符串，直接解析
            console.log(`[PlaywrightService] 解析cookies字符串，长度: ${cookiesInput.length}`);
            parsedCookies = this.parseCookieString(cookiesInput);

            if (parsedCookies.length > 0) {
                console.log(`[PlaywrightService] 准备设置 ${parsedCookies.length} 个cookies`);

                const playwrightCookies = parsedCookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(url),
                    path: cookie.path || '/',
                    expires: cookie.expires || Math.floor(Date.now() / 1000) + 3600, // 默认1小时过期
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
                }));

                await context.addCookies(playwrightCookies);
                console.log(`[PlaywrightService] 成功设置 ${playwrightCookies.length} 个cookies`);
            } else {
                console.warn('[PlaywrightService] 解析后没有有效的cookies');
            }

        } catch (error) {
            console.error('[PlaywrightService] 设置cookies失败:', error);
            throw new Error(`设置cookies失败: ${(error as Error).message}`);
        }
    }
    private parseCookieString(cookieString: string): CookieData[] {
        const cookies: CookieData[] = [];

        if (!cookieString.trim()) return cookies;

        // 解析 "name1=value1; name2=value2" 格式
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
    private async closePage(): Promise<void> {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
    }

    private async ensureBrowserReady(ua: string): Promise<void> {
        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        while (PlaywrightService.isInitializing) {
            await this.sleep(100);
        }

        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        await this.initializeBrowser(ua);
    }

    private async isBrowserHealthy(): Promise<boolean> {
        try {
            const browser = PlaywrightService.sharedBrowser;
            const context = PlaywrightService.sharedContext;

            if (!browser || !context) return false;

            return browser.isConnected();
        } catch {
            return false;
        }
    }

    private async initializeBrowser(ua: string): Promise<void> {
        PlaywrightService.isInitializing = true;

        try {
            await this.cleanupSharedBrowser();

            PlaywrightService.sharedBrowser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const userAgent = typeof ua === 'string' ? ua : '';

            PlaywrightService.sharedContext = await PlaywrightService.sharedBrowser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent,
            });

            await this.createPage();
        } finally {
            PlaywrightService.isInitializing = false;
        }
    }

    private async createPage(): Promise<void> {
        const context = PlaywrightService.sharedContext;
        if (!context) throw new Error('Browser context not initialized');

        this.page = await context.newPage();
        this.page.setDefaultTimeout(30000);
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

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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