import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@sker/ui/components/ui/drawer'
import { Button } from '@sker/ui/components/ui/button'

const meta = {
  title: 'UI/Drawer',
  component: Drawer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<ReactRenderer>

export const Bottom: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>从底部打开</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>工作流配置</DrawerTitle>
          <DrawerDescription>配置工作流的执行参数和调度策略</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm">这是抽屉的主要内容区域</p>
        </div>
        <DrawerFooter>
          <Button>保存</Button>
          <DrawerClose asChild>
            <Button variant="outline">取消</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

export const Right: Story = {
  render: () => (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button>从右侧打开</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>节点详情</DrawerTitle>
          <DrawerDescription>查看和编辑节点配置</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">节点名称</label>
              <p className="text-sm text-gray-600">WeiboKeywordSearchAst</p>
            </div>
            <div>
              <label className="text-sm font-medium">节点类型</label>
              <p className="text-sm text-gray-600">微博 API</p>
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <p className="text-sm text-gray-600">通过关键词搜索微博内容</p>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">关闭</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

export const Left: Story = {
  render: () => (
    <Drawer direction="left">
      <DrawerTrigger asChild>
        <Button>从左侧打开</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>导航菜单</DrawerTitle>
          <DrawerDescription>选择要访问的功能模块</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start">工作流编辑器</Button>
            <Button variant="ghost" className="w-full justify-start">数据采集</Button>
            <Button variant="ghost" className="w-full justify-start">舆情分析</Button>
            <Button variant="ghost" className="w-full justify-start">大屏展示</Button>
          </nav>
        </div>
      </DrawerContent>
    </Drawer>
  ),
}

export const Top: Story = {
  render: () => (
    <Drawer direction="top">
      <DrawerTrigger asChild>
        <Button>从顶部打开</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>系统通知</DrawerTitle>
          <DrawerDescription>查看最新的系统消息和更新</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="space-y-2">
            <div className="rounded border p-3 text-sm">工作流执行完成</div>
            <div className="rounded border p-3 text-sm">新增 128 条微博数据</div>
            <div className="rounded border p-3 text-sm">NLP 分析任务已完成</div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>创建事件</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>创建舆情事件</DrawerTitle>
          <DrawerDescription>填写事件基本信息</DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">事件标题</label>
              <input
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="输入事件标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium">关键词</label>
              <input
                type="text"
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                placeholder="输入关键词，用逗号分隔"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <textarea
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                rows={4}
                placeholder="输入事件描述"
              />
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>创建</Button>
          <DrawerClose asChild>
            <Button variant="outline">取消</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}

export const NoFooter: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>查看详情</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Agent 工具列表</DrawerTitle>
          <DrawerDescription>当前可用的 LangChain 工具</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 pb-8">
          <div className="space-y-2">
            <div className="rounded border p-3">
              <div className="font-medium text-sm">query_posts_tool</div>
              <div className="text-xs text-gray-600">查询微博帖子</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium text-sm">query_events_tool</div>
              <div className="text-xs text-gray-600">查询舆情事件</div>
            </div>
            <div className="rounded border p-3">
              <div className="font-medium text-sm">nlp_analyze_tool</div>
              <div className="text-xs text-gray-600">情感分析 + 关键词提取</div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  ),
}
