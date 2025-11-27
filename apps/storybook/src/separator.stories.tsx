import type { Meta, StoryObj } from "@storybook/react"
import { Separator } from "@sker/ui/components/ui/separator"

const meta: Meta<typeof Separator> = {
  title: "@sker/ui/ui/Separator",
  component: Separator,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  render: () => (
    <div className="w-full max-w-md">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">标题</h4>
        <p className="text-muted-foreground text-sm">这是一段描述文本</p>
      </div>
      <Separator className="my-4" />
      <div className="space-y-1">
        <h4 className="text-sm font-medium">另一个标题</h4>
        <p className="text-muted-foreground text-sm">这是另一段描述文本</p>
      </div>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="flex h-20 items-center gap-4">
      <div className="text-sm">左侧内容</div>
      <Separator orientation="vertical" />
      <div className="text-sm">中间内容</div>
      <Separator orientation="vertical" />
      <div className="text-sm">右侧内容</div>
    </div>
  ),
}

export const InList: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-2">
      <div className="p-2">项目 1</div>
      <Separator />
      <div className="p-2">项目 2</div>
      <Separator />
      <div className="p-2">项目 3</div>
      <Separator />
      <div className="p-2">项目 4</div>
    </div>
  ),
}

export const InCard: Story = {
  render: () => (
    <div className="w-full max-w-md rounded-lg border p-6">
      <h3 className="text-lg font-semibold">卡片标题</h3>
      <p className="text-muted-foreground text-sm">卡片副标题</p>
      <Separator className="my-4" />
      <div className="space-y-2">
        <p className="text-sm">卡片内容区域</p>
        <p className="text-muted-foreground text-sm">更多详细信息</p>
      </div>
    </div>
  ),
}
