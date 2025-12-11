import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EdgeDataMapping } from './edge-data-mapping'

describe('EdgeDataMapping Component', () => {
  const createDefaultProps = () => ({
    fromProperty: 'source.text',
    toProperty: 'content',
    weight: 1,
    onFromPropertyChange: vi.fn(),
    onToPropertyChange: vi.fn(),
    onWeightChange: vi.fn(),
  })

  it('应该渲染数据映射标题', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    expect(screen.getByText('数据映射')).toBeInTheDocument()
  })

  it('应该渲染源属性输入框', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    const fromInput = screen.getByDisplayValue('source.text')
    expect(fromInput).toBeInTheDocument()
    expect(screen.getByText('源属性')).toBeInTheDocument()
  })

  it('应该渲染目标属性输入框', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    const toInput = screen.getByDisplayValue('content')
    expect(toInput).toBeInTheDocument()
    expect(screen.getByText('目标属性')).toBeInTheDocument()
  })

  it('应该渲染权重输入框', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    const weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toHaveAttribute('type', 'number')
  })

  it('应该在源属性变化时调用回调', async () => {
    const onFromPropertyChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...createDefaultProps()}
        fromProperty=""
        onFromPropertyChange={onFromPropertyChange}
      />
    )

    const fromInput = screen.getByPlaceholderText('例如: currentItem.text') as HTMLInputElement
    await user.type(fromInput, 'abc')

    // 受控组件：父组件未更新状态，每次按键传递当前输入的单个字符
    expect(onFromPropertyChange).toHaveBeenCalledTimes(3)
    expect(onFromPropertyChange).toHaveBeenNthCalledWith(1, 'a')
    expect(onFromPropertyChange).toHaveBeenNthCalledWith(2, 'b')
    expect(onFromPropertyChange).toHaveBeenNthCalledWith(3, 'c')
  })

  it('应该在目标属性变化时调用回调', async () => {
    const onToPropertyChange = vi.fn()
    const user = userEvent.setup()

    render(
      <EdgeDataMapping
        {...createDefaultProps()}
        toProperty=""
        onToPropertyChange={onToPropertyChange}
      />
    )

    const toInput = screen.getByPlaceholderText('例如: content') as HTMLInputElement
    await user.type(toInput, 'xyz')

    // 受控组件：父组件未更新状态，每次按键传递当前输入的单个字符
    expect(onToPropertyChange).toHaveBeenCalledTimes(3)
    expect(onToPropertyChange).toHaveBeenNthCalledWith(1, 'x')
    expect(onToPropertyChange).toHaveBeenNthCalledWith(2, 'y')
    expect(onToPropertyChange).toHaveBeenNthCalledWith(3, 'z')
  })

  it('应该在权重变化时调用回调', async () => {
    const onWeightChange = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <EdgeDataMapping
        {...createDefaultProps()}
        weight={1}
        onWeightChange={onWeightChange}
      />
    )

    // 查找权重输入框
    const weightInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.tripleClick(weightInput)
    await user.type(weightInput, '5')

    expect(onWeightChange).toHaveBeenCalled()
  })

  it('应该支持嵌套属性路径', async () => {
    render(
      <EdgeDataMapping
        {...createDefaultProps()}
      />
    )

    const fromInput = screen.getByPlaceholderText('例如: currentItem.text')
    expect(fromInput).toBeInTheDocument()
  })

  it('应该显示占位符文本', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    expect(screen.getByPlaceholderText('例如: currentItem.text')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如: content')).toBeInTheDocument()
  })

  it('权重输入应该有最小值限制', () => {
    render(<EdgeDataMapping {...createDefaultProps()} />)
    const weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toHaveAttribute('min', '1')
  })

  it('应该处理权重输入', async () => {
    const onWeightChange = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <EdgeDataMapping
        {...createDefaultProps()}
        weight={1}
        onWeightChange={onWeightChange}
      />
    )

    const weightInput = container.querySelector('input[type="number"]') as HTMLInputElement
    await user.tripleClick(weightInput)
    await user.type(weightInput, '2')

    expect(onWeightChange).toHaveBeenCalled()
  })

  it('应该支持不同的权重值', () => {
    const { rerender } = render(
      <EdgeDataMapping {...createDefaultProps()} weight={1} />
    )

    let weightInput = screen.getByDisplayValue('1')
    expect(weightInput).toBeInTheDocument()

    rerender(<EdgeDataMapping {...createDefaultProps()} weight={10} />)
    weightInput = screen.getByDisplayValue('10')
    expect(weightInput).toBeInTheDocument()
  })
})
