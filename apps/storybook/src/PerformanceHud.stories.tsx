import type { Meta, StoryObj } from '@storybook/react'
import { useState, useEffect } from 'react'
import { PerformanceHud, type Metric } from '@sker/ui/components/ui/performance-hud'

const meta = {
  title: 'Graph/PerformanceHud',
  component: PerformanceHud,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    },
    level: {
      control: 'select',
      options: ['high', 'medium', 'low'],
    },
  },
} satisfies Meta<typeof PerformanceHud>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    visible: true,
    title: '性能监控',
    level: 'high',
    metrics: [
      { label: 'FPS', value: 60, color: 'text-green-400' },
      { label: '帧时间', value: 16.67, suffix: 'ms' },
      { label: '节点', value: 1234 },
      { label: '边', value: 5678 },
    ],
  },
}

export const HighPerformance: Story = {
  args: {
    visible: true,
    title: '高性能',
    level: 'high',
    position: 'top-left',
    metrics: [
      { label: 'FPS', value: 60, color: 'text-green-400' },
      { label: '帧时间', value: 16.67, suffix: 'ms' },
      { label: '内存', value: 156, suffix: 'MB' },
      { label: '节点', value: 1234 },
      { label: '连接', value: 5678 },
    ],
  },
}

export const MediumPerformance: Story = {
  args: {
    visible: true,
    title: '中等性能',
    level: 'medium',
    position: 'top-left',
    metrics: [
      { label: 'FPS', value: 35, color: 'text-yellow-400' },
      { label: '帧时间', value: 28.57, suffix: 'ms' },
      { label: '内存', value: 312, suffix: 'MB' },
      { label: '节点', value: 2456 },
      { label: '连接', value: 12345 },
    ],
  },
}

export const LowPerformance: Story = {
  args: {
    visible: true,
    title: '低性能',
    level: 'low',
    position: 'top-left',
    metrics: [
      { label: 'FPS', value: 18, color: 'text-red-400' },
      { label: '帧时间', value: 55.56, suffix: 'ms' },
      { label: '内存', value: 456, suffix: 'MB' },
      { label: '节点', value: '3456 (45%)' },
      { label: '连接', value: '18765 (52%)' },
    ],
  },
}

export const TopRight: Story = {
  args: {
    visible: true,
    title: '右上角',
    level: 'high',
    position: 'top-right',
    metrics: [
      { label: 'FPS', value: 60, color: 'text-green-400' },
      { label: '节点', value: 1234 },
    ],
  },
}

export const BottomLeft: Story = {
  args: {
    visible: true,
    title: '左下角',
    level: 'medium',
    position: 'bottom-left',
    metrics: [
      { label: 'FPS', value: 40, color: 'text-yellow-400' },
      { label: '节点', value: 2456 },
    ],
  },
}

export const BottomRight: Story = {
  args: {
    visible: true,
    title: '右下角',
    level: 'low',
    position: 'bottom-right',
    metrics: [
      { label: 'FPS', value: 20, color: 'text-red-400' },
      { label: '节点', value: 3456 },
    ],
  },
}

export const MinimalMetrics: Story = {
  args: {
    visible: true,
    title: '最小指标',
    level: 'high',
    metrics: [
      { label: 'FPS', value: 60, color: 'text-green-400' },
    ],
  },
}

export const ExtensiveMetrics: Story = {
  args: {
    visible: true,
    title: '详细指标',
    level: 'high',
    metrics: [
      { label: 'FPS', value: 60, color: 'text-green-400' },
      { label: '帧时间', value: 16.67, suffix: 'ms' },
      { label: '内存', value: 156, suffix: 'MB' },
      { label: '节点数', value: 1234 },
      { label: '边数', value: 5678 },
      { label: 'CPU', value: 45, suffix: '%' },
      { label: 'GPU', value: 32, suffix: '%' },
      { label: '渲染调用', value: 234 },
    ],
  },
}

export const AnimatedSimulation: Story = {
  render: () => {
    const [fps, setFps] = useState(60)
    const [level, setLevel] = useState<'high' | 'medium' | 'low'>('high')

    useEffect(() => {
      const interval = setInterval(() => {
        // 模拟性能波动
        const newFps = Math.max(15, Math.min(60, fps + (Math.random() - 0.5) * 10))
        setFps(Math.round(newFps))

        // 根据 FPS 更新性能等级
        if (newFps >= 50) setLevel('high')
        else if (newFps >= 30) setLevel('medium')
        else setLevel('low')
      }, 1000)

      return () => clearInterval(interval)
    }, [fps])

    const frameTime = Number((1000 / fps).toFixed(2))
    const fpsColor = fps >= 50 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <PerformanceHud
          visible={true}
          title="实时监控"
          level={level}
          metrics={[
            { label: 'FPS', value: fps, color: fpsColor },
            { label: '帧时间', value: frameTime, suffix: 'ms' },
            { label: '节点', value: 1234 },
            { label: '边', value: 5678 },
          ]}
        />
      </div>
    )
  },
}

export const WithSampling: Story = {
  args: {
    visible: true,
    title: '采样模式',
    level: 'medium',
    metrics: [
      { label: 'FPS', value: 40, color: 'text-yellow-400' },
      { label: '帧时间', value: 25, suffix: 'ms' },
      { label: '节点', value: '1234 (50%)' },
      { label: '边', value: '5678 (48%)' },
      { label: '采样率', value: 50, suffix: '%' },
    ],
  },
}

export const AllPositions: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <PerformanceHud
        visible={true}
        title="左上"
        level="high"
        position="top-left"
        metrics={[
          { label: 'FPS', value: 60, color: 'text-green-400' },
          { label: '节点', value: 1234 },
        ]}
      />
      <PerformanceHud
        visible={true}
        title="右上"
        level="medium"
        position="top-right"
        metrics={[
          { label: 'FPS', value: 40, color: 'text-yellow-400' },
          { label: '节点', value: 2456 },
        ]}
      />
      <PerformanceHud
        visible={true}
        title="左下"
        level="low"
        position="bottom-left"
        metrics={[
          { label: 'FPS', value: 20, color: 'text-red-400' },
          { label: '节点', value: 3456 },
        ]}
      />
      <PerformanceHud
        visible={true}
        title="右下"
        level="high"
        position="bottom-right"
        metrics={[
          { label: 'FPS', value: 55, color: 'text-green-400' },
          { label: '节点', value: 1000 },
        ]}
      />
    </div>
  ),
}

export const ToggleVisibility: Story = {
  render: () => {
    const [visible, setVisible] = useState(true)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <button
          onClick={() => setVisible(!visible)}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          {visible ? '隐藏' : '显示'} HUD
        </button>
        <PerformanceHud
          visible={visible}
          title="性能监控"
          level="high"
          metrics={[
            { label: 'FPS', value: 60, color: 'text-green-400' },
            { label: '帧时间', value: 16.67, suffix: 'ms' },
            { label: '节点', value: 1234 },
            { label: '边', value: 5678 },
          ]}
        />
      </div>
    )
  },
}
