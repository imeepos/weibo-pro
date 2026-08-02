import { chromium, type Browser, type BrowserContext, } from 'playwright';
import type { BrowserConfig, BrowserInstance, StorageState } from './types';
import { STEALTH_SCRIPT } from './stealth';

export class BrowserManager {
  private pool: Map<string, BrowserInstance> = new Map();
  private maxPoolSize: number;
  private idleTimeout: number;

  constructor(maxPoolSize = 5, idleTimeout = 300000) {
    this.maxPoolSize = maxPoolSize;
    this.idleTimeout = idleTimeout;
  }

  async launch(config: BrowserConfig = {}): Promise<{ browser: Browser; context: BrowserContext }> {
    const poolKey = this.getPoolKey(config);
    const existing = this.pool.get(poolKey);

    if (existing && !existing.inUse) {
      existing.inUse = true;
      return { browser: existing.browser, context: existing.context };
    }

    if (this.pool.size >= this.maxPoolSize) {
      await this.evictIdle();
    }

    const { browser, context } = await this.createBrowser(config);

    this.pool.set(poolKey, {
      browser,
      context,
      inUse: true,
      createdAt: Date.now()
    });

    return { browser, context };
  }

  async release(browser: Browser): Promise<void> {
    for (const [_key, instance] of Array.from(this.pool.entries())) {
      if (instance.browser === browser) {
        instance.inUse = false;
        return;
      }
    }
  }

  async close(browser: Browser): Promise<void> {
    for (const [key, instance] of Array.from(this.pool.entries())) {
      if (instance.browser === browser) {
        await instance.context.close();
        await instance.browser.close();
        this.pool.delete(key);
        return;
      }
    }
  }

  async closeAll(): Promise<void> {
    await Promise.all(
      Array.from(this.pool.values()).map(async (instance) => {
        await instance.context.close();
        await instance.browser.close();
      })
    );
    this.pool.clear();
  }

  private async createBrowser(config: BrowserConfig): Promise<{ browser: Browser; context: BrowserContext }> {
    const launchOptions = {
      headless: config.headless ?? true,
      proxy: config.proxy,
    };

    const browser = config.cdpEndpoint
      ? await chromium.connectOverCDP(config.cdpEndpoint)
      : await chromium.launch(launchOptions);

    const context = await browser.newContext({
      userAgent: config.userAgent,
      viewport: config.viewport,
      locale: config.locale ?? 'zh-CN',
      timezoneId: config.timezone ?? 'Asia/Shanghai',
    });

    await context.addInitScript(STEALTH_SCRIPT);

    return { browser, context };
  }

  private getPoolKey(config: BrowserConfig): string {
    return JSON.stringify({
      headless: config.headless,
      proxy: config.proxy?.server,
      cdp: config.cdpEndpoint,
    });
  }

  private async evictIdle(): Promise<void> {
    const now = Date.now();
    for (const [key, instance] of Array.from(this.pool.entries())) {
      if (!instance.inUse && now - instance.createdAt > this.idleTimeout) {
        await instance.context.close();
        await instance.browser.close();
        this.pool.delete(key);
        return;
      }
    }
  }

  async saveStorage(context: BrowserContext, path: string): Promise<void> {
    await context.storageState({ path });
  }

  async loadStorage(context: BrowserContext, state: StorageState): Promise<void> {
    await context.addCookies(state.cookies);

    for (const origin of state.origins) {
      const page = await context.newPage();
      await page.goto(origin.origin);
      await page.evaluate((items) => {
        for (const item of items) {
          localStorage.setItem(item.name, item.value);
        }
      }, origin.localStorage);
      await page.close();
    }
  }
}
