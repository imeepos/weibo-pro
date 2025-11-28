import type { Meta, StoryObj } from "@storybook/react"
import { Kbd, KbdGroup } from "@sker/ui/components/ui/kbd"

const meta: Meta<typeof Kbd> = {
  title: "UI/Kbd",
  component: Kbd,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Kbd>

export const Default: Story = {
  render: () => <Kbd>⌘</Kbd>,
}

export const Text: Story = {
  render: () => <Kbd>Ctrl</Kbd>,
}

export const Multiple: Story = {
  render: () => (
    <div className="flex gap-2">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </div>
  ),
}

export const WithKbdGroup: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
}

export const CommonShortcuts: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm">复制:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>C</Kbd>
        </KbdGroup>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">粘贴:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>V</Kbd>
        </KbdGroup>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm">保存:</span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>S</Kbd>
        </KbdGroup>
      </div>
    </div>
  ),
}

export const LongKeys: Story = {
  render: () => (
    <div className="flex gap-2">
      <Kbd>Shift</Kbd>
      <Kbd>Enter</Kbd>
      <Kbd>Escape</Kbd>
    </div>
  ),
}
