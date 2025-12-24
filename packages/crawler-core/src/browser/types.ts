import type { Browser, BrowserContext, Page, LaunchOptions } from 'playwright';

export interface BrowserConfig {
  headless?: boolean;
  proxy?: BrowserProxyConfig;
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezone?: string;
  cdpEndpoint?: string;
}

export interface BrowserProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  inUse: boolean;
  createdAt: number;
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}
