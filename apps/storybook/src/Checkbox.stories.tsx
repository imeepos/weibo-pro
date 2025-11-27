import type { Meta, StoryObj } from '@storybook/react'
import { Checkbox } from '@sker/ui/components/ui/checkbox'
import { useState } from 'react'

const meta = {
  title: '@sker/ui/ui/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  render: () => <Checkbox />,
}

export const Checked: Story = {
  args: {},
  render: () => <Checkbox defaultChecked />,
}

export const Disabled: Story = {
  args: {},
  render: () => (
    <div className="flex items-center gap-4">
      <Checkbox disabled />
      <Checkbox disabled checked />
    </div>
  ),
}

export const WithLabel: Story = {
  args: {},
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        接受服务条款和隐私政策
      </label>
    </div>
  ),
}

export const FormExample: Story = {
  args: {},
  render: () => {
    const FormWithCheckbox = () => {
      const [checked, setChecked] = useState(false)

      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="newsletter"
              checked={checked}
              onCheckedChange={(checked) => setChecked(checked as boolean)}
            />
            <label
              htmlFor="newsletter"
              className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              订阅舆情分析周报
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            状态: {checked ? '已订阅' : '未订阅'}
          </p>
        </div>
      )
    }

    return <FormWithCheckbox />
  },
}

export const MultipleOptions: Story = {
  args: {},
  render: () => {
    const items = [
      { id: 'weibo', label: '微博数据采集' },
      { id: 'nlp', label: 'NLP 情感分析' },
      { id: 'event', label: '舆情事件生成' },
      { id: 'report', label: '分析报告生成' },
    ]

    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">选择需要启用的功能模块：</p>
        {items.map((item) => (
          <div key={item.id} className="flex items-center space-x-2">
            <Checkbox id={item.id} defaultChecked />
            <label
              htmlFor={item.id}
              className="text-sm leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {item.label}
            </label>
          </div>
        ))}
      </div>
    )
  },
}

export const WorkflowSettings: Story = {
  args: {},
  render: () => {
    const WorkflowConfig = () => {
      const [config, setConfig] = useState({
        autoStart: true,
        errorRetry: false,
        saveCache: true,
        notification: false,
      })

      const handleChange = (key: keyof typeof config) => (checked: boolean) => {
        setConfig((prev) => ({ ...prev, [key]: checked }))
      }

      return (
        <div className="space-y-4 max-w-md">
          <h3 className="font-semibold text-foreground">工作流配置</h3>

          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="autoStart"
                checked={config.autoStart}
                onCheckedChange={(checked) => handleChange('autoStart')(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="autoStart"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  自动启动工作流
                </label>
                <p className="text-sm text-muted-foreground">
                  工作流创建后立即执行
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="errorRetry"
                checked={config.errorRetry}
                onCheckedChange={(checked) => handleChange('errorRetry')(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="errorRetry"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  失败自动重试
                </label>
                <p className="text-sm text-muted-foreground">
                  节点执行失败时自动重试 3 次
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="saveCache"
                checked={config.saveCache}
                onCheckedChange={(checked) => handleChange('saveCache')(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="saveCache"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  启用结果缓存
                </label>
                <p className="text-sm text-muted-foreground">
                  缓存节点执行结果，提升性能
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="notification"
                checked={config.notification}
                onCheckedChange={(checked) => handleChange('notification')(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="notification"
                  className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  完成时通知
                </label>
                <p className="text-sm text-muted-foreground">
                  工作流执行完成后发送通知
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <pre className="text-xs text-foreground bg-muted p-2 rounded">
              {JSON.stringify(config, null, 2)}
            </pre>
          </div>
        </div>
      )
    }

    return <WorkflowConfig />
  },
}

export const InvalidState: Story = {
  args: {},
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="invalid" aria-invalid />
      <label
        htmlFor="invalid"
        className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        必须同意此选项（错误状态）
      </label>
    </div>
  ),
}
