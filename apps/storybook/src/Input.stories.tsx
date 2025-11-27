import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Input } from '@sker/ui/components/ui/input'

const meta = {
  title: '@sker/ui/ui/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<ReactRenderer>

export const Default: Story = {
  render: () => <Input placeholder="输入关键词" className="w-80" />,
}

export const WithValue: Story = {
  render: () => <Input value="微博舆情分析" className="w-80" readOnly />,
}

export const Email: Story = {
  render: () => <Input type="email" placeholder="user@example.com" className="w-80" />,
}

export const Password: Story = {
  render: () => <Input type="password" placeholder="输入密码" className="w-80" />,
}

export const Number: Story = {
  render: () => <Input type="number" placeholder="输入数量" className="w-80" />,
}

export const Search: Story = {
  render: () => <Input type="search" placeholder="搜索事件" className="w-80" />,
}

export const Date: Story = {
  render: () => <Input type="date" className="w-80" />,
}

export const File: Story = {
  render: () => <Input type="file" className="w-80" />,
}

export const Disabled: Story = {
  render: () => <Input placeholder="已禁用" disabled className="w-80" />,
}

export const Invalid: Story = {
  render: () => <Input placeholder="错误状态" aria-invalid="true" className="w-80" />,
}

export const WithLabel: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <label className="text-sm font-medium">关键词</label>
      <Input placeholder="输入搜索关键词" />
    </div>
  ),
}

export const WithHelperText: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Input placeholder="输入事件标题" />
      <p className="text-xs text-gray-600">标题将用于事件列表展示</p>
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Input placeholder="输入关键词" aria-invalid="true" />
      <p className="text-xs text-red-600">关键词不能为空</p>
    </div>
  ),
}
