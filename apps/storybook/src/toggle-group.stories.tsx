import type { Meta, StoryObj } from "@storybook/react"
import { ToggleGroup, ToggleGroupItem } from "@sker/ui/components/ui/toggle-group"
import { BoldIcon, ItalicIcon, UnderlineIcon } from "lucide-react"

const meta: Meta<typeof ToggleGroup> = {
  title: "@sker/ui/ui/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ToggleGroup>

export const Default: Story = {
  render: () => (
    <ToggleGroup type="single">
      <ToggleGroupItem value="left">左对齐</ToggleGroupItem>
      <ToggleGroupItem value="center">居中</ToggleGroupItem>
      <ToggleGroupItem value="right">右对齐</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Multiple: Story = {
  render: () => (
    <ToggleGroup type="multiple">
      <ToggleGroupItem value="bold">
        <BoldIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic">
        <ItalicIcon className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Outline: Story = {
  render: () => (
    <ToggleGroup type="single" variant="outline">
      <ToggleGroupItem value="small">小</ToggleGroupItem>
      <ToggleGroupItem value="medium">中</ToggleGroupItem>
      <ToggleGroupItem value="large">大</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const WithSpacing: Story = {
  render: () => (
    <ToggleGroup type="single" spacing={2}>
      <ToggleGroupItem value="day">日</ToggleGroupItem>
      <ToggleGroupItem value="week">周</ToggleGroupItem>
      <ToggleGroupItem value="month">月</ToggleGroupItem>
      <ToggleGroupItem value="year">年</ToggleGroupItem>
    </ToggleGroup>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <ToggleGroup type="single" size="sm">
        <ToggleGroupItem value="1">小</ToggleGroupItem>
        <ToggleGroupItem value="2">小</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="default">
        <ToggleGroupItem value="1">默认</ToggleGroupItem>
        <ToggleGroupItem value="2">默认</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="lg">
        <ToggleGroupItem value="1">大</ToggleGroupItem>
        <ToggleGroupItem value="2">大</ToggleGroupItem>
      </ToggleGroup>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <ToggleGroup type="single">
      <ToggleGroupItem value="1">可用</ToggleGroupItem>
      <ToggleGroupItem value="2" disabled>
        禁用
      </ToggleGroupItem>
      <ToggleGroupItem value="3">可用</ToggleGroupItem>
    </ToggleGroup>
  ),
}
