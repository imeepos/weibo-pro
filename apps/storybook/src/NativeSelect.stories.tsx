import type { Meta, StoryObj } from '@storybook/react'
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from '@sker/ui/components/ui/native-select'

const meta = {
  title: '@sker/ui/ui/NativeSelect',
  component: NativeSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NativeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <NativeSelect>
      <NativeSelectOption value="">请选择</NativeSelectOption>
      <NativeSelectOption value="1">选项 1</NativeSelectOption>
      <NativeSelectOption value="2">选项 2</NativeSelectOption>
      <NativeSelectOption value="3">选项 3</NativeSelectOption>
    </NativeSelect>
  ),
}

export const WithOptGroup: Story = {
  render: () => (
    <NativeSelect>
      <NativeSelectOption value="">请选择城市</NativeSelectOption>
      <NativeSelectOptGroup label="华北">
        <NativeSelectOption value="beijing">北京</NativeSelectOption>
        <NativeSelectOption value="tianjin">天津</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="华东">
        <NativeSelectOption value="shanghai">上海</NativeSelectOption>
        <NativeSelectOption value="hangzhou">杭州</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
}

export const Disabled: Story = {
  render: () => (
    <NativeSelect disabled>
      <NativeSelectOption value="">请选择</NativeSelectOption>
      <NativeSelectOption value="1">选项 1</NativeSelectOption>
      <NativeSelectOption value="2">选项 2</NativeSelectOption>
    </NativeSelect>
  ),
}

export const WithDefaultValue: Story = {
  render: () => (
    <NativeSelect defaultValue="2">
      <NativeSelectOption value="1">选项 1</NativeSelectOption>
      <NativeSelectOption value="2">选项 2</NativeSelectOption>
      <NativeSelectOption value="3">选项 3</NativeSelectOption>
    </NativeSelect>
  ),
}
