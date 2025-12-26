import { Injectable } from '@sker/core'
import type { BrowserContext, Page } from 'playwright'
import { ILogin, LoginMethod, LoginResult } from '../../login.interface'
import { BrowserManager } from '../../browser'

@Injectable()
export class WeiboLogin implements ILogin {
  private readonly loginURL = 'https://passport.weibo.com/sso/signin?entry=miniblog&source=miniblog'
  private browserManager: BrowserManager
  private context?: BrowserContext
  private page?: Page

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager
  }

  async begin(): Promise<void> {
    const { context } = await this.browserManager.launch({ headless: false })
    this.context = context
    this.page = await context.newPage()
  }

  async loginByQrcode(): Promise<LoginResult> {
    if (!this.page || !this.context) {
      throw new Error('Browser not initialized')
    }

    await this.page.goto(this.loginURL)

    const qrcodeSelector = "xpath=//img[@class='w-full h-full']"
    await this.page.waitForSelector(qrcodeSelector, { timeout: 10000 })

    console.log('请扫描二维码登录...')

    const initialCookies = await this.context.cookies()
    const initialSession = initialCookies.find(c => c.name === 'WBPSESS')?.value

    await this.page.waitForFunction(
      (session) => {
        const cookies = document.cookie.split(';').map(c => c.trim())
        const hasSSO = cookies.some(c => c.startsWith('SSOLoginState='))
        const currentSession = cookies.find(c => c.startsWith('WBPSESS='))?.split('=')[1]
        return hasSSO || currentSession !== session
      },
      initialSession,
      { timeout: 600000 }
    )

    const cookies = await this.context.cookies()
    const cookieDict = Object.fromEntries(cookies.map(c => [c.name, c.value]))

    return {
      success: true,
      message: '登录成功',
      cookies: cookieDict,
    }
  }

  async loginByCookie(cookies: Record<string, string>): Promise<LoginResult> {
    if (!this.context) {
      throw new Error('Browser not initialized')
    }

    await this.context.addCookies(
      Object.entries(cookies).map(([name, value]) => ({
        name,
        value,
        domain: '.weibo.cn',
        path: '/',
      }))
    )

    return {
      success: true,
      message: 'Cookie 加载成功',
      cookies,
    }
  }

  async isLoggedIn(): Promise<boolean> {
    if (!this.context) return false

    const cookies = await this.context.cookies()
    const cookieDict = Object.fromEntries(cookies.map(c => [c.name, c.value]))

    return !!cookieDict.SSOLoginState || !!cookieDict.WBPSESS
  }
}
