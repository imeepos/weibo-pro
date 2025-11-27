import type { Meta, StoryObj } from "@storybook/react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@sker/ui/components/ui/sheet"

const meta: Meta<typeof Sheet> = {
  title: "UI/Sheet",
  component: Sheet,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Sheet>

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        从右侧打开
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>侧边栏标题</SheetTitle>
          <SheetDescription>这是从右侧滑出的侧边栏</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <p className="text-sm">侧边栏内容区域</p>
        </div>
      </SheetContent>
    </Sheet>
  ),
}

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        从左侧打开
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>左侧菜单</SheetTitle>
          <SheetDescription>这是从左侧滑出的侧边栏</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}

export const Top: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        从顶部打开
      </SheetTrigger>
      <SheetContent side="top">
        <SheetHeader>
          <SheetTitle>顶部通知</SheetTitle>
          <SheetDescription>这是从顶部滑出的面板</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}

export const Bottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        从底部打开
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>底部面板</SheetTitle>
          <SheetDescription>这是从底部滑出的面板</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        带页脚
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>确认操作</SheetTitle>
          <SheetDescription>请确认是否继续此操作</SheetDescription>
        </SheetHeader>
        <div className="flex-1 py-4">
          <p className="text-sm">操作详情内容</p>
        </div>
        <SheetFooter>
          <button className="rounded-md border px-4 py-2">取消</button>
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            确认
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}
