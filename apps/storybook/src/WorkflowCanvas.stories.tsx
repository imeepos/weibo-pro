import type { Meta, StoryObj } from '@storybook/react'
import { useRef } from 'react'
import { WorkflowCanvas, type WorkflowCanvasProps } from '@sker/workflow-ui'
import type { WorkflowCanvasRef } from '@sker/workflow-ui'
import { createWorkflowGraphAst, toJson } from '@sker/workflow'
import {
  WeiboKeywordSearchAst,
  WeiboAjaxStatusesShowAst,
  PostNLPAnalyzerAst,
  EventAutoCreatorAst,
  WeiboLoginAst,
} from '@sker/workflow-ast'
import { Button } from '@sker/ui/components/ui/button'

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
    const workflow = createWorkflowGraphAst()
    workflow.name = '微博登录'

    // 添加登录节点
    const loginNode = new WeiboLoginAst()
    loginNode.id = 'login-1'
    loginNode.position = { x: 400, y: 300 }

    workflow.nodes.push(loginNode)

    return (
      <div className="h-screen">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="微博登录"
        />
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
 * 数据采集工作流 - 展示完整的微博数据采集链路
 * 关键字搜索 → 获取帖子详情 → NLP 分析 → 事件生成
 */
export const DataCollectionWorkflow: Story = {
  render: (args) => {
    const workflow = createWorkflowGraphAst()
    workflow.name = '微博舆情采集分析'
    workflow.description = '通过关键字搜索微博，获取帖子详情，进行 NLP 分析，自动生成舆情事件'

    // 节点 1: 关键字搜索
    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 100, y: 200 }
    searchNode.keyword = '人工智能'
    searchNode.startDate = new Date('2024-01-01')
    searchNode.page = 1

    // 节点 2: 获取帖子详情
    const postDetailNode = new WeiboAjaxStatusesShowAst()
    postDetailNode.id = 'post-detail-1'
    postDetailNode.position = { x: 400, y: 200 }

    // 节点 3: NLP 分析
    const nlpNode = new PostNLPAnalyzerAst()
    nlpNode.id = 'nlp-1'
    nlpNode.position = { x: 700, y: 200 }

    // 节点 4: 事件生成
    const eventNode = new EventAutoCreatorAst()
    eventNode.id = 'event-1'
    eventNode.position = { x: 1000, y: 200 }

    workflow.nodes.push(searchNode, postDetailNode, nlpNode, eventNode)

    // 连线
    workflow.addEdge({
      id: 'edge-1',
      from: searchNode.id,
      to: postDetailNode.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    workflow.addEdge({
      id: 'edge-2',
      from: postDetailNode.id,
      to: nlpNode.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    workflow.addEdge({
      id: 'edge-3',
      from: nlpNode.id,
      to: eventNode.id,
      fromProperty: 'nlpResult',
      toProperty: 'nlpResults',
    })

    return (
      <div className="h-screen">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="微博舆情采集分析"
        />
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
 * 分支工作流 - 展示一对多的数据流
 * 一个搜索节点的结果输出到多个帖子详情节点
 */
export const BranchWorkflow: Story = {
  render: (args) => {
    const workflow = createWorkflowGraphAst()
    workflow.name = '分支采集工作流'

    // 节点 1: 关键字搜索
    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 200, y: 300 }
    searchNode.keyword = 'AI'

    // 节点 2: 帖子详情 A
    const postDetailA = new WeiboAjaxStatusesShowAst()
    postDetailA.id = 'post-detail-a'
    postDetailA.position = { x: 500, y: 150 }

    // 节点 3: 帖子详情 B
    const postDetailB = new WeiboAjaxStatusesShowAst()
    postDetailB.id = 'post-detail-b'
    postDetailB.position = { x: 500, y: 450 }

    // 节点 4: NLP 分析 (汇聚)
    const nlpNode = new PostNLPAnalyzerAst()
    nlpNode.id = 'nlp-1'
    nlpNode.position = { x: 800, y: 300 }

    workflow.nodes.push(searchNode, postDetailA, postDetailB, nlpNode)

    // 分支连线
    workflow.addEdge({
      id: 'edge-1',
      from: searchNode.id,
      to: postDetailA.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    workflow.addEdge({
      id: 'edge-2',
      from: searchNode.id,
      to: postDetailB.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    // 汇聚连线
    workflow.addEdge({
      id: 'edge-3',
      from: postDetailA.id,
      to: nlpNode.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    workflow.addEdge({
      id: 'edge-4',
      from: postDetailB.id,
      to: nlpNode.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    return (
      <div className="h-screen">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="分支采集工作流"
        />
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
 * 禁用控制项 - 纯展示模式
 * 不显示控制面板和小地图，适合嵌入到其他页面
 */
export const MinimalDisplay: Story = {
  render: (args) => {
    const workflow = createWorkflowGraphAst()
    workflow.name = '最小化展示'

    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 400, y: 300 }
    searchNode.keyword = '测试'

    workflow.nodes.push(searchNode)

    return (
      <div className="h-[600px] border border-border rounded-lg overflow-hidden">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="最小化展示"
        />
      </div>
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
    const workflow = createWorkflowGraphAst()
    workflow.name = '网格吸附模式'

    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 200, y: 200 }

    const postNode = new WeiboAjaxStatusesShowAst()
    postNode.id = 'post-1'
    postNode.position = { x: 500, y: 200 }

    workflow.nodes.push(searchNode, postNode)

    workflow.addEdge({
      id: 'edge-1',
      from: searchNode.id,
      to: postNode.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    return (
      <div className="h-screen">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="网格吸附模式"
        />
      </div>
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

    const workflow = createWorkflowGraphAst()
    workflow.name = 'Ref API 测试'

    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 300, y: 200 }
    searchNode.keyword = 'React'

    const postNode = new WeiboAjaxStatusesShowAst()
    postNode.id = 'post-1'
    postNode.position = { x: 600, y: 200 }

    workflow.nodes.push(searchNode, postNode)

    workflow.addEdge({
      id: 'edge-1',
      from: searchNode.id,
      to: postNode.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    const handleFitView = () => {
      canvasRef.current?.fitView()
    }

    const handleZoomIn = () => {
      canvasRef.current?.zoomIn()
    }

    const handleZoomOut = () => {
      canvasRef.current?.zoomOut()
    }

    const handleCenterView = () => {
      canvasRef.current?.centerView()
    }

    const handleSelectAll = () => {
      canvasRef.current?.selectAll()
    }

    const handleExport = () => {
      const json = canvasRef.current?.exportWorkflow()
      console.log('导出的工作流 JSON:', json)
      alert('工作流已导出到控制台')
    }

    const handleGetAst = () => {
      const ast = canvasRef.current?.getWorkflowAst()
      console.log('工作流 AST:', ast)
      console.log('工作流 JSON:', toJson(ast!))
    }

    return (
      <div className="flex flex-col h-screen">
        <div className="flex gap-2 p-4 border-b bg-background">
          <Button onClick={handleFitView} size="sm">
            适应画布
          </Button>
          <Button onClick={handleZoomIn} size="sm">
            放大
          </Button>
          <Button onClick={handleZoomOut} size="sm">
            缩小
          </Button>
          <Button onClick={handleCenterView} size="sm">
            居中视图
          </Button>
          <Button onClick={handleSelectAll} size="sm">
            全选节点
          </Button>
          <Button onClick={handleExport} size="sm" variant="outline">
            导出工作流
          </Button>
          <Button onClick={handleGetAst} size="sm" variant="outline">
            获取 AST
          </Button>
        </div>
        <div className="flex-1">
          <WorkflowCanvas
            {...args}
            ref={canvasRef}
            workflowAst={workflow}
            name="Ref API 测试"
          />
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
    const workflow = createWorkflowGraphAst()
    workflow.name = '复杂舆情分析工作流'
    workflow.description = '多关键字并行采集 + NLP 分析 + 事件生成的完整链路'
    workflow.tags = ['production', 'sentiment-analysis']
    workflow.color = '#3b82f6'

    // 第一层：多个搜索节点
    const searchNode1 = new WeiboKeywordSearchAst()
    searchNode1.id = 'search-1'
    searchNode1.position = { x: 100, y: 150 }
    searchNode1.keyword = 'AI技术'

    const searchNode2 = new WeiboKeywordSearchAst()
    searchNode2.id = 'search-2'
    searchNode2.position = { x: 100, y: 350 }
    searchNode2.keyword = '人工智能'

    const searchNode3 = new WeiboKeywordSearchAst()
    searchNode3.id = 'search-3'
    searchNode3.position = { x: 100, y: 550 }
    searchNode3.keyword = '机器学习'

    // 第二层：帖子详情节点
    const postDetail1 = new WeiboAjaxStatusesShowAst()
    postDetail1.id = 'post-1'
    postDetail1.position = { x: 400, y: 150 }

    const postDetail2 = new WeiboAjaxStatusesShowAst()
    postDetail2.id = 'post-2'
    postDetail2.position = { x: 400, y: 350 }

    const postDetail3 = new WeiboAjaxStatusesShowAst()
    postDetail3.id = 'post-3'
    postDetail3.position = { x: 400, y: 550 }

    // 第三层：NLP 分析节点
    const nlp1 = new PostNLPAnalyzerAst()
    nlp1.id = 'nlp-1'
    nlp1.position = { x: 700, y: 250 }

    const nlp2 = new PostNLPAnalyzerAst()
    nlp2.id = 'nlp-2'
    nlp2.position = { x: 700, y: 450 }

    // 第四层：事件生成节点（汇总）
    const eventCreator = new EventAutoCreatorAst()
    eventCreator.id = 'event-1'
    eventCreator.position = { x: 1000, y: 350 }

    workflow.nodes.push(
      searchNode1, searchNode2, searchNode3,
      postDetail1, postDetail2, postDetail3,
      nlp1, nlp2,
      eventCreator
    )

    // 第一层到第二层的连线
    workflow.addEdge({
      id: 'edge-1-1',
      from: searchNode1.id,
      to: postDetail1.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    workflow.addEdge({
      id: 'edge-2-2',
      from: searchNode2.id,
      to: postDetail2.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    workflow.addEdge({
      id: 'edge-3-3',
      from: searchNode3.id,
      to: postDetail3.id,
      fromProperty: 'mblogid',
      toProperty: 'id',
    })

    // 第二层到第三层的连线
    workflow.addEdge({
      id: 'edge-p1-nlp1',
      from: postDetail1.id,
      to: nlp1.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    workflow.addEdge({
      id: 'edge-p2-nlp1',
      from: postDetail2.id,
      to: nlp1.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    workflow.addEdge({
      id: 'edge-p3-nlp2',
      from: postDetail3.id,
      to: nlp2.id,
      fromProperty: 'post',
      toProperty: 'post',
    })

    // 第三层到第四层的连线（汇总）
    workflow.addEdge({
      id: 'edge-nlp1-event',
      from: nlp1.id,
      to: eventCreator.id,
      fromProperty: 'nlpResult',
      toProperty: 'nlpResults',
    })

    workflow.addEdge({
      id: 'edge-nlp2-event',
      from: nlp2.id,
      to: eventCreator.id,
      fromProperty: 'nlpResult',
      toProperty: 'nlpResults',
    })

    return (
      <div className="h-screen">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          name="复杂舆情分析工作流"
        />
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
 * 自定义类名 - 展示如何自定义画布样式
 */
export const CustomClassName: Story = {
  render: (args) => {
    const workflow = createWorkflowGraphAst()
    workflow.name = '自定义样式'

    const searchNode = new WeiboKeywordSearchAst()
    searchNode.id = 'search-1'
    searchNode.position = { x: 400, y: 300 }

    workflow.nodes.push(searchNode)

    return (
      <div className="h-[600px] rounded-xl overflow-hidden shadow-2xl">
        <WorkflowCanvas
          {...args}
          workflowAst={workflow}
          className="border-4 border-primary"
          name="自定义样式"
        />
      </div>
    )
  },
  args: {
    showMiniMap: true,
    showControls: true,
    showBackground: true,
  },
}
