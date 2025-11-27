import type { Meta, StoryObj } from '@storybook/react'
import { GraphFloatingButton } from '@sker/ui/components/ui/graph-floating-button'
import { Settings, Info, ZoomIn, Play, Pause, RefreshCw } from 'lucide-react'

const meta = {
  title: 'Graph/GraphFloatingButton',
  component: GraphFloatingButton,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
  },
} satisfies Meta<typeof GraphFloatingButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: <Settings className="size-4" />,
    position: 'bottom-right',
  },
}

export const TopLeft: Story = {
  args: {
    children: <Info className="size-4" />,
    position: 'top-left',
    title: '信息',
  },
}

export const TopRight: Story = {
  args: {
    children: <Settings className="size-4" />,
    position: 'top-right',
    title: '设置',
  },
}

export const BottomLeft: Story = {
  args: {
    children: <ZoomIn className="size-4" />,
    position: 'bottom-left',
    title: '放大',
  },
}

export const BottomRight: Story = {
  args: {
    children: <RefreshCw className="size-4" />,
    position: 'bottom-right',
    title: '刷新',
  },
}

export const AllPositions: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphFloatingButton position="top-left" title="信息">
        <Info className="size-4" />
      </GraphFloatingButton>
      <GraphFloatingButton position="top-right" title="设置">
        <Settings className="size-4" />
      </GraphFloatingButton>
      <GraphFloatingButton position="bottom-left" title="放大">
        <ZoomIn className="size-4" />
      </GraphFloatingButton>
      <GraphFloatingButton position="bottom-right" title="刷新">
        <RefreshCw className="size-4" />
      </GraphFloatingButton>
    </div>
  ),
}

export const WithActions: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphFloatingButton
        position="bottom-right"
        title="播放"
        onClick={() => alert('播放')}
      >
        <Play className="size-4" />
      </GraphFloatingButton>
      <GraphFloatingButton
        position="bottom-left"
        title="暂停"
        onClick={() => alert('暂停')}
      >
        <Pause className="size-4" />
      </GraphFloatingButton>
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    children: <Settings className="size-4" />,
    position: 'bottom-right',
    disabled: true,
    title: '禁用状态',
  },
}
