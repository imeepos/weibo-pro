import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './input'

describe('Input Component', () => {
  it('应该渲染为 input 元素', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('[data-slot="input"]')).toBeInTheDocument()
  })

  it('应该有 text type 作为默认', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('[data-slot="input"]') as HTMLInputElement
    // HTML input 的默认 type 是 'text'，但不一定显式设置属性
    expect(input.type).toBe('text')
  })

  it('应该支持 type 属性', () => {
    const { container } = render(<Input type="password" />)
    const input = container.querySelector('[data-slot="input"]')
    expect(input).toHaveAttribute('type', 'password')
  })

  it('应该支持 placeholder 属性', () => {
    render(<Input placeholder="请输入内容" />)
    expect(screen.getByPlaceholderText('请输入内容')).toBeInTheDocument()
  })

  it('应该支持输入值', async () => {
    const user = userEvent.setup()
    const { container } = render(<Input />)
    const input = container.querySelector('input') as HTMLInputElement

    await user.type(input, '测试值')
    expect(input.value).toBe('测试值')
  })

  it('应该支持 disabled 状态', () => {
    const { container } = render(<Input disabled />)
    const input = container.querySelector('[data-slot="input"]')
    expect(input).toBeDisabled()
  })

  it('应该接受自定义 className', () => {
    const { container } = render(<Input className="custom-input" />)
    const input = container.querySelector('[data-slot="input"]')
    expect(input).toHaveClass('custom-input')
  })

  it('应该支持 onChange 回调', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <Input onChange={onChange} />
    )
    const input = container.querySelector('input') as HTMLInputElement

    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalled()
  })

  it('应该支持 aria 属性', () => {
    const { container } = render(<Input aria-label="搜索框" />)
    expect(screen.getByLabelText('搜索框')).toBeInTheDocument()
  })

  it('应该支持 readonly 属性', () => {
    const { container } = render(<Input readOnly defaultValue="只读值" />)
    const input = container.querySelector('input') as HTMLInputElement
    expect(input).toHaveAttribute('readonly')
    expect(input.value).toBe('只读值')
  })

  it('禁用状态下不应该接收输入', async () => {
    const user = userEvent.setup()
    const { container } = render(<Input disabled />)
    const input = container.querySelector('input') as HTMLInputElement

    await user.type(input, 'test')
    expect(input.value).toBe('')
  })

  it('应该支持多种 type 类型', () => {
    const types = ['email', 'number', 'date', 'tel', 'url']

    types.forEach((type) => {
      const { container } = render(<Input type={type as any} />)
      const input = container.querySelector('[data-slot="input"]')
      expect(input).toHaveAttribute('type', type)
    })
  })
})
