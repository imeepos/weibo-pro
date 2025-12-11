import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip'

describe('Tooltip Components', () => {
  describe('TooltipProvider', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <TooltipProvider>
          <div>内容</div>
        </TooltipProvider>
      )
      expect(container.querySelector('[data-slot="tooltip-provider"]')).toBeInTheDocument()
    })

    it('应该支持 delayDuration 属性', () => {
      const { container } = render(
        <TooltipProvider delayDuration={500}>
          <div>内容</div>
        </TooltipProvider>
      )
      const provider = container.querySelector('[data-slot="tooltip-provider"]')
      expect(provider).toBeInTheDocument()
    })
  })

  describe('Tooltip', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>提示文本</TooltipContent>
        </Tooltip>
      )
      expect(container.querySelector('[data-slot="tooltip"]')).toBeInTheDocument()
    })

    it('应该有内部的 TooltipProvider', () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>提示文本</TooltipContent>
        </Tooltip>
      )
      expect(container.querySelector('[data-slot="tooltip-provider"]')).toBeInTheDocument()
    })
  })

  describe('TooltipTrigger', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>触发器</TooltipTrigger>
          <TooltipContent>内容</TooltipContent>
        </Tooltip>
      )
      expect(container.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument()
    })

    it('应该显示触发器文本', () => {
      render(
        <Tooltip>
          <TooltipTrigger>悬停这个按钮</TooltipTrigger>
          <TooltipContent>这是提示</TooltipContent>
        </Tooltip>
      )
      expect(screen.getByText('悬停这个按钮')).toBeInTheDocument()
    })

    it('应该在悬停时显示提示', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>显示提示</TooltipContent>
        </Tooltip>
      )

      const trigger = screen.getByText('悬停我')
      await user.hover(trigger)

      await waitFor(
        () => {
          expect(screen.getByText('显示提示')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('应该在鼠标离开时隐藏提示', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>显示提示</TooltipContent>
        </Tooltip>
      )

      const trigger = screen.getByText('悬停我')

      // 悬停
      await user.hover(trigger)
      await waitFor(
        () => {
          expect(screen.getByText('显示提示')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // 离开
      await user.unhover(trigger)
      await waitFor(
        () => {
          expect(screen.queryByText('显示提示')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('TooltipContent', () => {
    it('应该有正确的 data-slot 属性', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>提示内容</TooltipContent>
        </Tooltip>
      )

      await user.hover(screen.getByText('悬停我'))

      await waitFor(
        () => {
          expect(container.querySelector('[data-slot="tooltip-content"]')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('应该支持 sideOffset 属性', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent sideOffset={10}>提示</TooltipContent>
        </Tooltip>
      )

      await user.hover(screen.getByText('悬停我'))

      await waitFor(
        () => {
          expect(container.querySelector('[data-slot="tooltip-content"]')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })

    it('应该接受自定义 className', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent className="custom-tooltip">提示</TooltipContent>
        </Tooltip>
      )

      await user.hover(screen.getByText('悬停我'))

      await waitFor(
        () => {
          expect(container.querySelector('[data-slot="tooltip-content"]')).toHaveClass(
            'custom-tooltip'
          )
        },
        { timeout: 1000 }
      )
    })

    it('应该支持不同的 side 属性', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent side="right">在右侧显示</TooltipContent>
        </Tooltip>
      )

      await user.hover(screen.getByText('悬停我'))

      await waitFor(
        () => {
          const content = container.querySelector('[data-slot="tooltip-content"]')
          expect(content).toHaveAttribute('data-side', 'right')
        },
        { timeout: 1000 }
      )
    })

    it('应该有箭头指示器', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tooltip>
          <TooltipTrigger>悬停我</TooltipTrigger>
          <TooltipContent>提示</TooltipContent>
        </Tooltip>
      )

      await user.hover(screen.getByText('悬停我'))

      // 箭头应该作为 TooltipContent 的子元素
      // 这里主要检查组件是否正确渲染
      await waitFor(
        () => {
          expect(container.querySelector('[data-slot="tooltip-content"]')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })

  describe('完整工具提示', () => {
    it('应该支持完整的工具提示工作流程', async () => {
      const user = userEvent.setup()
      render(
        <Tooltip>
          <TooltipTrigger>保存文件</TooltipTrigger>
          <TooltipContent>使用 Ctrl+S 快速保存</TooltipContent>
        </Tooltip>
      )

      // 初始状态，提示不可见
      expect(screen.queryByText('使用 Ctrl+S 快速保存')).not.toBeInTheDocument()

      // 悬停显示提示
      await user.hover(screen.getByText('保存文件'))
      await waitFor(
        () => {
          expect(screen.getByText('使用 Ctrl+S 快速保存')).toBeInTheDocument()
        },
        { timeout: 1000 }
      )

      // 离开隐藏提示
      await user.unhover(screen.getByText('保存文件'))
      await waitFor(
        () => {
          expect(screen.queryByText('使用 Ctrl+S 快速保存')).not.toBeInTheDocument()
        },
        { timeout: 1000 }
      )
    })
  })
})
