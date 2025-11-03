import { Injectable } from "@sker/core";
import { Browser, BrowserContext, chromium, Page } from "playwright";

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
        try {
            await this.ensureBrowserReady(ua);
            await this.setCookies(cookies, url);
            if (!this.page) throw new Error(`创建页面失败`)
            await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            const html = await this.page.content();
            return html;
        } finally {
            await this.closePage()
        }
    }
    private async setCookies(cookies: string, url: string): Promise<void> {
        const context = PlaywrightService.sharedContext;
        if (!cookies || !context) return;
        try {
            await context.clearCookies();
            // 2. 解析cookies数据
            let cookies: CookieData[] = [];

            if (typeof cookies === 'string') {
                // 从字符串解析cookies（支持格式："name1=value1; name2=value2"）
                cookies = this.parseCookieString(cookies);
            } else if (Array.isArray(cookies)) {
                // 直接使用CookieData数组
                cookies = cookies;
            }

            if (cookies.length > 0) {
                const playwrightCookies = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain || this.extractDomain(url!),
                    path: cookie.path || '/',
                    expires: cookie.expires!,
                    httpOnly: cookie.httpOnly || false,
                    secure: cookie.secure || false,
                    sameSite: cookie.sameSite || 'Lax'
                }));

                await context.addCookies(playwrightCookies);
            }

        } catch (error) {
            console.error('设置cookies失败:', (error as Error).message);
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