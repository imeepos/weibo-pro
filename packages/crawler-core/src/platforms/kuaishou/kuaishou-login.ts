import { Injectable } from '@sker/core'
import type { BrowserContext, Page } from 'playwright'
import type { ILogin, LoginResult } from '../../login.interface'

@Injectable()
export class KuaishouLogin implements ILogin {
  constructor(
    private browserContext: BrowserContext,
    private page: Page,
  ) {}

  async begin(): Promise<void> {
    await this.loginByQrcode()
  }

  async loginByQrcode(): Promise<LoginResult> {
    try {
      await this.page.goto('https://www.kuaishou.com')
      await this.page.waitForTimeout(2000)

      const loginButton = this.page.locator("xpath=//p[text()='登录']")
      await loginButton.click()

      const qrcodeSelector = "//div[@class='qrcode-img']//img"
      await this.page.waitForSelector(qrcodeSelector, { timeout: 10000 })

      console.log('请扫描二维码登录快手')

      await this.waitForLogin()

      return { success: true, message: '登录成功' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '登录失败' }
    }
  }

  async loginByCookie(cookies: Record<string, string>): Promise<LoginResult> {
    try {
      for (const [name, value] of Object.entries(cookies)) {
        await this.browserContext.addCookie({
          name,
          value,
          domain: '.kuaishou.com',
          path: '/',
        })
      }

      await this.page.goto('https://www.kuaishou.com')
      await this.page.waitForTimeout(2000)

      const isLoggedIn = await this.isLoggedIn()
      return {
        success: isLoggedIn,
        message: isLoggedIn ? '登录成功' : 'Cookie 已失效',
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '登录失败' }
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const cookies = await this.browserContext.cookies()
    return cookies.some((cookie) => cookie.name === 'passToken')
  }

  private async waitForLogin(): Promise<void> {
    for (let i = 0; i < 600; i++) {
      if (await this.isLoggedIn()) {
        await this.page.waitForTimeout(5000)
        return
      }
      await this.page.waitForTimeout(1000)
    }
    throw new Error('登录超时')
  }
}
