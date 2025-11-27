import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@sker/ui/components/ui/collapsible'
import { Button } from '@sker/ui/components/ui/button'
import { useState } from 'react'

const meta = {
  title: 'UI/Collapsible',
  component: Collapsible,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-96 space-y-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            查看详情
            <span className="text-xs">{open ? '▲' : '▼'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded border p-4">
          这是可折叠的内容区域。点击按钮可以展开或收起此内容。
        </CollapsibleContent>
      </Collapsible>
    )
  },
}

export const DefaultOpen: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-96 space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full">
          默认展开
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded border p-4">
        此折叠面板默认处于展开状态。
      </CollapsibleContent>
    </Collapsible>
  ),
}

export const WithList: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-96 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">工作流节点类型</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {open ? '收起' : '展开'} ({8})
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded border px-4 py-2 text-sm">WeiboKeywordSearchAst</div>
          <div className="rounded border px-4 py-2 text-sm">WeiboAjaxStatusesShowAst</div>
          <div className="rounded border px-4 py-2 text-sm">PostContextCollectorAst</div>
          <div className="rounded border px-4 py-2 text-sm">PostNLPAnalyzerAst</div>
          <div className="rounded border px-4 py-2 text-sm">EventAutoCreatorAst</div>
          <div className="rounded border px-4 py-2 text-sm">WorkflowGraphAst</div>
          <div className="rounded border px-4 py-2 text-sm">ArrayIteratorAst</div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
}

export const Multiple: Story = {
  render: () => (
    <div className="w-96 space-y-4">
      <Collapsible className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            依赖注入系统
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded border p-4 text-sm">
          基于 reflect-metadata 的轻量级 DI 容器，支持层级化注入器和生命周期钩子。
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            工作流引擎
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded border p-4 text-sm">
          基于 AST 的可视化工作流编排系统，支持装饰器驱动的元数据收集。
        </CollapsibleContent>
      </Collapsible>

      <Collapsible className="space-y-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            Agent 系统
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="rounded border p-4 text-sm">
          基于 LangChain + LangGraph 的自主研究 Agent，提供舆情分析能力。
        </CollapsibleContent>
      </Collapsible>
    </div>
  ),
}

export const Nested: Story = {
  render: () => (
    <Collapsible defaultOpen className="w-96 space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full">
          一级折叠
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 rounded border p-4">
        <p className="text-sm">这是一级内容</p>
        <Collapsible className="space-y-2 border-l-2 pl-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              二级折叠
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="rounded border p-2 text-sm">
            这是嵌套的二级内容
          </CollapsibleContent>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  ),
}
