import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from '@sker/ui/components/ui/input-group'
import { Search, X, Send, AtSign, Hash, DollarSign } from 'lucide-react'

const meta = {
  title: 'UI/InputGroup',
  component: InputGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<ReactRenderer>

export const WithIcon: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="搜索微博关键词" />
    </InputGroup>
  ),
}

export const WithButton: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput placeholder="输入关键词" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <Search />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithClearButton: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="搜索舆情事件" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <X />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithText: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="weibo.com" />
    </InputGroup>
  ),
}

export const WithPrefix: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <AtSign />
      </InputGroupAddon>
      <InputGroupInput placeholder="用户名" />
    </InputGroup>
  ),
}

export const WithSuffix: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupInput placeholder="输入金额" type="number" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>元</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithSendButton: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupInput placeholder="输入消息" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="sm">
          <Send />
          发送
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithTextarea: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupTextarea placeholder="输入事件描述" rows={4} />
      <InputGroupAddon align="block-end">
        <InputGroupButton size="sm">
          <Send />
          提交
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const WithTopLabel: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon align="block-start">
        <InputGroupText>关键词</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="输入搜索关键词" />
    </InputGroup>
  ),
}

export const MultipleAddons: Story = {
  render: () => (
    <InputGroup className="w-96">
      <InputGroupAddon>
        <Hash />
      </InputGroupAddon>
      <InputGroupInput placeholder="事件标签" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs">
          <X />
        </InputGroupButton>
        <InputGroupButton size="sm">添加</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
}

export const Disabled: Story = {
  render: () => (
    <InputGroup className="w-80" data-disabled="true">
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput placeholder="已禁用" disabled />
    </InputGroup>
  ),
}

export const Invalid: Story = {
  render: () => (
    <InputGroup className="w-80">
      <InputGroupAddon>
        <DollarSign />
      </InputGroupAddon>
      <InputGroupInput placeholder="输入金额" aria-invalid="true" />
    </InputGroup>
  ),
}
