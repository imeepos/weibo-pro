import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@sker/ui/components/ui/tooltip'
import { Button } from '@sker/ui/components/ui/button'
import { Info, Settings, Trash2, Plus } from 'lucide-react'

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">悬停查看</Button>
      </TooltipTrigger>
      <TooltipContent>这是一个提示信息</TooltipContent>
    </Tooltip>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>查看工作流详情</TooltipContent>
    </Tooltip>
  ),
}

export const SideTop: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">顶部</Button>
      </TooltipTrigger>
      <TooltipContent side="top">从顶部显示</TooltipContent>
    </Tooltip>
  ),
}

export const SideBottom: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">底部</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">从底部显示</TooltipContent>
    </Tooltip>
  ),
}

export const SideLeft: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">左侧</Button>
      </TooltipTrigger>
      <TooltipContent side="left">从左侧显示</TooltipContent>
    </Tooltip>
  ),
}

export const SideRight: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">右侧</Button>
      </TooltipTrigger>
      <TooltipContent side="right">从右侧显示</TooltipContent>
    </Tooltip>
  ),
}

export const LongText: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">长文本</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        工作流引擎基于 AST 的可视化编排系统，支持装饰器驱动的元数据收集和依赖分析
      </TooltipContent>
    </Tooltip>
  ),
}

export const IconButtons: Story = {
  render: () => (
    <div className="flex gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>新建节点</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>节点设置</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>删除节点</TooltipContent>
      </Tooltip>
    </div>
  ),
}

export const OnText: Story = {
  render: () => (
    <p className="text-sm">
      这是一段文本，其中包含{' '}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted">工作流引擎</span>
        </TooltipTrigger>
        <TooltipContent>基于 AST 的可视化工作流编排系统</TooltipContent>
      </Tooltip>{' '}
      的说明
    </p>
  ),
}

export const WithKeyboard: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">保存</Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <span>保存工作流</span>
          <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-xs">⌘S</kbd>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" disabled>
          已禁用
        </Button>
      </TooltipTrigger>
      <TooltipContent>此操作当前不可用</TooltipContent>
    </Tooltip>
  ),
}
