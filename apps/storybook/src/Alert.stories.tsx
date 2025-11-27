import type { Meta, StoryObj } from '@storybook/react'
import { Alert, AlertTitle, AlertDescription } from '@sker/ui/components/ui/alert'
import { Terminal, AlertCircle, CheckCircle2, Info } from 'lucide-react'

const meta = {
  title: 'UI/Alert',
  component: Alert,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => (
    <Alert>
      <Terminal />
      <AlertTitle>温馨提示</AlertTitle>
      <AlertDescription>
        这是一个默认样式的提示框，用于向用户传达一般性信息。
      </AlertDescription>
    </Alert>
  ),
}

export const Destructive: Story = {
  args: {},
  render: () => (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>错误</AlertTitle>
      <AlertDescription>
        操作失败，请检查输入信息后重试。
      </AlertDescription>
    </Alert>
  ),
}

export const WithoutIcon: Story = {
  args: {},
  render: () => (
    <Alert>
      <AlertTitle>无图标提示</AlertTitle>
      <AlertDescription>
        提示框可以不带图标使用，内容会自动调整布局。
      </AlertDescription>
    </Alert>
  ),
}

export const TitleOnly: Story = {
  args: {},
  render: () => (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>操作成功</AlertTitle>
    </Alert>
  ),
}

export const DescriptionOnly: Story = {
  args: {},
  render: () => (
    <Alert>
      <Info />
      <AlertDescription>
        这是一个仅包含描述的提示，没有标题。
      </AlertDescription>
    </Alert>
  ),
}

export const InfoMessage: Story = {
  args: {},
  render: () => (
    <Alert>
      <Info />
      <AlertTitle>系统维护通知</AlertTitle>
      <AlertDescription>
        系统将于今晚 23:00 - 02:00 进行维护升级，期间服务可能短暂中断。
      </AlertDescription>
    </Alert>
  ),
}

export const SuccessMessage: Story = {
  args: {},
  render: () => (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>数据同步完成</AlertTitle>
      <AlertDescription>
        已成功同步 1,234 条微博数据，NLP 分析任务已进入队列。
      </AlertDescription>
    </Alert>
  ),
}

export const MultipleAlerts: Story = {
  args: {},
  render: () => (
    <div className="space-y-4">
      <Alert>
        <Info />
        <AlertTitle>信息</AlertTitle>
        <AlertDescription>工作流正在运行中...</AlertDescription>
      </Alert>
      <Alert>
        <CheckCircle2 />
        <AlertTitle>成功</AlertTitle>
        <AlertDescription>数据采集任务已完成</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>错误</AlertTitle>
        <AlertDescription>API 调用失败，请检查网络连接</AlertDescription>
      </Alert>
    </div>
  ),
}

export const LongContent: Story = {
  args: {},
  render: () => (
    <Alert>
      <Terminal />
      <AlertTitle>工作流执行报告</AlertTitle>
      <AlertDescription>
        <p>本次工作流共执行 8 个节点，耗时 2 分 34 秒。</p>
        <p>采集微博数据 456 条，完成 NLP 分析 423 条，创建舆情事件 12 个。</p>
        <p>详细信息请查看执行日志。</p>
      </AlertDescription>
    </Alert>
  ),
}

export const CustomStyling: Story = {
  args: {},
  render: () => (
    <Alert className="border-blue-500 bg-blue-50">
      <Info className="text-blue-600" />
      <AlertTitle className="text-blue-900">自定义样式</AlertTitle>
      <AlertDescription className="text-blue-700">
        可以通过 className 自定义提示框的颜色和样式。
      </AlertDescription>
    </Alert>
  ),
}
