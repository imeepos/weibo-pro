import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@sker/ui/components/ui/dialog"

const meta: Meta<typeof Dialog> = {
  title: "@sker/ui/ui/Dialog",
  component: Dialog,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Dialog>

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        打开对话框
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>对话框标题</DialogTitle>
          <DialogDescription>这是对话框的描述内容</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        打开对话框
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认操作</DialogTitle>
          <DialogDescription>此操作无法撤销，确定要继续吗？</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button className="rounded-md border px-4 py-2">取消</button>
          <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            确认
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
          打开受控对话框
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>受控对话框</DialogTitle>
            <DialogDescription>这是一个受控的对话框示例</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              关闭
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  },
}

export const WithoutCloseButton: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
        无关闭按钮
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>无关闭按钮</DialogTitle>
          <DialogDescription>此对话框没有右上角的关闭按钮</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
}
