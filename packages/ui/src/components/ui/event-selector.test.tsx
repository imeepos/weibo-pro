import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventSelector, type EventItem } from './event-selector'
import { mockEvents } from './event-selector.fixtures'

describe('EventSelector 远程搜索', () => {
  const mockOnSearch = vi.fn().mockResolvedValue(mockEvents)
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('远程搜索模式', () => {
    it('应该以第一页参数调用 onSearch', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockOnSearch}
          onChange={mockOnChange}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '产品')

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenLastCalledWith('产品', 1)
      })
    })

    it('输入搜索关键词时应使用最终关键词调用 onSearch', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockOnSearch}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '品牌')

      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenLastCalledWith('品牌', 1)
      })
    })

    it('应该使用 onSearch 返回的事件列表渲染结果', async () => {
      const user = userEvent.setup()
      const searchResults: EventItem[] = [
        {
          id: '3',
          title: '搜索结果事件',
          description: '这是从后端返回的搜索结果',
          category: { name: '科技' },
          hotness: 500,
        },
      ]

      const mockSearchFn = vi.fn().mockResolvedValue(searchResults)

      const { container: _container } = render(
        <EventSelector
          events={mockEvents}
          onSearch={mockSearchFn}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '搜索')

      await waitFor(() => {
        expect(screen.getByText('搜索结果事件')).toBeInTheDocument()
      })
    })

    it('清空搜索时应显示全部事件', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockOnSearch}
        />
      )

      // 先搜索
      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '产品')

      // 然后清空
      await user.clear(searchInput)

      await waitFor(() => {
        expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
        expect(screen.getByText('娱乐圈热门事件')).toBeInTheDocument()
      })
    })

    it('远程搜索返回空值时应显示空状态而不是抛错', async () => {
      const user = userEvent.setup()
      const mockSearchFn = vi.fn().mockResolvedValue(undefined as unknown as EventItem[])

      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockSearchFn}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '空结果')

      await waitFor(() => {
        expect(screen.getByText('无匹配事件')).toBeInTheDocument()
      })
    })
  })
})
