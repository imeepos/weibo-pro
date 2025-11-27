import type { Meta, StoryObj } from "@storybook/react"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@sker/ui/components/ui/hover-card"

const meta: Meta<typeof HoverCard> = {
  title: "UI/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof HoverCard>

export const Default: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger className="cursor-pointer underline">
        悬停查看详情
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">悬停卡片</h4>
          <p className="text-sm text-muted-foreground">
            这是悬停卡片的内容区域
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}

export const UserProfile: Story = {
  render: () => (
    <HoverCard>
      <HoverCardTrigger className="cursor-pointer font-medium">
        @username
      </HoverCardTrigger>
      <HoverCardContent>
        <div className="flex gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">用户名</h4>
            <p className="text-sm text-muted-foreground">前端开发工程师</p>
            <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
              <span>关注 123</span>
              <span>粉丝 456</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
}

export const WithAlign: Story = {
  render: () => (
    <div className="flex gap-8">
      <HoverCard>
        <HoverCardTrigger className="cursor-pointer underline">
          左对齐
        </HoverCardTrigger>
        <HoverCardContent align="start">
          <p className="text-sm">左对齐的悬停卡片</p>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger className="cursor-pointer underline">
          居中对齐
        </HoverCardTrigger>
        <HoverCardContent align="center">
          <p className="text-sm">居中对齐的悬停卡片</p>
        </HoverCardContent>
      </HoverCard>

      <HoverCard>
        <HoverCardTrigger className="cursor-pointer underline">
          右对齐
        </HoverCardTrigger>
        <HoverCardContent align="end">
          <p className="text-sm">右对齐的悬停卡片</p>
        </HoverCardContent>
      </HoverCard>
    </div>
  ),
}
