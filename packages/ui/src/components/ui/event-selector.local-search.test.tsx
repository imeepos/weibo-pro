import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventSelector, type EventItem } from './event-selector'
import { mockEvents } from './event-selector.fixtures'

describe('EventSelector 本地搜索与状态', () => {
  describe('本地搜索模式（向后兼容）', () => {
    it('没有 onSearch 时应该在本地 events 中过滤', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
        />
      )

      expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
      expect(screen.getByText('娱乐圈热门事件')).toBeInTheDocument()

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '产品')

      await waitFor(() => {
        expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
        expect(screen.queryByText('娱乐圈热门事件')).not.toBeInTheDocument()
      })
    })

    it('本地搜索应该匹配标题、描述和分类名称', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')

      // 搜索分类
      await user.clear(searchInput)
      await user.type(searchInput, '商业')
      await waitFor(() => {
        expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
        expect(screen.queryByText('娱乐圈热门事件')).not.toBeInTheDocument()
      })

      // 搜索描述
      await user.clear(searchInput)
      await user.type(searchInput, '热议')
      await waitFor(() => {
        expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
      })
    })

    it('本地搜索不区分大小写', async () => {
      const user = userEvent.setup()
      const englishEvents: EventItem[] = [
        {
          id: '3',
          title: 'Brand Launch Event',
          description: 'New Product Release',
          category: { name: 'Technology' },
          hotness: 600,
          occurred_at: '2025-01-13',
          created_at: '2025-01-13',
        },
      ]

      render(
        <EventSelector
          events={englishEvents}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, 'brand')

      await waitFor(() => {
        expect(screen.getByText('Brand Launch Event')).toBeInTheDocument()
      })
    })
  })

  describe('加载状态', () => {
    it('搜索中应该显示加载状态', async () => {
      const user = userEvent.setup()
      let resolveSearch: (value: EventItem[]) => void = () => {}

      const mockSearchFn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveSearch = resolve
        })
      })

      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockSearchFn}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '测试')

      // 等待加载状态出现
      await waitFor(() => {
        expect(screen.getByText(/加载中/i)).toBeInTheDocument()
      })

      // 解决 promise
      resolveSearch(mockEvents)
      await waitFor(() => {
        expect(screen.queryByText(/加载中/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('空状态', () => {
    it('远程搜索无结果时应显示空状态', async () => {
      const user = userEvent.setup()
      const mockSearchFn = vi.fn().mockResolvedValue([])

      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockSearchFn}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '不存在的事件')

      await waitFor(() => {
        expect(screen.getByText('无匹配事件')).toBeInTheDocument()
      })
    })
  })
})
