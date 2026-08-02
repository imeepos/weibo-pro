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

  describe('翻页功能', () => {
    const generateEvents = (count: number): EventItem[] =>
      Array.from({ length: count }, (_, i) => ({
        id: `event-${i + 1}`,
        title: `事件 ${i + 1}`,
        description: `事件 ${i + 1} 的描述`,
        category: { name: '测试' },
        hotness: 100 + i,
      }))

    it('应该显示总页数和当前页信息', () => {
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      expect(screen.getByText(/第 1 页/)).toBeInTheDocument()
      expect(screen.getByText(/共 3 页/)).toBeInTheDocument()
    })

    it('应该显示翻页按钮（上一页、下一页）', () => {
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      expect(screen.getByRole('button', { name: /上一页/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /下一页/ })).toBeInTheDocument()
    })

    it('第一页时上一页按钮应禁用', () => {
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      expect(screen.getByRole('button', { name: /上一页/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: /下一页/ })).not.toBeDisabled()
    })

    it('最后一页时下一页按钮应禁用', async () => {
      const user = userEvent.setup()
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      const nextBtn = screen.getByRole('button', { name: /下一页/ })

      await user.click(nextBtn)
      await user.click(nextBtn)

      expect(screen.getByRole('button', { name: /下一页/ })).toBeDisabled()
      expect(screen.getByRole('button', { name: /上一页/ })).not.toBeDisabled()
    })

    it('点击下一页应显示下一页数据', async () => {
      const user = userEvent.setup()
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      expect(screen.getByText('事件 1')).toBeInTheDocument()
      expect(screen.getByText('事件 10')).toBeInTheDocument()
      expect(screen.queryByText('事件 11')).not.toBeInTheDocument()

      const nextBtn = screen.getByRole('button', { name: /下一页/ })
      await user.click(nextBtn)

      await waitFor(() => {
        expect(screen.queryByText('事件 1')).not.toBeInTheDocument()
        expect(screen.getByText('事件 11')).toBeInTheDocument()
        expect(screen.getByText('事件 20')).toBeInTheDocument()
        expect(screen.getByText(/第 2 页/)).toBeInTheDocument()
      })
    })

    it('点击上一页应返回上一页数据', async () => {
      const user = userEvent.setup()
      const events = generateEvents(25)
      render(<EventSelector events={events} pageSize={10} />)

      const nextBtn = screen.getByRole('button', { name: /下一页/ })
      await user.click(nextBtn)
      await user.click(nextBtn)

      await waitFor(() => {
        expect(screen.getByText('事件 21')).toBeInTheDocument()
      })

      const prevBtn = screen.getByRole('button', { name: /上一页/ })
      await user.click(prevBtn)

      await waitFor(() => {
        expect(screen.getByText('事件 11')).toBeInTheDocument()
        expect(screen.getByText(/第 2 页/)).toBeInTheDocument()
      })
    })

    it('少于 pageSize 时不应显示翻页', () => {
      const events = generateEvents(5)
      render(<EventSelector events={events} pageSize={10} />)

      expect(screen.queryByRole('button', { name: /上一页/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /下一页/ })).not.toBeInTheDocument()
      expect(screen.queryByText(/第 \d+ 页/)).not.toBeInTheDocument()
    })

    it('没有 pageSize 时不应显示翻页', () => {
      const events = generateEvents(25)
      render(<EventSelector events={events} />)

      expect(screen.queryByRole('button', { name: /上一页/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /下一页/ })).not.toBeInTheDocument()
    })

    it('翻页不应影响选中的事件', async () => {
      const user = userEvent.setup()
      const events = generateEvents(25)
      const handleChange = vi.fn()

      render(<EventSelector events={events} pageSize={10} onChange={handleChange} />)

      const nextBtn = screen.getByRole('button', { name: /下一页/ })
      await user.click(nextBtn)

      await waitFor(() => {
        expect(screen.getByText('事件 11')).toBeInTheDocument()
      })

      const eventItem = screen.getByText('事件 11').closest('[data-slot="event-item"]')
      await user.click(eventItem!)

      expect(handleChange).toHaveBeenCalledWith('event-11')
    })

    it(' onPageChange 回调应在翻页时触发', async () => {
      const user = userEvent.setup()
      const events = generateEvents(25)
      const handlePageChange = vi.fn()

      render(<EventSelector events={events} pageSize={10} onPageChange={handlePageChange} />)

      const nextBtn = screen.getByRole('button', { name: /下一页/ })
      await user.click(nextBtn)

      await waitFor(() => {
        expect(handlePageChange).toHaveBeenCalledWith(2)
      })

      const prevBtn = screen.getByRole('button', { name: /上一页/ })
      await user.click(prevBtn)

      await waitFor(() => {
        expect(handlePageChange).toHaveBeenCalledWith(1)
      })
    })
  })
})
