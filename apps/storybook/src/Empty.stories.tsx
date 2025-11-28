import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@sker/ui/components/ui/empty'
import { Button } from '@sker/ui/components/ui/button'
import { FileX, Inbox, Search, Workflow } from 'lucide-react'

const meta = {
  title: 'UI/Empty',
  component: Empty,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Inbox className="size-12 text-gray-400" />
        </EmptyMedia>
        <EmptyTitle>暂无数据</EmptyTitle>
        <EmptyDescription>当前没有可显示的内容</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Workflow />
        </EmptyMedia>
        <EmptyTitle>暂无工作流</EmptyTitle>
        <EmptyDescription>创建第一个工作流开始数据采集</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

export const WithAction: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <FileX className="size-12 text-gray-400" />
        </EmptyMedia>
        <EmptyTitle>未找到微博数据</EmptyTitle>
        <EmptyDescription>尝试调整搜索条件或创建新的采集任务</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button>创建采集任务</Button>
      </EmptyContent>
    </Empty>
  ),
}

export const SearchEmpty: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>未找到匹配结果</EmptyTitle>
        <EmptyDescription>
          没有找到与 "关键词" 相关的舆情事件，请尝试其他搜索词
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">清除搜索</Button>
      </EmptyContent>
    </Empty>
  ),
}

export const MultipleActions: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <Inbox className="size-12 text-gray-400" />
        </EmptyMedia>
        <EmptyTitle>暂无 Agent 任务</EmptyTitle>
        <EmptyDescription>创建 Agent 任务进行自主研究和舆情分析</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button>创建研究任务</Button>
          <Button variant="outline">查看示例</Button>
        </div>
      </EmptyContent>
    </Empty>
  ),
}

export const WithLink: Story = {
  render: () => (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileX />
        </EmptyMedia>
        <EmptyTitle>NLP 分析结果为空</EmptyTitle>
        <EmptyDescription>
          当前没有可用的分析结果。<a href="#">了解如何配置 NLP 服务</a>
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
}

export const Minimal: Story = {
  render: () => (
    <Empty>
      <EmptyTitle>暂无内容</EmptyTitle>
    </Empty>
  ),
}
