import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox Component', () => {
  it('应该渲染为复选框', () => {
    const { container } = render(<Checkbox />)
    expect(container.querySelector('[data-slot="checkbox"]')).toBeInTheDocument()
  })

  it('初始状态应该是未选中', () => {
    const { container } = render(<Checkbox />)
    const checkbox = container.querySelector('button[data-state="unchecked"]')
    expect(checkbox).toBeInTheDocument()
  })

  it('应该支持切换选中状态', async () => {
    const user = userEvent.setup()
    const { container } = render(<Checkbox />)
    const checkbox = container.querySelector('button[role="checkbox"]')

    if (checkbox) {
      await user.click(checkbox)
      expect(container.querySelector('button[data-state="checked"]')).toBeInTheDocument()
    }
  })

  it('应该支持 disabled 状态', () => {
    const { container } = render(<Checkbox disabled />)
    const checkbox = container.querySelector('[data-slot="checkbox"]')
    expect(checkbox).toHaveAttribute('disabled')
  })

  it('应该接受自定义 className', () => {
    const { container } = render(<Checkbox className="custom-checkbox" />)
    const checkbox = container.querySelector('[data-slot="checkbox"]')
    expect(checkbox).toHaveClass('custom-checkbox')
  })

  it('选中状态应该有 checkbox indicator', async () => {
    const user = userEvent.setup()
    const { container } = render(<Checkbox />)
    const checkbox = container.querySelector('button[role="checkbox"]')
    // indicator 仅在选中时渲染
    if (checkbox) {
      await user.click(checkbox)
      expect(container.querySelector('[data-slot="checkbox-indicator"]')).toBeInTheDocument()
    }
  })

  it('应该支持 aria 属性', () => {
    const { container } = render(<Checkbox aria-label="同意条款" />)
    const checkbox = container.querySelector('[data-slot="checkbox"]')
    expect(checkbox).toHaveAttribute('aria-label', '同意条款')
  })

  it('禁用状态下不应该响应点击', async () => {
    const user = userEvent.setup()
    const { container } = render(<Checkbox disabled />)
    const checkbox = container.querySelector('button[role="checkbox"]')

    if (checkbox) {
      await user.click(checkbox)
      expect(container.querySelector('button[data-state="checked"]')).not.toBeInTheDocument()
    }
  })

  it('应该在多次点击时正确切换状态', async () => {
    const user = userEvent.setup()
    const { container } = render(<Checkbox />)
    const checkbox = container.querySelector('button[role="checkbox"]')

    if (checkbox) {
      // 第一次点击 - 选中
      await user.click(checkbox)
      expect(container.querySelector('button[data-state="checked"]')).toBeInTheDocument()

      // 第二次点击 - 取消选中
      await user.click(checkbox)
      expect(container.querySelector('button[data-state="unchecked"]')).toBeInTheDocument()
    }
  })
})
