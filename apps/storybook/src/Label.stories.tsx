import type { Meta, StoryObj } from "@storybook/react"
import { Label } from "@sker/ui/components/ui/label"

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Label>

export const Default: Story = {
  render: () => <Label>标签文本</Label>,
}

export const WithInput: Story = {
  render: () => (
    <div className="space-y-2">
      <Label htmlFor="email">邮箱地址</Label>
      <input
        id="email"
        type="email"
        placeholder="输入邮箱"
        className="w-full rounded-md border px-3 py-2"
      />
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="group" data-disabled="true">
      <Label>禁用标签</Label>
    </div>
  ),
}
