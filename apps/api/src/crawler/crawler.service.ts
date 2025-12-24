import { Injectable, root } from '@sker/core'
import { MediaCrawlerProxyService } from '../services/media-crawler-proxy.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class CrawlerService {
  private proxy: MediaCrawlerProxyService

  constructor() {
    this.proxy = root.get(MediaCrawlerProxyService)
  }

  async start(request: sdk.CrawlerStartRequest) {
    return this.proxy.startCrawler(request)
  }

  async stop(id: string) {
    return this.proxy.stopCrawler()
  }

  async getStatus(id: string) {
    return this.proxy.getCrawlerStatus()
  }

  async list() {
    const status = await this.proxy.getCrawlerStatus()
    return {
      tasks: status.status !== 'idle' ? [{
        id: 'current',
        platform: status.platform,
        type: status.crawlerType,
        status: status.status,
        startedAt: status.startedAt
      }] : []
    }
  }
}
