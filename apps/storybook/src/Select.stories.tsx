import type { Meta, StoryObj } from '@storybook/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@sker/ui/components/ui/select'

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">选项 1</SelectItem>
        <SelectItem value="2">选项 2</SelectItem>
        <SelectItem value="3">选项 3</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="选择城市" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>华北</SelectLabel>
          <SelectItem value="beijing">北京</SelectItem>
          <SelectItem value="tianjin">天津</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>华东</SelectLabel>
          <SelectItem value="shanghai">上海</SelectItem>
          <SelectItem value="hangzhou">杭州</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
}

export const Small: Story = {
  render: () => (
    <Select>
      <SelectTrigger size="sm">
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">选项 1</SelectItem>
        <SelectItem value="2">选项 2</SelectItem>
        <SelectItem value="3">选项 3</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger>
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">选项 1</SelectItem>
        <SelectItem value="2">选项 2</SelectItem>
      </SelectContent>
    </Select>
  ),
}

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="2">
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">选项 1</SelectItem>
        <SelectItem value="2">选项 2</SelectItem>
        <SelectItem value="3">选项 3</SelectItem>
      </SelectContent>
    </Select>
  ),
}
