import type { Meta, StoryObj } from '@storybook/react'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@sker/ui/components/ui/command'
import { Calendar, Settings, User, CreditCard, Smile } from 'lucide-react'
import { useState } from 'react'

const meta = {
  title: '@sker/ui/ui/Command',
  component: Command,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="搜索命令..." />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        <CommandGroup heading="建议">
          <CommandItem>
            <Calendar />
            日历
          </CommandItem>
          <CommandItem>
            <Smile />
            表情
          </CommandItem>
          <CommandItem>
            <Settings />
            设置
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const WithShortcuts: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="搜索命令..." />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        <CommandGroup heading="建议">
          <CommandItem>
            <Calendar />
            日历
            <CommandShortcut>⌘K</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <User />
            个人资料
            <CommandShortcut>⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Settings />
            设置
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const WithGroups: Story = {
  render: () => (
    <Command className="rounded-lg border shadow-md w-[450px]">
      <CommandInput placeholder="搜索命令..." />
      <CommandList>
        <CommandEmpty>未找到结果</CommandEmpty>
        <CommandGroup heading="用户">
          <CommandItem>
            <User />
            个人资料
          </CommandItem>
          <CommandItem>
            <CreditCard />
            账单
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="设置">
          <CommandItem>
            <Settings />
            通用设置
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}

export const Dialog: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          打开命令面板
        </button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          <CommandInput placeholder="搜索命令..." />
          <CommandList>
            <CommandEmpty>未找到结果</CommandEmpty>
            <CommandGroup heading="建议">
              <CommandItem>
                <Calendar />
                日历
              </CommandItem>
              <CommandItem>
                <User />
                个人资料
              </CommandItem>
              <CommandItem>
                <Settings />
                设置
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </>
    )
  },
}
