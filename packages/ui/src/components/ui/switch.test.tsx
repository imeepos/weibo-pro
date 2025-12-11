import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Switch } from './switch'

describe('Switch Component', () => {
  it('应该渲染为开关组件', () => {
    const { container } = render(<Switch />)
    expect(container.querySelector('[data-slot="switch"]')).toBeInTheDocument()
  })

  it('应该有 switch-thumb 子元素', () => {
    const { container } = render(<Switch />)
    expect(container.querySelector('[data-slot="switch-thumb"]')).toBeInTheDocument()
  })

  it('初始状态应该是未选中', () => {
    const { container } = render(<Switch />)
    const switchEl = container.querySelector('[data-slot="switch"]')
    expect(switchEl).toHaveAttribute('data-state', 'unchecked')
  })

  it('应该支持切换状态', async () => {
    const user = userEvent.setup()
    const { container } = render(<Switch />)
    const switchEl = container.querySelector('button[role="switch"]')

    if (switchEl) {
      await user.click(switchEl)
      expect(container.querySelector('[data-state="checked"]')).toBeInTheDocument()
    }
  })

  it('应该支持 disabled 状态', () => {
    const { container } = render(<Switch disabled />)
    const switchEl = container.querySelector('[data-slot="switch"]')
    expect(switchEl).toHaveAttribute('disabled')
  })

  it('应该接受自定义 className', () => {
    const { container } = render(<Switch className="custom-switch" />)
    const switchEl = container.querySelector('[data-slot="switch"]')
    expect(switchEl).toHaveClass('custom-switch')
  })

  it('应该支持 aria-label', () => {
    const { container } = render(<Switch aria-label="启用通知" />)
    const switchEl = container.querySelector('[data-slot="switch"]')
    expect(switchEl).toHaveAttribute('aria-label', '启用通知')
  })

  it('禁用状态下不应该响应点击', async () => {
    const user = userEvent.setup()
    const { container } = render(<Switch disabled />)
    const switchEl = container.querySelector('button[role="switch"]')

    if (switchEl) {
      await user.click(switchEl)
      expect(container.querySelector('[data-state="checked"]')).not.toBeInTheDocument()
    }
  })

  it('应该在多次点击时正确切换', async () => {
    const user = userEvent.setup()
    const { container } = render(<Switch />)
    const switchEl = container.querySelector('button[role="switch"]')

    if (switchEl) {
      // 第一次点击 - 开启
      await user.click(switchEl)
      expect(container.querySelector('[data-state="checked"]')).toBeInTheDocument()

      // 第二次点击 - 关闭
      await user.click(switchEl)
      expect(container.querySelector('[data-state="unchecked"]')).toBeInTheDocument()
    }
  })

  it('应该支持 onCheckedChange 回调', async () => {
    const onCheckedChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<Switch onCheckedChange={onCheckedChange} />)
    const switchEl = container.querySelector('button[role="switch"]')

    if (switchEl) {
      await user.click(switchEl)
      expect(onCheckedChange).toHaveBeenCalled()
    }
  })

  it('应该支持受控模式', () => {
    const { container, rerender } = render(<Switch checked={false} />)
    expect(container.querySelector('[data-state="unchecked"]')).toBeInTheDocument()

    rerender(<Switch checked={true} />)
    expect(container.querySelector('[data-state="checked"]')).toBeInTheDocument()
  })
})
