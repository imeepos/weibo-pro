import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgeDataMapping } from './edge-data-mapping'

describe('EdgeDataMapping Component', () => {
  const defaultProps = {
    fromProperty: 'source.text',
    toProperty: 'content',
    weight: 1,
    onFromPropertyChange: vi.fn(),
    onToPropertyChange: vi.fn(),
    onWeightChange: vi.fn(),
  }

  it('应该渲染数据映射标题', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    expect(screen.getByText('数据映射')).toBeInTheDocument()
  })

  it('应该渲染源属性输入框', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    const fromInput = screen.getByDisplayValue('source.text')
    expect(fromInput).toBeInTheDocument()
    expect(screen.getByText('源属性')).toBeInTheDocument()
  })

  it('应该渲染目标属性输入框', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    const toInput = screen.getByDisplayValue('content')
    expect(toInput).toBeInTheDocument()
    expect(screen.getByText('目标属性')).toBeInTheDocument()
  })

  it('应该渲染权重输入框', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    const weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toHaveAttribute('type', 'number')
  })

  it('应该在源属性变化时调用回调', async () => {
    const onFromPropertyChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...defaultProps}
        onFromPropertyChange={onFromPropertyChange}
      />
    )

    const fromInput = screen.getByDisplayValue('source.text') as HTMLInputElement
    await user.clear(fromInput)
    await user.type(fromInput, 'new.source')

    expect(onFromPropertyChange).toHaveBeenLastCalledWith('new.source')
  })

  it('应该在目标属性变化时调用回调', async () => {
    const onToPropertyChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...defaultProps}
        onToPropertyChange={onToPropertyChange}
      />
    )

    const toInput = screen.getByDisplayValue('content') as HTMLInputElement
    await user.clear(toInput)
    await user.type(toInput, 'newContent')

    expect(onToPropertyChange).toHaveBeenCalledWith('newContent')
  })

  it('应该在权重变化时调用回调', async () => {
    const onWeightChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...defaultProps}
        onWeightChange={onWeightChange}
      />
    )

    const weightInput = screen.getByDisplayValue('1') as HTMLInputElement
    await user.clear(weightInput)
    await user.type(weightInput, '5')

    expect(onWeightChange).toHaveBeenCalledWith(5)
  })

  it('应该支持嵌套属性路径', async () => {
    const onFromPropertyChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...defaultProps}
        onFromPropertyChange={onFromPropertyChange}
      />
    )

    const fromInput = screen.getByPlaceholderText('例如: currentItem.text')
    expect(fromInput).toBeInTheDocument()
  })

  it('应该显示占位符文本', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    expect(screen.getByPlaceholderText('例如: currentItem.text')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如: content')).toBeInTheDocument()
  })

  it('权重输入应该有最小值限制', () => {
    render(<EdgeDataMapping {...defaultProps} />)
    const weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toHaveAttribute('min', '1')
  })

  it('应该处理权重为非数字的输入', async () => {
    const onWeightChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...defaultProps}
        weight={1}
        onWeightChange={onWeightChange}
      />
    )

    const weightInput = screen.getByDisplayValue('1') as HTMLInputElement
    await user.clear(weightInput)
    await user.type(weightInput, 'abc')

    // 当输入非数字时，parseInt 返回 NaN，所以应该使用 1 作为默认值
    expect(onWeightChange).toHaveBeenCalledWith(1)
  })

  it('应该支持不同的权重值', () => {
    const { rerender } = render(
      <EdgeDataMapping {...defaultProps} weight={1} />
    )

    let weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toBeInTheDocument()

    rerender(<EdgeDataMapping {...defaultProps} weight={10} />)
    weightInput = screen.getByDisplayValue('10')
    expect(weightInput).toBeInTheDocument()
  })
})
