import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
  Button,
} from '@sker/ui'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>卡片标题</CardTitle>
        <CardDescription>卡片描述信息</CardDescription>
      </CardHeader>
      <CardContent>
        <p>这是卡片的主要内容区域。</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>确认操作</CardTitle>
        <CardDescription>此操作不可撤销</CardDescription>
      </CardHeader>
      <CardContent>
        <p>您确定要继续吗?</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">取消</Button>
        <Button>确认</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithAction: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>通知</CardTitle>
        <CardDescription>您有新的消息</CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            查看
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>系统检测到 3 条新通知。</p>
      </CardContent>
    </Card>
  ),
}
