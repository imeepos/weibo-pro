import type { Meta, StoryObj } from '@storybook/react'
import type { ReactRenderer } from '@storybook/react'
import { Toaster } from '@sker/ui/components/ui/sonner'
import { Button } from '@sker/ui/components/ui/button'
import { toast } from 'sonner'

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<ReactRenderer>

export const Success: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.success('工作流执行成功')}>显示成功提示</Button>
      <Toaster />
    </>
  ),
}

export const Error: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.error('工作流执行失败')}>显示错误提示</Button>
      <Toaster />
    </>
  ),
}

export const Warning: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.warning('节点配置不完整')}>显示警告提示</Button>
      <Toaster />
    </>
  ),
}

export const Info: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.info('数据采集已开始')}>显示信息提示</Button>
      <Toaster />
    </>
  ),
}

export const Loading: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.loading('正在执行工作流...')}>显示加载提示</Button>
      <Toaster />
    </>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast.success('工作流执行成功', {
            description: '已采集 128 条微博数据',
          })
        }
      >
        带描述的提示
      </Button>
      <Toaster />
    </>
  ),
}

export const WithAction: Story = {
  render: () => (
    <>
      <Button
        onClick={() =>
          toast('事件已创建', {
            action: {
              label: '查看',
              onClick: () => console.log('查看事件'),
            },
          })
        }
      >
        带操作按钮
      </Button>
      <Toaster />
    </>
  ),
}

export const Promise: Story = {
  render: () => (
    <>
      <Button
        onClick={() => {
          const promise = new Promise((resolve) => setTimeout(resolve, 2000))
          toast.promise(promise, {
            loading: '正在执行 NLP 分析...',
            success: 'NLP 分析完成',
            error: 'NLP 分析失败',
          })
        }}
      >
        Promise 提示
      </Button>
      <Toaster />
    </>
  ),
}

export const Multiple: Story = {
  render: () => (
    <>
      <div className="flex gap-2">
        <Button onClick={() => toast.success('操作 1 成功')}>提示 1</Button>
        <Button onClick={() => toast.info('操作 2 完成')}>提示 2</Button>
        <Button onClick={() => toast.warning('操作 3 警告')}>提示 3</Button>
      </div>
      <Toaster />
    </>
  ),
}

export const CustomDuration: Story = {
  render: () => (
    <>
      <Button onClick={() => toast.success('5秒后消失', { duration: 5000 })}>
        自定义时长
      </Button>
      <Toaster />
    </>
  ),
}

export const Positions: Story = {
  render: () => (
    <>
      <div className="flex flex-col gap-2">
        <Button onClick={() => toast('顶部中间', { position: 'top-center' })}>
          顶部中间
        </Button>
        <Button onClick={() => toast('顶部右侧', { position: 'top-right' })}>
          顶部右侧
        </Button>
        <Button onClick={() => toast('底部中间', { position: 'bottom-center' })}>
          底部中间
        </Button>
        <Button onClick={() => toast('底部右侧', { position: 'bottom-right' })}>
          底部右侧
        </Button>
      </div>
      <Toaster />
    </>
  ),
}
