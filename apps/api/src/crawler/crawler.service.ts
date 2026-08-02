import { Injectable, root } from '@sker/core'
import { MediaCrawlerService } from '../services/media-crawler.service'
import type * as sdk from '@sker/sdk'

@Injectable()
export class CrawlerService {
  private crawler: MediaCrawlerService

  constructor() {
    this.crawler = root.get(MediaCrawlerService)
  }

  async start(request: sdk.CrawlerStartRequest) {
    return this.crawler.startCrawler(request)
  }

  async stop(_id: string) {
    return this.crawler.stopCrawler()
  }

  async getStatus(_id: string) {
    return this.crawler.getCrawlerStatus()
  }

  async list() {
    const status = await this.crawler.getCrawlerStatus()
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
