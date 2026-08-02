import { Injectable, root } from '@sker/core'
import { MediaCrawlerService } from '../services/media-crawler.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class ConfigService {
  private crawler: MediaCrawlerService

  constructor() {
    this.crawler = root.get(MediaCrawlerService)
  }

  async getPlatformConfig(platform: sdk.MediaPlatform) {
    const platforms = await this.crawler.getPlatforms()
    return platforms.platforms.find(p => p.value === platform)
  }

  async updatePlatformConfig(_platform: sdk.MediaPlatform, _config: any) {
    return { status: 'success', message: 'Config updated' }
  }
}
