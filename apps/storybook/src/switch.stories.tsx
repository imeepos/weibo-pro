import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Switch } from "@sker/ui/components/ui/switch"
import { Label } from "@sker/ui/components/ui/label"

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Switch>

export const Default: Story = {
  render: () => <Switch />,
}

export const Checked: Story = {
  render: () => <Switch defaultChecked />,
}

export const Disabled: Story = {
  render: () => (
    <div className="flex gap-4">
      <Switch disabled />
      <Switch disabled defaultChecked />
    </div>
  ),
}

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">飞行模式</Label>
    </div>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch id="controlled" checked={checked} onCheckedChange={setChecked} />
          <Label htmlFor="controlled">通知</Label>
        </div>
        <div className="text-sm text-muted-foreground">
          状态: {checked ? "开启" : "关闭"}
        </div>
      </div>
    )
  },
}

export const MultipleSettings: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="s1">推送通知</Label>
        <Switch id="s1" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s2">邮件通知</Label>
        <Switch id="s2" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="s3">短信通知</Label>
        <Switch id="s3" />
      </div>
    </div>
  ),
}
