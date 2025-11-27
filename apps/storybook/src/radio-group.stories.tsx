import type { Meta, StoryObj } from "@storybook/react"
import { RadioGroup, RadioGroupItem } from "@sker/ui/components/ui/radio-group"
import { Label } from "@sker/ui/components/ui/label"

const meta: Meta<typeof RadioGroup> = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof RadioGroup>

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="option1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option1" id="option1" />
        <Label htmlFor="option1">选项 1</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option2" id="option2" />
        <Label htmlFor="option2">选项 2</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option3" id="option3" />
        <Label htmlFor="option3">选项 3</Label>
      </div>
    </RadioGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="option1">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option1" id="d1" />
        <Label htmlFor="d1">可选</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="option2" id="d2" disabled />
        <Label htmlFor="d2">禁用</Label>
      </div>
    </RadioGroup>
  ),
}

export const WithDescriptions: Story = {
  render: () => (
    <RadioGroup defaultValue="free">
      <div className="flex items-start gap-2">
        <RadioGroupItem value="free" id="free" className="mt-1" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="free">免费版</Label>
          <p className="text-muted-foreground text-sm">基础功能，适合个人使用</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <RadioGroupItem value="pro" id="pro" className="mt-1" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="pro">专业版</Label>
          <p className="text-muted-foreground text-sm">高级功能，适合团队协作</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <RadioGroupItem value="enterprise" id="enterprise" className="mt-1" />
        <div className="flex flex-col gap-1">
          <Label htmlFor="enterprise">企业版</Label>
          <p className="text-muted-foreground text-sm">完整功能，企业级支持</p>
        </div>
      </div>
    </RadioGroup>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="small" className="flex gap-4">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="small" id="small" />
        <Label htmlFor="small">小</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="medium" id="medium" />
        <Label htmlFor="medium">中</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="large" id="large" />
        <Label htmlFor="large">大</Label>
      </div>
    </RadioGroup>
  ),
}
