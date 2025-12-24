import { Injectable, root } from '@sker/core'
import { MediaCrawlerService } from '../services/media-crawler.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class LoginService {
  private crawler: MediaCrawlerService

  constructor() {
    this.crawler = root.get(MediaCrawlerService)
  }

  async getQRCode(platform: sdk.MediaPlatform) {
    return this.crawler.getLoginQRCode(platform)
  }

  async getStatus(platform: sdk.MediaPlatform) {
    return this.crawler.getLoginStatus(platform)
  }

  async loginWithCookie(request: sdk.CookieLoginRequest) {
    return this.crawler.loginWithCookie(request)
  }
}
