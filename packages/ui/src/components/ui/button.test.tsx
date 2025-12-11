import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button Component', () => {
  it('应该渲染为 button 元素', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument()
  })

  it('应该有 data-slot="button" 属性', () => {
    const { container } = render(<Button>按钮</Button>)
    expect(container.querySelector('[data-slot="button"]')).toBeInTheDocument()
  })

  it('应该支持 default variant', () => {
    render(<Button variant="default">默认</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 destructive variant', () => {
    render(<Button variant="destructive">删除</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 outline variant', () => {
    render(<Button variant="outline">轮廓</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 secondary variant', () => {
    render(<Button variant="secondary">次级</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 ghost variant', () => {
    render(<Button variant="ghost">幽灵</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 link variant', () => {
    render(<Button variant="link">链接</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 default size', () => {
    render(<Button size="default">默认尺寸</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 sm size', () => {
    render(<Button size="sm">小</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 lg size', () => {
    render(<Button size="lg">大</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持 icon size', () => {
    render(<Button size="icon">🔍</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('当 disabled 时应该禁用', () => {
    render(<Button disabled>禁用</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('应该调用 onClick 回调', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>点击</Button>)

    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('应该接受自定义 className', () => {
    const { container } = render(
      <Button className="custom-class">自定义</Button>
    )
    const button = container.querySelector('[data-slot="button"]')
    expect(button).toHaveClass('custom-class')
  })

  it('应该支持子元素', () => {
    render(
      <Button>
        <span>图标</span>
        文本
      </Button>
    )
    expect(screen.getByText('文本')).toBeInTheDocument()
  })

  it('禁用状态下不应该响应点击', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(
      <Button disabled onClick={onClick}>
        禁用按钮
      </Button>
    )

    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})
