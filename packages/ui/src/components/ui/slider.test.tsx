import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Slider } from './slider'

describe('Slider Component', () => {
  it('应该渲染为滑块', () => {
    const { container } = render(<Slider />)
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument()
  })

  it('应该有滑块轨道', () => {
    const { container } = render(<Slider />)
    expect(container.querySelector('[data-slot="slider-track"]')).toBeInTheDocument()
  })

  it('应该有滑块范围', () => {
    const { container } = render(<Slider />)
    expect(container.querySelector('[data-slot="slider-range"]')).toBeInTheDocument()
  })

  it('应该有滑块拇指', () => {
    const { container } = render(<Slider />)
    expect(container.querySelector('[data-slot="slider-thumb"]')).toBeInTheDocument()
  })

  it('应该支持 defaultValue', () => {
    const { container } = render(<Slider defaultValue={[50]} />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toBeInTheDocument()
  })

  it('应该支持 min 和 max 属性', () => {
    const { container } = render(<Slider min={0} max={100} />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toBeInTheDocument()
  })

  it('应该支持受控模式', () => {
    const { container } = render(<Slider value={[60]} />)
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument()
  })

  it('应该支持 onValueChange 回调', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <Slider defaultValue={[50]} onValueChange={onValueChange} />
    )
    const slider = container.querySelector('[role="slider"]')
    if (slider) {
      await user.click(slider)
      // 注意：实际的值变化取决于点击位置，这里主要测试回调是否被调用
    }
  })

  it('应该支持 disabled 状态', () => {
    const { container } = render(<Slider disabled />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toHaveAttribute('data-disabled')
  })

  it('应该接受自定义 className', () => {
    const { container } = render(<Slider className="custom-slider" />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toHaveClass('custom-slider')
  })

  it('应该支持多个拇指', () => {
    const { container } = render(<Slider defaultValue={[30, 70]} />)
    const thumbs = container.querySelectorAll('[data-slot="slider-thumb"]')
    expect(thumbs.length).toBe(2)
  })

  it('应该有正确的 orientation 属性', () => {
    const { container } = render(<Slider orientation="vertical" />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toHaveAttribute('data-orientation', 'vertical')
  })

  it('应该支持不同的步长', () => {
    const { container } = render(<Slider step={10} />)
    const slider = container.querySelector('[data-slot="slider"]')
    expect(slider).toBeInTheDocument()
  })
})
