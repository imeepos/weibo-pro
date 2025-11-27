import type { Meta, StoryObj } from '@storybook/react'
import { Avatar, AvatarImage, AvatarFallback } from '@sker/ui/components/ui/avatar'

const meta = {
  title: '@sker/ui/ui/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="头像" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
}

export const WithFallback: Story = {
  args: {},
  render: () => (
    <Avatar>
      <AvatarImage src="https://invalid-url.png" alt="头像" />
      <AvatarFallback>用户</AvatarFallback>
    </Avatar>
  ),
}

export const FallbackOnly: Story = {
  args: {},
  render: () => (
    <Avatar>
      <AvatarFallback>张三</AvatarFallback>
    </Avatar>
  ),
}

export const Small: Story = {
  args: {},
  render: () => (
    <Avatar className="size-6">
      <AvatarImage src="https://github.com/shadcn.png" alt="头像" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
}

export const Large: Story = {
  args: {},
  render: () => (
    <Avatar className="size-16">
      <AvatarImage src="https://github.com/shadcn.png" alt="头像" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
}

export const Square: Story = {
  args: {},
  render: () => (
    <Avatar className="rounded-md">
      <AvatarImage src="https://github.com/shadcn.png" alt="头像" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
}

export const CustomFallbackStyle: Story = {
  args: {},
  render: () => (
    <Avatar>
      <AvatarImage src="https://invalid-url.png" alt="头像" />
      <AvatarFallback className="bg-blue-500 text-white">AB</AvatarFallback>
    </Avatar>
  ),
}

export const AvatarGroup: Story = {
  args: {},
  render: () => (
    <div className="flex -space-x-4">
      <Avatar className="border-2 border-white">
        <AvatarImage src="https://github.com/shadcn.png" alt="用户1" />
        <AvatarFallback>U1</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-white">
        <AvatarImage src="https://github.com/vercel.png" alt="用户2" />
        <AvatarFallback>U2</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-white">
        <AvatarImage src="https://github.com/react.png" alt="用户3" />
        <AvatarFallback>U3</AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-white">
        <AvatarFallback>+5</AvatarFallback>
      </Avatar>
    </div>
  ),
}

export const DifferentSizes: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="size-6">
        <AvatarImage src="https://github.com/shadcn.png" alt="小" />
        <AvatarFallback>小</AvatarFallback>
      </Avatar>
      <Avatar className="size-8">
        <AvatarImage src="https://github.com/shadcn.png" alt="默认" />
        <AvatarFallback>默认</AvatarFallback>
      </Avatar>
      <Avatar className="size-12">
        <AvatarImage src="https://github.com/shadcn.png" alt="中" />
        <AvatarFallback>中</AvatarFallback>
      </Avatar>
      <Avatar className="size-16">
        <AvatarImage src="https://github.com/shadcn.png" alt="大" />
        <AvatarFallback>大</AvatarFallback>
      </Avatar>
    </div>
  ),
}
