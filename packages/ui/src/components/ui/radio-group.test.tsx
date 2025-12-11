import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RadioGroup, RadioGroupItem } from './radio-group'

describe('RadioGroup Components', () => {
  describe('RadioGroup', () => {
    it('应该渲染为单选组容器', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      expect(container.querySelector('[data-slot="radio-group"]')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <RadioGroup className="custom-group">
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      expect(container.querySelector('[data-slot="radio-group"]')).toHaveClass('custom-group')
    })

    it('应该支持 defaultValue 属性', () => {
      const { container } = render(
        <RadioGroup defaultValue="option2">
          <RadioGroupItem value="option1" id="opt1" />
          <RadioGroupItem value="option2" id="opt2" />
        </RadioGroup>
      )
      const checked = container.querySelector('[data-state="checked"]')
      expect(checked).toBeInTheDocument()
    })

    it('应该支持 onValueChange 回调', async () => {
      const onValueChange = vi.fn()
      const user = userEvent.setup()
      const { container } = render(
        <RadioGroup onValueChange={onValueChange}>
          <RadioGroupItem value="option1" />
          <RadioGroupItem value="option2" />
        </RadioGroup>
      )

      const items = container.querySelectorAll('button[role="radio"]')
      if (items[0]) {
        await user.click(items[0])
        expect(onValueChange).toHaveBeenCalledWith('option1')
      }
    })
  })

  describe('RadioGroupItem', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      expect(container.querySelector('[data-slot="radio-group-item"]')).toBeInTheDocument()
    })

    it('选中状态应该有 indicator 子元素', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      // indicator 仅在选中时渲染
      const item = container.querySelector('button[role="radio"]')
      if (item) {
        await user.click(item)
        expect(container.querySelector('[data-slot="radio-group-indicator"]')).toBeInTheDocument()
      }
    })

    it('初始状态应该是未选中', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      const item = container.querySelector('[data-slot="radio-group-item"]')
      expect(item).toHaveAttribute('data-state', 'unchecked')
    })

    it('应该支持选中状态', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" />
        </RadioGroup>
      )
      const item = container.querySelector('button[role="radio"]')
      if (item) {
        await user.click(item)
        expect(container.querySelector('[data-state="checked"]')).toBeInTheDocument()
      }
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" className="custom-item" />
        </RadioGroup>
      )
      expect(container.querySelector('[data-slot="radio-group-item"]')).toHaveClass('custom-item')
    })

    it('应该支持 disabled 状态', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" disabled />
        </RadioGroup>
      )
      const item = container.querySelector('[data-slot="radio-group-item"]')
      expect(item).toHaveAttribute('disabled')
    })

    it('禁用项不应该响应点击', async () => {
      const onValueChange = vi.fn()
      const user = userEvent.setup()
      const { container } = render(
        <RadioGroup onValueChange={onValueChange}>
          <RadioGroupItem value="option1" disabled />
        </RadioGroup>
      )

      const item = container.querySelector('button[role="radio"]')
      if (item) {
        await user.click(item)
        expect(onValueChange).not.toHaveBeenCalled()
      }
    })

    it('应该支持 aria-label', () => {
      const { container } = render(
        <RadioGroup>
          <RadioGroupItem value="option1" aria-label="选项一" />
        </RadioGroup>
      )
      expect(container.querySelector('[data-slot="radio-group-item"]')).toHaveAttribute(
        'aria-label',
        '选项一'
      )
    })
  })

  describe('完整单选组', () => {
    it('应该支持多个选项的单选切换', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <RadioGroup defaultValue="option1">
          <RadioGroupItem value="option1" id="opt1" />
          <RadioGroupItem value="option2" id="opt2" />
          <RadioGroupItem value="option3" id="opt3" />
        </RadioGroup>
      )

      const items = container.querySelectorAll('button[role="radio"]')

      // 选择 option1（已默认选中）
      expect(items[0]).toHaveAttribute('data-state', 'checked')
      expect(items[1]).toHaveAttribute('data-state', 'unchecked')

      // 点击 option2
      await user.click(items[1])
      expect(items[1]).toHaveAttribute('data-state', 'checked')
      expect(items[0]).toHaveAttribute('data-state', 'unchecked')

      // 点击 option3
      await user.click(items[2])
      expect(items[2]).toHaveAttribute('data-state', 'checked')
      expect(items[1]).toHaveAttribute('data-state', 'unchecked')
    })
  })
})
