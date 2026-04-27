# CrawlerControl 诚实降级与接线实现计划

> **给 agent 执行者：** 必选子技能：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项实现本计划。步骤统一使用 checkbox（`- [ ]`）语法跟踪。

**目标：** 把 `apps/bigscreen/src/pages/CrawlerControl.tsx` 从调用必报错的占位 API，改成接通当前已存在的 crawler contract，并对尚未支持的 NLP 手动操作做明确降级。

**方案概览：** 新增一个面向 `CrawlerControl` 的前端 `CrawlerAPI` 适配层，负责把现有 `@sker/sdk` 的 `CrawlerController` 返回结果映射成页面需要的状态和启动请求；页面本身不再依赖 `WorkflowAPI` 的占位方法，而是只暴露当前后端已支持的“状态查看、单帖详情爬取、关键词搜索”能力，对“仅分析、批量 NLP、自动爬取并分析”统一做诚实提示与禁用。

**技术栈：** React 19、Vitest、Testing Library、`@sker/core`、`@sker/sdk`

---

## 文件结构

- 新建：`apps/bigscreen/src/services/api/crawler.ts`
  责任：封装 `CrawlerController`，提供页面可直接使用的状态映射和启动方法
- 新建：`apps/bigscreen/src/services/api/crawler.test.ts`
  责任：验证状态映射与请求转换
- 新建：`apps/bigscreen/src/pages/CrawlerControl.test.tsx`
  责任：验证页面在“支持/不支持能力”边界上的真实交互
- 修改：`apps/bigscreen/src/pages/CrawlerControl.tsx`
  责任：切换到 `CrawlerAPI`，接通已支持能力，禁用未支持能力

## 任务 1：新增 Crawler API 适配层

**文件：**
- 新建：`apps/bigscreen/src/services/api/crawler.ts`
- 新建：`apps/bigscreen/src/services/api/crawler.test.ts`

- [ ] **步骤 1：先写失败测试**

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

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
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/services/api/crawler.test.ts`

预期：FAIL，提示缺少 `crawler.ts` 或 `CrawlerAPI` 导出。

- [ ] **步骤 3：编写最小实现**

```ts
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
  startDate: string
  endDate: string
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
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/services/api/crawler.test.ts`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add apps/bigscreen/src/services/api/crawler.ts apps/bigscreen/src/services/api/crawler.test.ts
git commit -m "feat: add crawler control api adapter"
```

## 任务 2：把 CrawlerControl 改成已支持能力接通、未支持能力禁用

**文件：**
- 新建：`apps/bigscreen/src/pages/CrawlerControl.test.tsx`
- 修改：`apps/bigscreen/src/pages/CrawlerControl.tsx`

- [ ] **步骤 1：先写失败测试**

```tsx
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const getStatusSummary = vi.fn()
const crawlPost = vi.fn()
const searchWeibo = vi.fn()

vi.mock('@/services/api/crawler', () => ({
  CrawlerAPI: {
    getStatusSummary,
    crawlPost,
    searchWeibo,
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
    crawlPost.mockResolvedValue({ status: 'success', message: 'Crawler started successfully' })
    searchWeibo.mockResolvedValue({ status: 'success', message: 'Crawler started successfully' })
  })

  it('loads crawler status and disables unsupported NLP actions', async () => {
    render(<CrawlerControl />)

    await waitFor(() => {
      expect(screen.getByText('工作流引擎')).toBeInTheDocument()
      expect(screen.getByText('running')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: '🧠 仅分析' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '批量触发 NLP 分析' })).toBeDisabled()
    expect(screen.getByText(/当前主分支未接入 NLP 手动触发接口/)).toBeInTheDocument()
  })

  it('starts a detail crawl from the single post form', async () => {
    render(<CrawlerControl />)

    fireEvent.change(screen.getByPlaceholderText('例如: 5095814444178803'), {
      target: { value: '5095814444178803' },
    })
    fireEvent.click(screen.getByRole('button', { name: '📥 启动详情爬取' }))

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
        startDate: '',
        endDate: '',
        page: 3,
      })
    })
  })
})
```

