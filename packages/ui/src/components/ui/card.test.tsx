import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from './card'

describe('Card Components', () => {
  describe('Card', () => {
    it('应该渲染为 div 元素', () => {
      const { container } = render(<Card>内容</Card>)
      expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument()
    })

    it('应该包含文本内容', () => {
      render(<Card>卡片内容</Card>)
      expect(screen.getByText('卡片内容')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(<Card className="custom">内容</Card>)
      expect(container.querySelector('[data-slot="card"]')).toHaveClass('custom')
    })

    it('应该支持子组件', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>标题</CardTitle>
          </CardHeader>
          <CardContent>内容</CardContent>
        </Card>
      )
      expect(screen.getByText('标题')).toBeInTheDocument()
      expect(screen.getByText('内容')).toBeInTheDocument()
    })
  })

  describe('CardHeader', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardHeader>头部</CardHeader>)
      expect(container.querySelector('[data-slot="card-header"]')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <CardHeader className="custom-header">内容</CardHeader>
      )
      expect(container.querySelector('[data-slot="card-header"]')).toHaveClass(
        'custom-header'
      )
    })
  })

  describe('CardTitle', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardTitle>标题</CardTitle>)
      expect(container.querySelector('[data-slot="card-title"]')).toBeInTheDocument()
    })

    it('应该渲染标题文本', () => {
      render(<CardTitle>我的标题</CardTitle>)
      expect(screen.getByText('我的标题')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <CardTitle className="custom-title">标题</CardTitle>
      )
      expect(container.querySelector('[data-slot="card-title"]')).toHaveClass(
        'custom-title'
      )
    })
  })

  describe('CardDescription', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardDescription>描述</CardDescription>)
      expect(container.querySelector('[data-slot="card-description"]')).toBeInTheDocument()
    })

    it('应该渲染描述文本', () => {
      render(<CardDescription>卡片描述信息</CardDescription>)
      expect(screen.getByText('卡片描述信息')).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardContent>内容</CardContent>)
      expect(container.querySelector('[data-slot="card-content"]')).toBeInTheDocument()
    })

    it('应该渲染内容', () => {
      render(<CardContent>主要内容区域</CardContent>)
      expect(screen.getByText('主要内容区域')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardFooter>页脚</CardFooter>)
      expect(container.querySelector('[data-slot="card-footer"]')).toBeInTheDocument()
    })

    it('应该渲染页脚内容', () => {
      render(<CardFooter>©2024 版权所有</CardFooter>)
      expect(screen.getByText('©2024 版权所有')).toBeInTheDocument()
    })
  })

  describe('CardAction', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(<CardAction>操作</CardAction>)
      expect(container.querySelector('[data-slot="card-action"]')).toBeInTheDocument()
    })

    it('应该渲染操作按钮', () => {
      render(<CardAction>更多操作</CardAction>)
      expect(screen.getByText('更多操作')).toBeInTheDocument()
    })
  })

  describe('完整卡片', () => {
    it('应该支持完整的卡片结构', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>卡片标题</CardTitle>
            <CardDescription>卡片描述</CardDescription>
            <CardAction>编辑</CardAction>
          </CardHeader>
          <CardContent>这是卡片的主要内容</CardContent>
          <CardFooter>页脚信息</CardFooter>
        </Card>
      )

      expect(screen.getByText('卡片标题')).toBeInTheDocument()
      expect(screen.getByText('卡片描述')).toBeInTheDocument()
      expect(screen.getByText('编辑')).toBeInTheDocument()
      expect(screen.getByText('这是卡片的主要内容')).toBeInTheDocument()
      expect(screen.getByText('页脚信息')).toBeInTheDocument()
    })
  })
})
