import type { Meta, StoryObj } from "@storybook/react"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "@sker/ui/components/ui/field"
import { Input } from "@sker/ui/components/ui/input"
import { Checkbox } from "@sker/ui/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@sker/ui/components/ui/radio-group"

const meta: Meta = {
  title: "@sker/ui/ui/Field",
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel>用户名</FieldLabel>
      <Input placeholder="请输入用户名" />
    </Field>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <Field>
      <FieldLabel>邮箱地址</FieldLabel>
      <Input type="email" placeholder="example@email.com" />
      <FieldDescription>我们不会分享您的邮箱</FieldDescription>
    </Field>
  ),
}

export const WithError: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel>密码</FieldLabel>
      <Input type="password" />
      <FieldError>密码至少需要8个字符</FieldError>
    </Field>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <FieldLabel>通知</FieldLabel>
      <FieldContent>
        <Checkbox />
        <FieldDescription>接收邮件通知</FieldDescription>
      </FieldContent>
    </Field>
  ),
}

export const WithFieldSet: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>个人信息</FieldLegend>
      <Field>
        <FieldLabel>姓名</FieldLabel>
        <Input />
      </Field>
      <Field>
        <FieldLabel>邮箱</FieldLabel>
        <Input type="email" />
      </Field>
    </FieldSet>
  ),
}

export const WithFieldGroup: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel>名</FieldLabel>
        <Input />
      </Field>
      <Field>
        <FieldLabel>姓</FieldLabel>
        <Input />
      </Field>
    </FieldGroup>
  ),
}

export const WithSeparator: Story = {
  render: () => (
    <FieldGroup>
      <Field>
        <FieldLabel>账户设置</FieldLabel>
        <Input />
      </Field>
      <FieldSeparator>或</FieldSeparator>
      <Field>
        <FieldLabel>其他选项</FieldLabel>
        <Input />
      </Field>
    </FieldGroup>
  ),
}

export const WithRadioGroup: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend variant="label">选择主题</FieldLegend>
      <RadioGroup defaultValue="light">
        <Field orientation="horizontal">
          <FieldLabel>
            <RadioGroupItem value="light" />
            <FieldTitle>浅色</FieldTitle>
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <FieldLabel>
            <RadioGroupItem value="dark" />
            <FieldTitle>深色</FieldTitle>
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <FieldLabel>
            <RadioGroupItem value="system" />
            <FieldTitle>跟随系统</FieldTitle>
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  ),
}
