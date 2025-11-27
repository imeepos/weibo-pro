import type { Meta, StoryObj } from "@storybook/react"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "@sker/ui/components/ui/context-menu"

const meta: Meta<typeof ContextMenu> = {
  title: "@sker/ui/ui/ContextMenu",
  component: ContextMenu,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof ContextMenu>

export const Default: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键点击此处
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>返回</ContextMenuItem>
        <ContextMenuItem>前进</ContextMenuItem>
        <ContextMenuItem>刷新</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>保存</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

export const WithShortcuts: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键查看快捷键
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>
          复制 <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          粘贴 <ContextMenuShortcut>⌘V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem>
          剪切 <ContextMenuShortcut>⌘X</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

export const WithCheckbox: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键查看选项
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem checked>显示书签栏</ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem>显示全屏</ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked>开发者工具</ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

export const WithRadio: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键选择主题
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>主题</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="light">
          <ContextMenuRadioItem value="light">浅色</ContextMenuRadioItem>
          <ContextMenuRadioItem value="dark">深色</ContextMenuRadioItem>
          <ContextMenuRadioItem value="system">跟随系统</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

export const WithSubmenu: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键查看子菜单
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>新建文件</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>更多工具</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>清除缓存</ContextMenuItem>
            <ContextMenuItem>清除 Cookie</ContextMenuItem>
            <ContextMenuItem>清除历史记录</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem>退出</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}

export const Destructive: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm">
        右键查看危险操作
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>编辑</ContextMenuItem>
        <ContextMenuItem>复制</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">删除</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
}
