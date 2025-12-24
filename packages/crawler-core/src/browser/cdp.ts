import { chromium, type Browser, type CDPSession, type Page } from 'playwright';

export class CDPBrowser {
  private browser: Browser | null = null;
  private cdpSession: CDPSession | null = null;

  async connect(endpoint: string): Promise<Browser> {
    this.browser = await chromium.connectOverCDP(endpoint);
    return this.browser;
  }

  async createSession(page: Page): Promise<CDPSession> {
    const client = await page.context().newCDPSession(page);
    this.cdpSession = client;
    return client;
  }

  async send(method: string, params?: object): Promise<any> {
    if (!this.cdpSession) {
      throw new Error('CDP session not initialized');
    }
    return await this.cdpSession.send(method as any, params);
  }

  async enableNetwork(): Promise<void> {
    await this.send('Network.enable');
  }

  async setUserAgent(userAgent: string): Promise<void> {
    await this.send('Network.setUserAgentOverride', { userAgent });
  }

  async setExtraHeaders(headers: Record<string, string>): Promise<void> {
    await this.send('Network.setExtraHTTPHeaders', { headers });
  }

  async setCookie(cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
  }>): Promise<void> {
    await this.send('Network.setCookies', { cookies });
  }

  async clearCache(): Promise<void> {
    await this.send('Network.clearBrowserCache');
  }

  async close(): Promise<void> {
    if (this.cdpSession) {
      await this.cdpSession.detach();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}
