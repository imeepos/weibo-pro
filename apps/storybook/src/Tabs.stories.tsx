import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@sker/ui/components/ui/tabs'
import { Workflow, Database, BarChart } from 'lucide-react'

const meta = {
  title: '@sker/ui/ui/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<ReactRenderer>

export const Basic: Story = {
  render: () => (
    <Tabs defaultValue="workflow" className="w-96">
      <TabsList>
        <TabsTrigger value="workflow">工作流</TabsTrigger>
        <TabsTrigger value="data">数据</TabsTrigger>
        <TabsTrigger value="analysis">分析</TabsTrigger>
      </TabsList>
      <TabsContent value="workflow">
        <div className="rounded border p-4">工作流编辑器内容</div>
      </TabsContent>
      <TabsContent value="data">
        <div className="rounded border p-4">数据采集内容</div>
      </TabsContent>
      <TabsContent value="analysis">
        <div className="rounded border p-4">舆情分析内容</div>
      </TabsContent>
    </Tabs>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="workflow" className="w-96">
      <TabsList>
        <TabsTrigger value="workflow">
          <Workflow />
          工作流
        </TabsTrigger>
        <TabsTrigger value="data">
          <Database />
          数据
        </TabsTrigger>
        <TabsTrigger value="analysis">
          <BarChart />
          分析
        </TabsTrigger>
      </TabsList>
      <TabsContent value="workflow">
        <div className="rounded border p-4">工作流编辑器</div>
      </TabsContent>
      <TabsContent value="data">
        <div className="rounded border p-4">数据管理</div>
      </TabsContent>
      <TabsContent value="analysis">
        <div className="rounded border p-4">数据分析</div>
      </TabsContent>
    </Tabs>
  ),
}

export const TwoTabs: Story = {
  render: () => (
    <Tabs defaultValue="posts" className="w-96">
      <TabsList>
        <TabsTrigger value="posts">微博帖子</TabsTrigger>
        <TabsTrigger value="events">舆情事件</TabsTrigger>
      </TabsList>
      <TabsContent value="posts">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border p-3 text-sm">
              微博帖子 {i + 1}
            </div>
          ))}
        </div>
      </TabsContent>
      <TabsContent value="events">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded border p-3 text-sm">
              舆情事件 {i + 1}
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  ),
}

export const FourTabs: Story = {
  render: () => (
    <Tabs defaultValue="api" className="w-[600px]">
      <TabsList>
        <TabsTrigger value="api">微博 API</TabsTrigger>
        <TabsTrigger value="process">数据处理</TabsTrigger>
        <TabsTrigger value="agent">Agent</TabsTrigger>
        <TabsTrigger value="basic">基础节点</TabsTrigger>
      </TabsList>
      <TabsContent value="api">
        <div className="rounded border p-4">微博 API 节点列表</div>
      </TabsContent>
      <TabsContent value="process">
        <div className="rounded border p-4">数据处理节点列表</div>
      </TabsContent>
      <TabsContent value="agent">
        <div className="rounded border p-4">Agent 工具列表</div>
      </TabsContent>
      <TabsContent value="basic">
        <div className="rounded border p-4">基础节点列表</div>
      </TabsContent>
    </Tabs>
  ),
}

export const WithRichContent: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[600px]">
      <TabsList>
        <TabsTrigger value="overview">概览</TabsTrigger>
        <TabsTrigger value="details">详情</TabsTrigger>
        <TabsTrigger value="settings">设置</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="space-y-4 rounded border p-4">
          <h3 className="font-medium">工作流概览</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border p-3">
              <div className="text-sm text-gray-600">节点数量</div>
              <div className="text-2xl font-bold">12</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-sm text-gray-600">执行次数</div>
              <div className="text-2xl font-bold">256</div>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="details">
        <div className="space-y-2 rounded border p-4">
          <h3 className="font-medium">节点详情</h3>
          <div className="space-y-2">
            <div className="rounded border p-2 text-sm">WeiboKeywordSearchAst</div>
            <div className="rounded border p-2 text-sm">PostNLPAnalyzerAst</div>
            <div className="rounded border p-2 text-sm">EventAutoCreatorAst</div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="settings">
        <div className="space-y-4 rounded border p-4">
          <h3 className="font-medium">工作流设置</h3>
          <div className="space-y-2">
            <label className="text-sm">超时时间（秒）</label>
            <input type="number" className="w-full rounded border px-3 py-2" defaultValue={30} />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ),
}

export const FullWidth: Story = {
  render: () => (
    <Tabs defaultValue="all" className="w-[600px]">
      <TabsList className="w-full">
        <TabsTrigger value="all" className="flex-1">全部</TabsTrigger>
        <TabsTrigger value="running" className="flex-1">运行中</TabsTrigger>
        <TabsTrigger value="completed" className="flex-1">已完成</TabsTrigger>
        <TabsTrigger value="failed" className="flex-1">失败</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <div className="rounded border p-4">全部工作流</div>
      </TabsContent>
      <TabsContent value="running">
        <div className="rounded border p-4">运行中的工作流</div>
      </TabsContent>
      <TabsContent value="completed">
        <div className="rounded border p-4">已完成的工作流</div>
      </TabsContent>
      <TabsContent value="failed">
        <div className="rounded border p-4">失败的工作流</div>
      </TabsContent>
    </Tabs>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="enabled" className="w-96">
      <TabsList>
        <TabsTrigger value="enabled">可用</TabsTrigger>
        <TabsTrigger value="disabled" disabled>已禁用</TabsTrigger>
        <TabsTrigger value="another">另一个</TabsTrigger>
      </TabsList>
      <TabsContent value="enabled">
        <div className="rounded border p-4">可用标签页内容</div>
      </TabsContent>
      <TabsContent value="disabled">
        <div className="rounded border p-4">禁用标签页内容</div>
      </TabsContent>
      <TabsContent value="another">
        <div className="rounded border p-4">另一个标签页内容</div>
      </TabsContent>
    </Tabs>
  ),
}
