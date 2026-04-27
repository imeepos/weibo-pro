import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@sker/core', async () => {
  const actual = await vi.importActual<typeof import('@sker/core')>('@sker/core')
  return {
    ...actual,
    root: {
      get: vi.fn(),
    },
  }
})

vi.mock('@sker/sdk', () => ({
  CrawlerController: class MockCrawlerController {},
}))

import { root } from '@sker/core'
import { CrawlerController } from '@sker/sdk'
import { CrawlerAPI } from './crawler'

describe('CrawlerAPI', () => {
  const mockController = {
    getStatus: vi.fn(),
    start: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(root.get).mockReturnValue(mockController as never)
  })

  it('maps crawler status into crawler-control status summary', async () => {
    mockController.getStatus.mockResolvedValue({
      status: 'running',
      platform: 'wb',
      crawlerType: 'search',
      startedAt: '2026-04-26T10:00:00.000Z',
    })

    const result = await CrawlerAPI.getStatusSummary()

    expect(root.get).toHaveBeenCalledWith(CrawlerController)
    expect(mockController.getStatus).toHaveBeenCalledWith('current')
    expect(result).toEqual({
      nlpQueue: 'inactive',
      workflowEngine: 'running',
      lastExecution: '2026-04-26T10:00:00.000Z',
    })
  })

  it('starts a detail crawl for a single post id', async () => {
    mockController.start.mockResolvedValue({
      status: 'success',
      message: 'Crawler started successfully',
    })

    await CrawlerAPI.crawlPost({ postId: '5095814444178803' })

    expect(mockController.start).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'wb',
        crawlerType: 'detail',
        specifiedIds: '5095814444178803',
      })
    )
  })

  it('starts a weibo search crawl from keyword and page', async () => {
    mockController.start.mockResolvedValue({
      status: 'success',
      message: 'Crawler started successfully',
    })

    await CrawlerAPI.searchWeibo({
      keyword: '人工智能',
      startDate: '2026-04-20',
      endDate: '2026-04-26',
      page: 3,
    })

    expect(mockController.start).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'wb',
        crawlerType: 'search',
        keywords: '人工智能',
        startPage: 3,
      })
    )
  })
})
