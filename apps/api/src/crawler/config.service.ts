import { Injectable, root } from '@sker/core'
import { MediaCrawlerProxyService } from '../services/media-crawler-proxy.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class ConfigService {
  private proxy: MediaCrawlerProxyService

  constructor() {
    this.proxy = root.get(MediaCrawlerProxyService)
  }

  async getPlatformConfig(platform: sdk.MediaPlatform) {
    const platforms = await this.proxy.getPlatforms()
    return platforms.platforms.find(p => p.value === platform)
  }

  async updatePlatformConfig(platform: sdk.MediaPlatform, config: any) {
    return { status: 'success', message: 'Config updated' }
  }
}
