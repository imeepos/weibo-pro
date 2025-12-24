import { Injectable, root } from '@sker/core'
import { MediaCrawlerProxyService } from '../services/media-crawler-proxy.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class LoginService {
  private proxy: MediaCrawlerProxyService

  constructor() {
    this.proxy = root.get(MediaCrawlerProxyService)
  }

  async getQRCode(platform: sdk.MediaPlatform) {
    return this.proxy.getLoginQRCode(platform)
  }

  async getStatus(platform: sdk.MediaPlatform) {
    return this.proxy.getLoginStatus(platform)
  }

  async loginWithCookie(request: sdk.CookieLoginRequest) {
    return this.proxy.loginWithCookie(request)
  }
}
