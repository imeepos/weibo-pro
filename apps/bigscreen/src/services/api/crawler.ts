import { root } from '@sker/core'
import { CrawlerController } from '@sker/sdk'

export interface CrawlerControlStatusSummary {
  nlpQueue: 'active' | 'inactive' | 'error'
  workflowEngine: 'running' | 'stopped' | 'error'
  lastExecution?: string
  queueDepth?: number
}

export interface CrawlPostRequest {
  postId: string
}

export interface WeiboSearchRequest {
  keyword: string
  page?: number
}

const getController = () => root.get(CrawlerController)

export const CrawlerAPI = {
  async getStatusSummary(): Promise<CrawlerControlStatusSummary> {
    const status = await getController().getStatus('current') as any

    return {
      nlpQueue: 'inactive',
      workflowEngine:
        status?.status === 'running'
          ? 'running'
          : status?.status === 'error'
            ? 'error'
            : 'stopped',
      lastExecution: status?.startedAt,
    }
  },

  async crawlPost(request: CrawlPostRequest) {
    return getController().start({
      platform: 'wb',
      crawlerType: 'detail',
      specifiedIds: request.postId,
    } as any)
  },

  async searchWeibo(request: WeiboSearchRequest) {
    return getController().start({
      platform: 'wb',
      crawlerType: 'search',
      keywords: request.keyword,
      startPage: request.page ?? 1,
    } as any)
  },
}
