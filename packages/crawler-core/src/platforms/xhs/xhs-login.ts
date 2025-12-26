import { Injectable } from '@sker/core'
import type { Page, BrowserContext } from 'playwright'
import type { ILogin, LoginResult } from '../../login.interface'
import { BrowserManager } from '../../browser'

@Injectable()
export class XhsLogin implements ILogin {
  private context?: BrowserContext
  private page?: Page
  private browserManager: BrowserManager

  constructor() {
    this.browserManager = new BrowserManager()
  }

  async begin(): Promise<void> {
    const { browser, context } = await this.browserManager.launch({ headless: false })
    this.context = context
    this.page = await this.context?.newPage()
    if (!this.page) {
      throw new Error('Failed to create page')
    }
    await this.page.goto('https://www.xiaohongshu.com')
  }

  async loginByQrcode(): Promise<LoginResult> {
    if (!this.page || !this.context) {
      throw new Error('Browser not initialized')
    }

    try {
      await this.page.waitForSelector('.login-container', { timeout: 5000 })
    } catch {
      const loginBtn = await this.page.$('xpath=//*[@id="app"]/div[1]/div[2]/div[1]/ul/div[1]/button')
      await loginBtn?.click()
    }

    await this.page.waitForSelector('.qrcode-img', { timeout: 10000 })
    console.log('请扫描二维码登录...')

    const initialSession = await this.getWebSession()
    await this.waitForLoginSuccess(initialSession)

    const cookies = await this.context.cookies()
    const cookieDict = cookies.reduce(
      (acc, cookie) => {
        acc[cookie.name] = cookie.value
        return acc
      },
      {} as Record<string, string>
    )

    return {
      success: true,
      cookies: cookieDict,
    }
  }

  async loginByCookie(cookies: Record<string, string>): Promise<LoginResult> {
    if (!this.context) {
      throw new Error('Browser not initialized')
    }

    const cookieArray = Object.entries(cookies).map(([name, value]) => ({
      name,
      value,
      domain: '.xiaohongshu.com',
      path: '/',
    }))

    await this.context.addCookies(cookieArray)
    await this.page?.goto('https://www.xiaohongshu.com')

    const isValid = await this.isLoggedIn()
    return {
      success: isValid,
      cookies: isValid ? cookies : undefined,
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.context) return false
    const cookies = await this.context.cookies()
    const webSession = cookies.find((c) => c.name === 'web_session')
    return !!webSession && webSession.value.length > 0
  }

  private async getWebSession(): Promise<string> {
    if (!this.context) return ''
    const cookies = await this.context.cookies()
    return cookies.find((c) => c.name === 'web_session')?.value || ''
  }

  private async waitForLoginSuccess(initialSession: string): Promise<void> {
    const maxWaitTime = 600
    let elapsed = 0

    while (elapsed < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      elapsed++

      const currentSession = await this.getWebSession()
      if (currentSession && currentSession !== initialSession) {
        console.log('登录成功！')
        return
      }
    }

    throw new Error('登录超时')
  }

  getPage(): Page | undefined {
    return this.page
  }

  getContext(): BrowserContext | undefined {
    return this.context
  }
}
