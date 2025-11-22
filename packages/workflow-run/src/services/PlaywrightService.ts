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

    private page: Page | null = null;

    async getHtml(url: string, cookies: string, ua: string): Promise<string> {
        // 为每个请求创建独立的页面和cookies上下文
        await this.ensureBrowserReady(ua);
        if (!this.page) throw new Error(`创建页面失败`)

        // 在页面导航之前设置cookies
        await this.setCookiesForPage(cookies, url);

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
        // 如果浏览器健康，直接创建页面
        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        // 如果正在初始化，等待初始化完成
        if (PlaywrightService.initializationPromise) {
            await PlaywrightService.initializationPromise;
            if (await this.isBrowserHealthy()) {
                await this.createPage();
                return;
            }
        }

        // 开始新的初始化
        PlaywrightService.initializationPromise = this.initializeBrowserWithRetry(ua);
        await PlaywrightService.initializationPromise;

        // 初始化完成后清理 promise
        PlaywrightService.initializationPromise = null;

        if (await this.isBrowserHealthy()) {
            await this.createPage();
            return;
        }

        throw new Error('浏览器初始化失败');
    }

    private async initializeBrowserWithRetry(ua: string): Promise<void> {
        try {
            await this.cleanupSharedBrowser();
            await this.initializeBrowser(ua);
            return;
        } catch (error) {
            throw error;
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

            // 设置更宽松的默认超时
            PlaywrightService.sharedContext.setDefaultTimeout(60000);
            PlaywrightService.sharedContext.setDefaultNavigationTimeout(60000);

            await this.createPage();
        } catch (error) {
            await this.cleanupSharedBrowser();
            throw error;
        }
    }

    private async createPage(): Promise<void> {
        const context = PlaywrightService.sharedContext;
        if (!context) throw new Error('Browser context not initialized');

        try {
            this.page = await context.newPage();
            this.page.setDefaultTimeout(60000);
            this.page.setDefaultNavigationTimeout(60000);

            // 添加页面事件监听，检测页面意外关闭
            this.page.on('close', () => {
                console.warn('[PlaywrightService] 页面意外关闭');
                this.page = null;
            });

            this.page.on('crash', () => {
                console.error('[PlaywrightService] 页面崩溃');
                this.page = null;
            });
        } catch (error) {
            console.error('[PlaywrightService] 创建页面失败:', error);
            this.page = null;
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