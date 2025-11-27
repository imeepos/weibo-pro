import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { ScrollArea, ScrollBar } from '@sker/ui/components/ui/scroll-area'

const meta = {
  title: '@sker/ui/ui/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<ReactRenderer>

export const Vertical: Story = {
  render: () => (
    <ScrollArea className="h-72 w-80 rounded-md border p-4">
      <div className="space-y-4">
        <h4 className="font-medium">工作流节点列表</h4>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rounded border p-3 text-sm">
            节点 {i + 1}: WeiboKeywordSearchAst
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex gap-4 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-32 shrink-0 rounded border p-4 text-center text-sm">
            事件 {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

export const Both: Story = {
  render: () => (
    <ScrollArea className="h-72 w-96 rounded-md border">
      <div className="p-4">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
              <th className="px-4 py-2 text-left text-sm font-medium">标题</th>
              <th className="px-4 py-2 text-left text-sm font-medium">关键词</th>
              <th className="px-4 py-2 text-left text-sm font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 20 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-2 text-sm">{i + 1}</td>
                <td className="px-4 py-2 text-sm">舆情事件 {i + 1}</td>
                <td className="px-4 py-2 text-sm">关键词{i + 1}</td>
                <td className="px-4 py-2 text-sm">进行中</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

export const WithLongText: Story = {
  render: () => (
    <ScrollArea className="h-48 w-96 rounded-md border p-4">
      <div className="space-y-4">
        <h4 className="font-medium">工作流引擎说明</h4>
        <p className="text-sm text-gray-600">
          工作流引擎是基于 AST（抽象语法树）的可视化工作流编排系统。
          通过装饰器驱动的元数据收集机制，实现了节点的自动注册和依赖分析。
        </p>
        <p className="text-sm text-gray-600">
          核心组件包括 WorkflowScheduler（调度器）、DependencyAnalyzer（依赖分析器）、
          DataFlowManager（数据流管理器）和 VisitorExecutor（访问者执行器）。
        </p>
        <p className="text-sm text-gray-600">
          节点类型包括微博 API 节点、数据处理节点和基础节点。
          每个节点通过 @Node、@Input、@Output 装饰器标记其元数据。
        </p>
        <p className="text-sm text-gray-600">
          执行引擎支持并发执行、条件分支、多值输入聚合等高级特性。
        </p>
      </div>
    </ScrollArea>
  ),
}

export const EventList: Story = {
  render: () => (
    <ScrollArea className="h-96 w-80 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 font-medium">舆情事件</h4>
        <div className="space-y-3">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="rounded border p-3">
              <div className="font-medium text-sm">事件 {i + 1}</div>
              <div className="mt-1 text-xs text-gray-600">
                关键词: 微博, 舆情, 分析
              </div>
              <div className="mt-1 text-xs text-gray-500">
                2025-11-27 10:{String(i).padStart(2, '0')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
}

export const CodeBlock: Story = {
  render: () => (
    <ScrollArea className="h-64 w-96 rounded-md border">
      <pre className="p-4 text-xs">
        <code>{`@Node({ title: 'WeiboKeywordSearchAst' })
export class WeiboKeywordSearchAst extends Ast {
  @Input()
  keyword: string

  @Output({ title: '搜索结果' })
  results: WeiboPost[]

  constructor() {
    super()
  }
}

@Handler(WeiboKeywordSearchAst)
export class WeiboKeywordSearchVisitor {
  async visit(ast: WeiboKeywordSearchAst, ctx: Context) {
    const results = await searchWeibo(ast.keyword)
    return { results }
  }
}`}</code>
      </pre>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

export const Compact: Story = {
  render: () => (
    <ScrollArea className="h-32 w-64 rounded-md border p-2">
      <div className="space-y-1 text-xs">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="rounded px-2 py-1 hover:bg-gray-100">
            选项 {i + 1}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}
