import type { Browser, BrowserContext, LaunchOptions, BrowserContextOptions } from 'playwright'
import { Injectable } from '@sker/core'
import { Logger } from '@sker/core'
import { ProxyPool } from '../core/proxy-pool'
import { parseProxyUrl } from '../utils/proxy-url-parser'

type BrowserType = 'chromium' | 'firefox' | 'webkit'

/**
 * Playwright浏览器代理启动器
 *
 * 为Playwright浏览器配置代理
 */
@Injectable()
export class ProxyBrowserLauncher {
  constructor(
    private readonly proxyPool: ProxyPool,
    private readonly logger: Logger
  ) {}

  /**
   * 启动带代理的Playwright浏览器
   *
   * @param browserType 浏览器类型：chromium, firefox, webkit
   * @param options Playwright launch选项
   * @returns Browser实例
   */
  async launch(
    browserType: BrowserType,
    options?: LaunchOptions
  ): Promise<Browser> {
    try {
      // 动态导入playwright（避免强制依赖）
      const playwright = await this.importPlaywright()

      // 获取代理
      const proxy = await this.proxyPool.getProxy()
      const parsed = parseProxyUrl(proxy.url)

      // 构建代理配置
      const proxyConfig = {
        server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
        username: parsed.auth?.username,
        password: parsed.auth?.password,
      }

      this.logger.info(
        `[ProxyBrowserLauncher] 启动${browserType}浏览器，代理: ${proxy.url}`
      )

      // 启动浏览器
      const browser = await playwright[browserType].launch({
        ...options,
        proxy: proxyConfig,
      })

      // 浏览器关闭时释放代理
      browser.on('disconnected', async () => {
        try {
          await this.proxyPool.releaseProxy(proxy.url)
          this.logger.debug(
            `[ProxyBrowserLauncher] 浏览器关闭，释放代理: ${proxy.url}`
          )
        } catch (error) {
          this.logger.error(
            '[ProxyBrowserLauncher] 释放代理失败',
            error
          )
        }
      })

      return browser
    } catch (error) {
      this.logger.error('[ProxyBrowserLauncher] 启动浏览器失败', error)
      throw error
    }
  }

  /**
   * 启动带代理的Playwright浏览器上下文
   *
   * @param browserType 浏览器类型
   * @param contextOptions 上下文选项
   * @param launchOptions 启动选项
   * @returns BrowserContext实例
   */
  async launchContext(
    browserType: BrowserType,
    contextOptions?: BrowserContextOptions,
    launchOptions?: LaunchOptions
  ): Promise<BrowserContext> {
    try {
      const playwright = await this.importPlaywright()

      // 获取代理
      const proxy = await this.proxyPool.getProxy()
      const parsed = parseProxyUrl(proxy.url)

      // 构建代理配置
      const proxyConfig = {
        server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
        username: parsed.auth?.username,
        password: parsed.auth?.password,
      }

      this.logger.info(
        `[ProxyBrowserLauncher] 启动${browserType}浏览器上下文，代理: ${proxy.url}`
      )

      // 启动浏览器
      const browser = await playwright[browserType].launch(launchOptions)

      // 创建带代理的上下文
      const context = await browser.newContext({
        ...contextOptions,
        proxy: proxyConfig,
      })

      // 上下文关闭时释放代理
      context.on('close', async () => {
        try {
          await this.proxyPool.releaseProxy(proxy.url)
          await browser.close()
          this.logger.debug(
            `[ProxyBrowserLauncher] 上下文关闭，释放代理: ${proxy.url}`
          )
        } catch (error) {
          this.logger.error(
            '[ProxyBrowserLauncher] 释放代理失败',
            error
          )
        }
      })

      return context
    } catch (error) {
      this.logger.error('[ProxyBrowserLauncher] 启动浏览器上下文失败', error)
      throw error
    }
  }

  /**
   * 动态导入playwright模块
   */
  private async importPlaywright() {
    try {
      return await import('playwright')
    } catch (error) {
      throw new Error(
        'Playwright未安装。请运行: pnpm add playwright -D'
      )
    }
  }
}
