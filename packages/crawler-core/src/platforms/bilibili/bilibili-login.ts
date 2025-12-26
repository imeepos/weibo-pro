import { Injectable } from '@sker/core'
import type { ILogin, LoginResult } from '../../login.interface'
import type { BrowserManager } from '../../browser'
import type { BilibiliClient } from './bilibili-client'

@Injectable()
export class BilibiliLogin implements ILogin {
  private loggedIn = false

  constructor(
    private readonly client: BilibiliClient,
    private readonly browserManager: BrowserManager,
  ) {}

  async begin(): Promise<void> {
    const isLoggedIn = await this.isLoggedIn()
    if (!isLoggedIn) {
      await this.loginByQrcode()
    }
  }

  async loginByQrcode(): Promise<LoginResult> {
    const { context } = await this.browserManager.launch()
    const page = await context.newPage()

    try {
      await page.goto('https://www.bilibili.com/', { waitUntil: 'networkidle' })

      const loginButton = page.locator('text=登录')
      if (await loginButton.isVisible()) {
        await loginButton.click()
        await page.waitForTimeout(2000)
      }

      console.log('请扫描二维码登录...')
      await page.waitForSelector('.header-avatar-wrap', { timeout: 120000 })

      const cookies = await context.cookies()
      const cookieDict = cookies.reduce((acc: Record<string, string>, cookie: any) => {
        acc[cookie.name] = cookie.value
        return acc
      }, {})

      await this.client.loadCookies(cookieDict)
      this.client.setPage(page)
      this.loggedIn = true

      return { success: true, cookies: cookieDict }
    } catch (error) {
      return { success: false, message: (error as Error).message }
    } finally {
      await page.close()
    }
  }

  async loginByCookie(cookies: Record<string, string>): Promise<LoginResult> {
    try {
      await this.client.loadCookies(cookies)
      this.loggedIn = await this.isLoggedIn()
      return { success: this.loggedIn, cookies }
    } catch (error) {
      return { success: false, message: (error as Error).message }
    }
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      const { context } = await this.browserManager.launch()
      const cookies = await context.cookies('https://www.bilibili.com')
      return cookies.some((c: any) => c.name === 'SESSDATA' || c.name === 'bili_jct')
    } catch {
      return false
    }
  }
}
