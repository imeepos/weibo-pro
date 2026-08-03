import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const {
  getStatusSummary,
  crawlPost,
  searchWeibo,
  legacyGetStatus,
  legacyCrawlPost,
  legacyTriggerNLP,
  legacyBatchNLP,
  legacySearchWeibo,
} = vi.hoisted(() => ({
  getStatusSummary: vi.fn(),
  crawlPost: vi.fn(),
  searchWeibo: vi.fn(),
  legacyGetStatus: vi.fn(),
  legacyCrawlPost: vi.fn(),
  legacyTriggerNLP: vi.fn(),
  legacyBatchNLP: vi.fn(),
  legacySearchWeibo: vi.fn(),
}))

vi.mock('@/services/api/crawler', () => ({
  CrawlerAPI: {
    getStatusSummary,
    crawlPost,
    searchWeibo,
  },
}))

vi.mock('@/services/api/workflow', () => ({
  WorkflowAPI: {
    getStatus: legacyGetStatus,
    crawlPost: legacyCrawlPost,
    triggerNLP: legacyTriggerNLP,
    batchNLP: legacyBatchNLP,
    searchWeibo: legacySearchWeibo,
  },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@sker/ui/components/ui/spinner', () => ({
  Spinner: () => <div>loading</div>,
}))

import CrawlerControl from './CrawlerControl'

describe('CrawlerControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getStatusSummary.mockResolvedValue({
      nlpQueue: 'inactive',
      workflowEngine: 'running',
      lastExecution: '2026-04-26T10:00:00.000Z',
    })
    legacyGetStatus.mockResolvedValue({
      nlpQueue: 'inactive',
      workflowEngine: 'running',
      lastExecution: '2026-04-26T10:00:00.000Z',
    })
    crawlPost.mockResolvedValue({
      status: 'success',
      message: 'Crawler started successfully',
    })
    searchWeibo.mockResolvedValue({
      status: 'success',
      message: 'Crawler started successfully',
    })
    legacyCrawlPost.mockResolvedValue({
      success: true,
      message: 'legacy crawl started',
    })
    legacyTriggerNLP.mockResolvedValue({
      success: true,
      message: 'legacy nlp started',
    })
    legacyBatchNLP.mockResolvedValue({
      success: true,
      message: 'legacy batch nlp started',
    })
    legacySearchWeibo.mockResolvedValue({
      success: true,
      message: 'legacy search started',
    })
  })

  it('loads crawler status without exposing unsupported NLP action buttons', async () => {
    render(<CrawlerControl />)

    await waitFor(() => {
      expect(screen.getByText('工作流引擎')).toBeInTheDocument()
      expect(screen.getByText('running')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/当前支持微博详情爬取和关键词搜索爬取/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/未接入|未接通|暂仅作为记录项/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /仅分析/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /批量触发 NLP 分析/ })).not.toBeInTheDocument()
  })

  it('starts a detail crawl from the single post form', async () => {
    render(<CrawlerControl />)

    fireEvent.change(screen.getByPlaceholderText('例如: 5095814444178803'), {
      target: { value: '5095814444178803' },
    })
    fireEvent.click(screen.getByRole('button', { name: '启动详情爬取' }))

    await waitFor(() => {
      expect(crawlPost).toHaveBeenCalledWith({ postId: '5095814444178803' })
    })
  })

  it('starts a search crawl from the search form', async () => {
    render(<CrawlerControl />)

    fireEvent.change(screen.getByPlaceholderText('例如: 人工智能'), {
      target: { value: '人工智能' },
    })
    fireEvent.change(screen.getByDisplayValue('1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: '开始搜索爬取' }))

    await waitFor(() => {
      expect(searchWeibo).toHaveBeenCalledWith({
        keyword: '人工智能',
        page: 3,
      })
    })
  })
})
