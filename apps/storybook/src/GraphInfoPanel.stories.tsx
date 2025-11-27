import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  GraphInfoPanel,
  InfoGrid,
  InfoItem,
  InfoList,
} from '@sker/ui/components/ui/graph-info-panel'
import { Button } from '@sker/ui/components/ui/button'

const meta = {
  title: 'Graph/GraphInfoPanel',
  component: GraphInfoPanel,
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
} satisfies Meta<typeof GraphInfoPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(true)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <Button
          onClick={() => setOpen(!open)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
        >
          {open ? '关闭' : '打开'}面板
        </Button>
        <GraphInfoPanel
          title="基础信息"
          open={open}
          onClose={() => setOpen(false)}
        >
          <p className="text-sm text-muted-foreground">
            这是一个基础的信息面板示例
          </p>
        </GraphInfoPanel>
      </div>
    )
  },
}

export const WithInfoGrid: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="统计信息" open={true} onClose={() => {}}>
        <InfoGrid columns={2}>
          <InfoItem label="节点数" value="1,234" variant="accent" />
          <InfoItem label="连接数" value="5,678" variant="accent" />
          <InfoItem label="社群数" value="12" />
          <InfoItem label="平均密度" value="68%" />
        </InfoGrid>
      </GraphInfoPanel>
    </div>
  ),
}

export const WithInfoList: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="社群详情" open={true} onClose={() => {}}>
        <InfoList
          items={[
            { id: 1, color: '#FF6B6B', label: '社群 1', value: '234 节点' },
            { id: 2, color: '#4ECDC4', label: '社群 2', value: '189 节点' },
            { id: 3, color: '#45B7D1', label: '社群 3', value: '156 节点' },
            { id: 4, color: '#FFA07A', label: '社群 4', value: '123 节点' },
            { id: 5, color: '#98D8C8', label: '社群 5', value: '98 节点' },
          ]}
          maxItems={5}
        />
      </GraphInfoPanel>
    </div>
  ),
}

export const CompleteExample: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="网络分析报告" open={true} onClose={() => {}}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            共检测到 <span className="font-semibold text-primary">8</span> 个社群
          </p>

          <InfoGrid columns={2}>
            <InfoItem label="最大社群" value="234 节点" variant="accent" />
            <InfoItem label="平均密度" value="72.5%" variant="accent" />
            <InfoItem label="总节点" value="1,234" />
            <InfoItem label="总连接" value="5,678" />
          </InfoGrid>

          <div>
            <h4 className="text-sm font-medium mb-2">社群分布</h4>
            <InfoList
              items={[
                { id: 1, color: '#FF6B6B', label: '社群 1', value: '234 节点' },
                { id: 2, color: '#4ECDC4', label: '社群 2', value: '189 节点' },
                { id: 3, color: '#45B7D1', label: '社群 3', value: '156 节点' },
                { id: 4, color: '#FFA07A', label: '社群 4', value: '123 节点' },
                { id: 5, color: '#98D8C8', label: '社群 5', value: '98 节点' },
                { id: 6, color: '#F7DC6F', label: '社群 6', value: '87 节点' },
                { id: 7, color: '#BB8FCE', label: '社群 7', value: '65 节点' },
                { id: 8, color: '#85C1E2', label: '社群 8', value: '52 节点' },
              ]}
              maxItems={5}
            />
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">关键指标</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">模块化系数</span>
                <span className="font-medium">0.856</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">平均路径长度</span>
                <span className="font-medium">3.2</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-muted-foreground">聚类系数</span>
                <span className="font-medium">0.645</span>
              </div>
            </div>
          </div>
        </div>
      </GraphInfoPanel>
    </div>
  ),
}

export const TopRight: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="右上角面板" open={true} onClose={() => {}} position="top-right">
        <InfoGrid columns={2}>
          <InfoItem label="数据 1" value="100" />
          <InfoItem label="数据 2" value="200" />
        </InfoGrid>
      </GraphInfoPanel>
    </div>
  ),
}

export const BottomLeft: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="左下角面板" open={true} onClose={() => {}} position="bottom-left">
        <InfoList
          items={[
            { id: 1, color: '#FF6B6B', label: '项目 1', value: '值 1' },
            { id: 2, color: '#4ECDC4', label: '项目 2', value: '值 2' },
            { id: 3, color: '#45B7D1', label: '项目 3', value: '值 3' },
          ]}
        />
      </GraphInfoPanel>
    </div>
  ),
}

export const BottomRight: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="右下角面板" open={true} onClose={() => {}} position="bottom-right">
        <div className="space-y-2">
          <InfoItem label="当前状态" value="运行中" variant="accent" />
          <InfoItem label="运行时间" value="2h 35m" />
        </div>
      </GraphInfoPanel>
    </div>
  ),
}

export const LongContent: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="长内容示例" open={true} onClose={() => {}}>
        <div className="space-y-4">
          <InfoList
            items={Array.from({ length: 20 }, (_, i) => ({
              id: i + 1,
              color: `hsl(${(i * 360) / 20}, 70%, 60%)`,
              label: `项目 ${i + 1}`,
              value: `值 ${i + 1}`,
            }))}
            maxItems={8}
          />
        </div>
      </GraphInfoPanel>
    </div>
  ),
}

export const ThreeColumns: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphInfoPanel title="三列布局" open={true} onClose={() => {}}>
        <InfoGrid columns={3}>
          <InfoItem label="节点" value="234" />
          <InfoItem label="连接" value="567" />
          <InfoItem label="社群" value="8" />
          <InfoItem label="密度" value="68%" />
          <InfoItem label="直径" value="5" />
          <InfoItem label="半径" value="3" />
        </InfoGrid>
      </GraphInfoPanel>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    const [open, setOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<number | null>(null)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <Button
          onClick={() => setOpen(!open)}
          className="absolute top-4 left-1/2 -translate-x-1/2 z-20"
        >
          {open ? '关闭' : '打开'}面板
        </Button>
        <GraphInfoPanel
          title="交互式面板"
          open={open}
          onClose={() => setOpen(false)}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedItem ? `已选择: 项目 ${selectedItem}` : '请选择一个项目'}
            </p>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((item) => (
                <button
                  key={item}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full flex justify-between items-center p-2 rounded transition-colors ${
                    selectedItem === item
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  <span>项目 {item}</span>
                  <span>{item * 100}</span>
                </button>
              ))}
            </div>
          </div>
        </GraphInfoPanel>
      </div>
    )
  },
}
