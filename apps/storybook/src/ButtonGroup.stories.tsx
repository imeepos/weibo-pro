import type { Meta, StoryObj } from '@storybook/react'
import {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  Button,
} from '@sker/ui'
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

const meta = {
  title: '@sker/ui/ButtonGroup',
  component: ButtonGroup,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">左</Button>
      <Button variant="outline">中</Button>
      <Button variant="outline">右</Button>
    </ButtonGroup>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <Bold />
      </Button>
      <Button variant="outline" size="icon">
        <Italic />
      </Button>
      <Button variant="outline" size="icon">
        <Underline />
      </Button>
    </ButtonGroup>
  ),
}

export const WithSeparator: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline" size="icon">
        <AlignLeft />
      </Button>
      <Button variant="outline" size="icon">
        <AlignCenter />
      </Button>
      <Button variant="outline" size="icon">
        <AlignRight />
      </Button>
    </ButtonGroup>
  ),
}

export const WithText: Story = {
  render: () => (
    <ButtonGroup>
      <ButtonGroupText>排序</ButtonGroupText>
      <Button variant="outline">升序</Button>
      <Button variant="outline">降序</Button>
    </ButtonGroup>
  ),
}

export const Vertical: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">选项 1</Button>
      <Button variant="outline">选项 2</Button>
      <Button variant="outline">选项 3</Button>
    </ButtonGroup>
  ),
}

export const VerticalWithSeparator: Story = {
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">编辑</Button>
      <Button variant="outline">复制</Button>
      <ButtonGroupSeparator orientation="horizontal" />
      <Button variant="outline">删除</Button>
    </ButtonGroup>
  ),
}

export const Mixed: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="outline">保存</Button>
      <ButtonGroupSeparator />
      <Button variant="outline" size="icon">
        <Bold />
      </Button>
      <Button variant="outline" size="icon">
        <Italic />
      </Button>
      <ButtonGroupSeparator />
      <ButtonGroupText>格式</ButtonGroupText>
    </ButtonGroup>
  ),
}
