import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'

describe('Tabs Components', () => {
  describe('Tabs', () => {
    it('应该渲染为 tabs 容器', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs"]')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <Tabs className="custom-tabs">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs"]')).toHaveClass('custom-tabs')
    })

    it('应该支持 defaultValue 属性', () => {
      render(
        <Tabs defaultValue="tab2">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
            <TabsTrigger value="tab2">标签2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
          <TabsContent value="tab2">内容2</TabsContent>
        </Tabs>
      )
      expect(screen.getByText('内容2')).toBeVisible()
    })
  })

  describe('TabsList', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-list"]')).toBeInTheDocument()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <Tabs>
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-list"]')).toHaveClass('custom-list')
    })
  })

  describe('TabsTrigger', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-trigger"]')).toBeInTheDocument()
    })

    it('应该在活跃时有 data-state=active 属性', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      const trigger = container.querySelector('[data-slot="tabs-trigger"]')
      expect(trigger).toHaveAttribute('data-state', 'active')
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              标签1
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-trigger"]')).toHaveClass('custom-trigger')
    })

    it('应该支持点击切换选项卡', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
            <TabsTrigger value="tab2">标签2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
          <TabsContent value="tab2">内容2</TabsContent>
        </Tabs>
      )

      const tab2Trigger = screen.getByText('标签2')
      await user.click(tab2Trigger)

      expect(screen.getByText('内容2')).toBeVisible()
    })

    it('禁用的触发器不应该响应点击', async () => {
      const user = userEvent.setup()
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              标签2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
          <TabsContent value="tab2">内容2</TabsContent>
        </Tabs>
      )

      const tab2Trigger = screen.getByText('标签2') as HTMLButtonElement
      await user.click(tab2Trigger)

      expect(screen.getByText('内容1')).toBeVisible()
      // 内容2 的 TabsContent 存在但被隐藏，使用 container 查询 data-state
      const tab2Content = document.querySelector('[data-slot="tabs-content"][data-state="inactive"]')
      expect(tab2Content).toBeInTheDocument()
    })
  })

  describe('TabsContent', () => {
    it('应该有正确的 data-slot 属性', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-content"]')).toBeInTheDocument()
    })

    it('应该渲染对应值的内容', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
            <TabsTrigger value="tab2">标签2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">内容1</TabsContent>
          <TabsContent value="tab2">内容2</TabsContent>
        </Tabs>
      )
      expect(screen.getByText('内容1')).toBeVisible()
    })

    it('应该接受自定义 className', () => {
      const { container } = render(
        <Tabs>
          <TabsList>
            <TabsTrigger value="tab1">标签1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content">
            内容1
          </TabsContent>
        </Tabs>
      )
      expect(container.querySelector('[data-slot="tabs-content"]')).toHaveClass('custom-content')
    })
  })

  describe('完整选项卡组', () => {
    it('应该支持多个选项卡的完整工作流程', async () => {
      const user = userEvent.setup()
      render(
        <Tabs defaultValue="home">
          <TabsList>
            <TabsTrigger value="home">首页</TabsTrigger>
            <TabsTrigger value="profile">个人资料</TabsTrigger>
            <TabsTrigger value="settings">设置</TabsTrigger>
          </TabsList>
          <TabsContent value="home">欢迎来到首页</TabsContent>
          <TabsContent value="profile">这是个人资料页面</TabsContent>
          <TabsContent value="settings">这是设置页面</TabsContent>
        </Tabs>
      )

      expect(screen.getByText('欢迎来到首页')).toBeVisible()

      await user.click(screen.getByText('个人资料'))
      expect(screen.getByText('这是个人资料页面')).toBeVisible()

      await user.click(screen.getByText('设置'))
      expect(screen.getByText('这是设置页面')).toBeVisible()
    })
  })
})
