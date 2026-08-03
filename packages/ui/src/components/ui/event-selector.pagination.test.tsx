import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventSelector } from './event-selector'
import { generateEvents } from './event-selector.fixtures'

describe('EventSelector 翻页功能', () => {
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
