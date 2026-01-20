import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventSelector, type EventItem } from './event-selector'

describe('EventSelector 远程搜索', () => {
  const mockEvents: EventItem[] = [
    {
      id: '1',
      title: '某品牌产品发布会',
      description: '新品发布会引发热议',
      category: { name: '商业' },
      hotness: 1000,
      occurred_at: '2025-01-15',
      created_at: '2025-01-15',
    },
    {
      id: '2',
      title: '娱乐圈热门事件',
      description: '明星动态引发关注',
      category: { name: '娱乐' },
      hotness: 800,
      occurred_at: '2025-01-14',
      created_at: '2025-01-14',
    },
  ]

  const mockOnSearch = vi.fn()
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('远程搜索模式', () => {
    it('应该提供 onSearch 回调用于远程搜索', async () => {
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

      expect(mockOnSearch).toHaveBeenCalledWith('产品')
    })

    it('输入搜索关键词时应调用 onSearch', async () => {
      const user = userEvent.setup()
      render(
        <EventSelector
          events={mockEvents}
          onSearch={mockOnSearch}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, '品牌')

      expect(mockOnSearch).toHaveBeenCalledWith('品牌')
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

      const { container } = render(
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
  })

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
      render(
        <EventSelector
          events={mockEvents}
        />
      )

      const searchInput = screen.getByPlaceholderText('搜索事件...')
      await user.type(searchInput, 'CHAN PIN')

      await waitFor(() => {
        expect(screen.getByText('某品牌产品发布会')).toBeInTheDocument()
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
