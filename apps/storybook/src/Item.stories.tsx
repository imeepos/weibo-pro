import type { Meta, StoryObj } from '@storybook/react'
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from '@sker/ui/components/ui/item'
import { Button } from '@sker/ui/components/ui/button'
import { User, Mail, Settings, MoreVertical } from 'lucide-react'

const meta = {
  title: 'UI/Item',
  component: Item,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Item className="w-[400px]">
      <ItemMedia variant="icon">
        <User />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>用户设置</ItemTitle>
        <ItemDescription>管理您的账户信息和偏好设置</ItemDescription>
      </ItemContent>
    </Item>
  ),
}

export const WithActions: Story = {
  render: () => (
    <Item className="w-[400px]">
      <ItemMedia variant="icon">
        <Mail />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>新邮件</ItemTitle>
        <ItemDescription>您有3封未读邮件</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button size="sm">查看</Button>
      </ItemActions>
    </Item>
  ),
}

export const Outline: Story = {
  render: () => (
    <Item variant="outline" className="w-[400px]">
      <ItemMedia variant="icon">
        <Settings />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>系统设置</ItemTitle>
        <ItemDescription>配置系统参数和功能选项</ItemDescription>
      </ItemContent>
    </Item>
  ),
}

export const Muted: Story = {
  render: () => (
    <Item variant="muted" className="w-[400px]">
      <ItemMedia variant="icon">
        <User />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>个人资料</ItemTitle>
        <ItemDescription>编辑您的个人信息</ItemDescription>
      </ItemContent>
    </Item>
  ),
}

export const Small: Story = {
  render: () => (
    <Item size="sm" className="w-[400px]">
      <ItemMedia variant="icon">
        <Mail />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>消息通知</ItemTitle>
      </ItemContent>
    </Item>
  ),
}

export const WithImage: Story = {
  render: () => (
    <Item className="w-[400px]">
      <ItemMedia variant="image">
        <img src="https://via.placeholder.com/40" alt="头像" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>张三</ItemTitle>
        <ItemDescription>前端工程师</ItemDescription>
      </ItemContent>
    </Item>
  ),
}

export const Group: Story = {
  render: () => (
    <ItemGroup className="w-[400px]">
      <Item>
        <ItemMedia variant="icon">
          <User />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>个人资料</ItemTitle>
          <ItemDescription>管理您的个人信息</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Settings />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>系统设置</ItemTitle>
          <ItemDescription>配置系统参数</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical />
          </Button>
        </ItemActions>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemMedia variant="icon">
          <Mail />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>消息中心</ItemTitle>
          <ItemDescription>查看所有通知</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button variant="ghost" size="icon-sm">
            <MoreVertical />
          </Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
}
