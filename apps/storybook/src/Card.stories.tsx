import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@sker/ui/components/ui/card'
import { Button } from '@sker/ui/components/ui/button'
const meta = {
  title: '@sker/ui/ui/Card',
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

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent>
        <p>仅内容区域的简洁卡片。</p>
      </CardContent>
    </Card>
  ),
}

export const NoDescription: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>简洁标题</CardTitle>
      </CardHeader>
      <CardContent>
        <p>无描述信息的卡片。</p>
      </CardContent>
    </Card>
  ),
}

export const Complete: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>完整卡片</CardTitle>
        <CardDescription>包含所有组件</CardDescription>
        <CardAction>
          <Button size="sm" variant="ghost">
            操作
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>展示所有卡片组件的组合效果。</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline">取消</Button>
        <Button>确认</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithBorders: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader className="border-b">
        <CardTitle>带分隔线</CardTitle>
        <CardDescription>Header 底部边框</CardDescription>
      </CardHeader>
      <CardContent>
        <p>内容区域</p>
      </CardContent>
      <CardFooter className="border-t gap-2">
        <Button>操作</Button>
      </CardFooter>
    </Card>
  ),
}