- [ ] **步骤 2：运行测试，确认它先失败**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/pages/CrawlerControl.test.tsx`

预期：FAIL，提示页面仍依赖 `WorkflowAPI`、按钮文案不匹配或未禁用。

- [ ] **步骤 3：编写最小实现**

```tsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CrawlerAPI, type CrawlerControlStatusSummary } from '@/services/api/crawler'
import { createLogger } from '@/utils'
import { Spinner } from '@sker/ui/components/ui/spinner'

const NLP_UNSUPPORTED_MESSAGE = '当前主分支未接入 NLP 手动触发接口，暂只支持状态查看、详情爬取和关键词搜索。'

// 其余状态定义保持不变

const CrawlerControl: React.FC = () => {
  const [workflowStatus, setWorkflowStatus] = useState<CrawlerControlStatusSummary | null>(null)
  // 其余 state 保持

  const loadWorkflowStatus = async () => {
    try {
      const status = await CrawlerAPI.getStatusSummary()
      setWorkflowStatus(status)
    } catch (error) {
      logger.error('Failed to load workflow status', error)
    }
  }

  const handleCrawlPost = async () => {
    // 原有参数校验保留
    const response = await CrawlerAPI.crawlPost({ postId: nlpPostId.trim() })
    addExecution('crawl', { postId: nlpPostId }, 'success', response?.message || '详情爬取任务已启动')
  }

  const handleSearchWeibo = async () => {
    if (!searchKeyword.trim()) {
      alert('请填写关键词')
      return
    }
    const response = await CrawlerAPI.searchWeibo({
      keyword: searchKeyword.trim(),
      startDate: searchStartDate,
      endDate: searchEndDate,
      page: parseInt(searchPage, 10) || 1,
    })
    addExecution('search', { keyword: searchKeyword.trim(), page: parseInt(searchPage, 10) || 1 }, 'success', response?.message || '关键词搜索任务已启动')
  }

  const handleTriggerNLP = async () => {
    addExecution('nlp', { postId: nlpPostId }, 'error', NLP_UNSUPPORTED_MESSAGE)
  }

  const handleCrawlAndAnalyze = async () => {
    addExecution('crawl-and-analyze', { postId: nlpPostId }, 'error', NLP_UNSUPPORTED_MESSAGE)
  }

  const handleBatchNLP = async () => {
    addExecution('batch-nlp', { raw: batchPostIds }, 'error', NLP_UNSUPPORTED_MESSAGE)
  }

  // JSX 中做这几处改动：
  // 1. “🚀 爬取并分析（推荐）” -> “🚫 爬取并分析（未接通）”，并 disabled
  // 2. “📥 仅爬取” -> “📥 启动详情爬取”
  // 3. “🧠 仅分析” 保留文案但 disabled
  // 4. “批量触发 NLP 分析” 按钮 disabled
  // 5. “开始搜索” -> “开始搜索爬取”
  // 6. 两个区块都展示 NLP_UNSUPPORTED_MESSAGE 或日期范围当前仅作记录的提示
}
```

- [ ] **步骤 4：再次运行测试，确认通过**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/pages/CrawlerControl.test.tsx`

预期：PASS

- [ ] **步骤 5：提交**

```bash
git add apps/bigscreen/src/pages/CrawlerControl.tsx apps/bigscreen/src/pages/CrawlerControl.test.tsx
git commit -m "feat: make crawler control degrade honestly"
```

## 任务 3：整体验证

**文件：**
- 无新增文件

- [ ] **步骤 1：运行新增的前端定向测试**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/services/api/crawler.test.ts src/pages/CrawlerControl.test.tsx`

预期：PASS，新增适配层与页面行为测试全部通过

- [ ] **步骤 2：运行既有 investigation 回归测试**

运行：`pnpm --filter @sker/bigscreen exec vitest run src/components/user-investigation/UserDossierPanel.test.tsx src/pages/UserDetection.investigation.test.tsx`

预期：PASS，证明本次改动未影响刚合并的调查工作台

- [ ] **步骤 3：运行构建**

运行：`pnpm run build`

预期：PASS；允许继续出现 chunk size / turbo 版本 warning，但不能有失败退出码

- [ ] **步骤 4：提交**

```bash
git add .
git commit -m "test: verify crawler control integration path"
```
