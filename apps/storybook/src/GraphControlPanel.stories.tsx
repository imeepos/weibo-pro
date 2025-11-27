import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  GraphControlPanel,
  ControlGroup,
  SliderControl,
  SwitchControl,
} from '@sker/ui/components/ui/graph-control-panel'

const meta = {
  title: 'Graph/GraphControlPanel',
  component: GraphControlPanel,
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
} satisfies Meta<typeof GraphControlPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphControlPanel title="控制面板">
        <ControlGroup title="基础设置">
          <SwitchControl label="开关示例" checked={true} onCheckedChange={() => {}} />
        </ControlGroup>
      </GraphControlPanel>
    </div>
  ),
}

export const WithSliders: Story = {
  render: () => {
    const [brightness, setBrightness] = useState(50)
    const [contrast, setContrast] = useState(75)
    const [saturation, setSaturation] = useState(100)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <GraphControlPanel title="图像调整">
          <ControlGroup title="色彩设置" onReset={() => {
            setBrightness(50)
            setContrast(75)
            setSaturation(100)
          }}>
            <SliderControl
              label="亮度"
              value={brightness}
              min={0}
              max={100}
              suffix="%"
              onValueChange={setBrightness}
            />
            <SliderControl
              label="对比度"
              value={contrast}
              min={0}
              max={100}
              suffix="%"
              onValueChange={setContrast}
            />
            <SliderControl
              label="饱和度"
              value={saturation}
              min={0}
              max={200}
              suffix="%"
              onValueChange={setSaturation}
            />
          </ControlGroup>
        </GraphControlPanel>
      </div>
    )
  },
}

export const WithSwitches: Story = {
  render: () => {
    const [showGrid, setShowGrid] = useState(true)
    const [showAxis, setShowAxis] = useState(false)
    const [enableAnimation, setEnableAnimation] = useState(true)
    const [enableTooltip, setEnableTooltip] = useState(true)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <GraphControlPanel title="可视化选项">
          <ControlGroup title="显示设置">
            <SwitchControl label="显示网格" checked={showGrid} onCheckedChange={setShowGrid} />
            <SwitchControl label="显示坐标轴" checked={showAxis} onCheckedChange={setShowAxis} />
            <SwitchControl label="启用动画" checked={enableAnimation} onCheckedChange={setEnableAnimation} />
            <SwitchControl label="显示提示" checked={enableTooltip} onCheckedChange={setEnableTooltip} />
          </ControlGroup>
        </GraphControlPanel>
      </div>
    )
  },
}

export const CompleteExample: Story = {
  render: () => {
    const [nodeSize, setNodeSize] = useState(50)
    const [linkDistance, setLinkDistance] = useState(100)
    const [repulsionForce, setRepulsionForce] = useState(75)
    const [showLabels, setShowLabels] = useState(true)
    const [enablePhysics, setEnablePhysics] = useState(true)
    const [highlightNeighbors, setHighlightNeighbors] = useState(false)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <GraphControlPanel title="图形控制">
          <ControlGroup
            title="节点设置"
            onReset={() => {
              setNodeSize(50)
            }}
          >
            <SliderControl
              label="节点大小"
              value={nodeSize}
              min={10}
              max={100}
              onValueChange={setNodeSize}
            />
          </ControlGroup>

          <ControlGroup
            title="连线设置"
            onReset={() => {
              setLinkDistance(100)
              setRepulsionForce(75)
            }}
          >
            <SliderControl
              label="连线距离"
              value={linkDistance}
              min={50}
              max={200}
              onValueChange={setLinkDistance}
            />
            <SliderControl
              label="排斥力"
              value={repulsionForce}
              min={0}
              max={100}
              suffix="%"
              onValueChange={setRepulsionForce}
            />
          </ControlGroup>

          <ControlGroup title="交互选项">
            <SwitchControl label="显示标签" checked={showLabels} onCheckedChange={setShowLabels} />
            <SwitchControl label="启用物理引擎" checked={enablePhysics} onCheckedChange={setEnablePhysics} />
            <SwitchControl label="高亮邻居" checked={highlightNeighbors} onCheckedChange={setHighlightNeighbors} />
          </ControlGroup>
        </GraphControlPanel>
      </div>
    )
  },
}

export const TopLeft: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphControlPanel title="左上角面板" position="top-left">
        <ControlGroup title="设置">
          <SwitchControl label="选项 1" checked={true} onCheckedChange={() => {}} />
          <SwitchControl label="选项 2" checked={false} onCheckedChange={() => {}} />
        </ControlGroup>
      </GraphControlPanel>
    </div>
  ),
}

export const BottomLeft: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphControlPanel title="左下角面板" position="bottom-left">
        <ControlGroup title="设置">
          <SliderControl label="参数" value={50} onValueChange={() => {}} />
        </ControlGroup>
      </GraphControlPanel>
    </div>
  ),
}

export const BottomRight: Story = {
  render: () => (
    <div className="relative h-screen w-full bg-muted/20">
      <GraphControlPanel title="右下角面板" position="bottom-right">
        <ControlGroup title="设置">
          <SliderControl label="参数" value={50} onValueChange={() => {}} />
        </ControlGroup>
      </GraphControlPanel>
    </div>
  ),
}

export const ControlledOpen: Story = {
  render: () => {
    const [open, setOpen] = useState(false)

    return (
      <div className="relative h-screen w-full bg-muted/20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <button
            onClick={() => setOpen(!open)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            {open ? '关闭' : '打开'}面板
          </button>
        </div>
        <GraphControlPanel
          title="受控面板"
          open={open}
          onOpenChange={setOpen}
        >
          <ControlGroup title="内容">
            <SwitchControl label="开关" checked={true} onCheckedChange={() => {}} />
          </ControlGroup>
        </GraphControlPanel>
      </div>
    )
  },
}
