import type { Meta, StoryObj } from "@storybook/react"
import { Textarea } from "@sker/ui/components/ui/textarea"

const meta: Meta<typeof Textarea> = {
  title: "@sker/ui/ui/Textarea",
  component: Textarea,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Textarea>

export const Default: Story = {
  render: () => <Textarea placeholder="输入内容..." />,
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <label className="text-sm font-medium">评论</label>
      <Textarea placeholder="请输入您的评论..." />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => <Textarea placeholder="禁用状态" disabled />,
}

export const Invalid: Story = {
  render: () => <Textarea placeholder="错误状态" aria-invalid />,
}
