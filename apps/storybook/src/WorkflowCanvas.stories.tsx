import type { Meta, StoryObj } from '@storybook/react'
import { useRef } from 'react'
import { WorkflowCanvas } from '@sker/workflow-ui'
import type { WorkflowCanvasRef } from '@sker/workflow-ui'
import {
  CanvasShell,
  BorderedCanvasShell,
  CustomClassCanvasShell,
  RefControlsToolbar,
} from './workflow-canvas.stories/components'
import {
  createSimpleWorkflow,
  createDataCollectionWorkflow,
  createBranchWorkflow,
  createMinimalDisplayWorkflow,
  createSnapToGridWorkflow,
  createRefControlsWorkflow,
  createComplexWorkflow,
  createCustomClassNameWorkflow,
} from './workflow-canvas.stories/workflows'

const meta = {
  title: 'Workflow/WorkflowCanvas',
  component: WorkflowCanvas,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: '基于 AST 的可视化工作流画布组件，支持节点拖拽、连线、执行等完整工作流编排能力。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    showMiniMap: {
      control: 'boolean',
      description: '是否显示小地图',
      defaultValue: true,
    },
    showControls: {
      control: 'boolean',
      description: '是否显示控制面板',
      defaultValue: true,
    },
    showBackground: {
      control: 'boolean',
      description: '是否显示网格背景',
      defaultValue: true,
    },
    snapToGrid: {
      control: 'boolean',
      description: '是否启用网格吸附',
      defaultValue: false,
    },
    name: {
      control: 'text',
      description: '工作流名称',
    },
  },
} satisfies Meta<typeof WorkflowCanvas>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 空画布 - 展示初始化状态
 * 用户可以通过右键菜单或拖拽添加节点
 */
export const Empty: Story = {
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
    name: '空白工作流',
  },
}

/**
 * 简单工作流 - 微博登录
 * 展示单个节点的基本用法
 */
export const SimpleWorkflow: Story = {
  render: (args) => {
    const workflow = createSimpleWorkflow()
    return (
      <CanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="微博登录" />
      </CanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}

/**
 * 数据采集工作流 - 展示完整的微博数据采集链路
 * 关键字搜索 → 获取帖子详情 → NLP 分析 → 事件生成
 */
export const DataCollectionWorkflow: Story = {
  render: (args) => {
    const workflow = createDataCollectionWorkflow()
    return (
      <CanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="微博舆情采集分析" />
      </CanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}

/**
 * 分支工作流 - 展示一对多的数据流
 * 一个搜索节点的结果输出到多个帖子详情节点
 */
export const BranchWorkflow: Story = {
  render: (args) => {
    const workflow = createBranchWorkflow()
    return (
      <CanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="分支采集工作流" />
      </CanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}

/**
 * 禁用控制项 - 纯展示模式
 * 不显示控制面板和小地图，适合嵌入到其他页面
 */
export const MinimalDisplay: Story = {
  render: (args) => {
    const workflow = createMinimalDisplayWorkflow()
    return (
      <BorderedCanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="最小化展示" />
      </BorderedCanvasShell>
    )
  },
  args: {
    showMiniMap: false,
    showControls: false,
    showBackground: true,
  },
}

/**
 * 网格吸附模式 - 启用网格对齐
 * 拖动节点时会自动吸附到网格点
 */
export const SnapToGrid: Story = {
  render: (args) => {
    const workflow = createSnapToGridWorkflow()
    return (
      <CanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="网格吸附模式" />
      </CanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
    snapToGrid: true,
  },
}

/**
 * 命令式 API 展示 - 通过 ref 调用方法
 * 展示如何使用 WorkflowCanvasRef 控制画布
 */
export const WithRefControls: Story = {
  render: (args) => {
    const canvasRef = useRef<WorkflowCanvasRef>(null)
    const workflow = createRefControlsWorkflow()
    return (
      <div className="flex flex-col h-screen">
        <RefControlsToolbar canvasRef={canvasRef} />
        <div className="flex-1">
          <WorkflowCanvas {...args} ref={canvasRef} workflowAst={workflow} name="Ref API 测试" />
        </div>
      </div>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}

/**
 * 复杂工作流 - 多层级数据流
 * 展示实际业务场景中的复杂工作流
 */
export const ComplexWorkflow: Story = {
  render: (args) => {
    const workflow = createComplexWorkflow()
    return (
      <CanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} name="复杂舆情分析工作流" />
      </CanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}

/**
 * 自定义类名 - 展示如何自定义画布样式
 */
export const CustomClassName: Story = {
  render: (args) => {
    const workflow = createCustomClassNameWorkflow()
    return (
      <CustomClassCanvasShell>
        <WorkflowCanvas {...args} workflowAst={workflow} className="border-4 border-primary" name="自定义样式" />
      </CustomClassCanvasShell>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}
