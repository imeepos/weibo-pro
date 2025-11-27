import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Popover, PopoverTrigger, PopoverContent } from '@sker/ui/components/ui/popover'
import { Button } from '@sker/ui/components/ui/button'
import { Input } from '@sker/ui/components/ui/input'
import { Settings, Info } from 'lucide-react'

const meta = {
  title: '@sker/ui/ui/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">打开</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="font-medium">工作流配置</h4>
          <p className="text-sm text-gray-600">配置工作流的执行参数</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>创建事件</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">新建舆情事件</h4>
            <p className="text-xs text-gray-600">填写事件基本信息</p>
          </div>
          <div className="space-y-2">
            <Input placeholder="事件标题" />
            <Input placeholder="关键词" />
          </div>
          <Button className="w-full" size="sm">创建</Button>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const WithIcon: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="font-medium">关于 Agent</h4>
          <p className="text-sm text-gray-600">
            Agent 系统基于 LangChain + LangGraph 构建，提供自主研究和舆情分析能力。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const AlignStart: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">左对齐</Button>
      </PopoverTrigger>
      <PopoverContent align="start">
        <p className="text-sm">内容左对齐显示</p>
      </PopoverContent>
    </Popover>
  ),
}

export const AlignEnd: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">右对齐</Button>
      </PopoverTrigger>
      <PopoverContent align="end">
        <p className="text-sm">内容右对齐显示</p>
      </PopoverContent>
    </Popover>
  ),
}

export const SideTop: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">顶部弹出</Button>
      </PopoverTrigger>
      <PopoverContent side="top">
        <p className="text-sm">从顶部弹出的内容</p>
      </PopoverContent>
    </Popover>
  ),
}

export const WithSettings: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-3">
          <h4 className="font-medium">节点设置</h4>
          <div className="space-y-2">
            <label className="text-xs font-medium">节点名称</label>
            <Input placeholder="WeiboKeywordSearchAst" className="h-8" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">超时时间（秒）</label>
            <Input type="number" placeholder="30" className="h-8" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">保存</Button>
            <Button size="sm" variant="outline" className="flex-1">取消</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const WithList: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">选择工具</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Agent 工具</h4>
          <div className="space-y-1">
            <button className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
              query_posts_tool
            </button>
            <button className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
              query_events_tool
            </button>
            <button className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
              nlp_analyze_tool
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
}

export const Narrow: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">窄内容</Button>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <p className="text-sm">较窄的弹出内容</p>
      </PopoverContent>
    </Popover>
  ),
}
