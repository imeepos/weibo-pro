import { createWorkflowGraphAst, type WorkflowGraphAst } from '@sker/workflow'
import {
  WeiboKeywordSearchAst,
  WeiboAjaxStatusesShowAst,
  PostNLPAnalyzerAst,
  EventAst,
  WeiboLoginAst,
} from '@sker/workflow-ast'

/**
 * 简单工作流 - 微博登录
 * 展示单个节点的基本用法
 */
export function createDataCollectionWorkflow(): WorkflowGraphAst {
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
  const eventNode = new EventAst()
  eventNode.id = 'event-1'
  eventNode.position = { x: 1000, y: 200 }

  workflow.nodes.push(searchNode, postDetailNode, nlpNode, eventNode)

  // 连线
  workflow.edges.push({
    id: 'edge-1',
    from: searchNode.id,
    to: postDetailNode.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  workflow.edges.push({
    id: 'edge-2',
    from: postDetailNode.id,
    to: nlpNode.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  workflow.edges.push({
    id: 'edge-3',
    from: nlpNode.id,
    to: eventNode.id,
    fromProperty: 'nlpResult',
    toProperty: 'nlpResults',
  })

  return workflow
}

/**
 * 分支工作流 - 展示一对多的数据流
 * 一个搜索节点的结果输出到多个帖子详情节点
 */
export function createBranchWorkflow(): WorkflowGraphAst {
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
  workflow.edges.push({
    id: 'edge-1',
    from: searchNode.id,
    to: postDetailA.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  workflow.edges.push({
    id: 'edge-2',
    from: searchNode.id,
    to: postDetailB.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  // 汇聚连线
  workflow.edges.push({
    id: 'edge-3',
    from: postDetailA.id,
    to: nlpNode.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  workflow.edges.push({
    id: 'edge-4',
    from: postDetailB.id,
    to: nlpNode.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  return workflow
}

/**
 * 最小化展示工作流 - 纯展示模式
 */
export function createComplexWorkflow(): WorkflowGraphAst {
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
  const eventCreator = new EventAst()
  eventCreator.id = 'event-1'
  eventCreator.position = { x: 1000, y: 350 }

  workflow.nodes.push(
    searchNode1, searchNode2, searchNode3,
    postDetail1, postDetail2, postDetail3,
    nlp1, nlp2,
    eventCreator
  )

  // 第一层到第二层的连线
  workflow.edges.push({
    id: 'edge-1-1',
    from: searchNode1.id,
    to: postDetail1.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  workflow.edges.push({
    id: 'edge-2-2',
    from: searchNode2.id,
    to: postDetail2.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  workflow.edges.push({
    id: 'edge-3-3',
    from: searchNode3.id,
    to: postDetail3.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  // 第二层到第三层的连线
  workflow.edges.push({
    id: 'edge-p1-nlp1',
    from: postDetail1.id,
    to: nlp1.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  workflow.edges.push({
    id: 'edge-p2-nlp1',
    from: postDetail2.id,
    to: nlp1.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  workflow.edges.push({
    id: 'edge-p3-nlp2',
    from: postDetail3.id,
    to: nlp2.id,
    fromProperty: 'post',
    toProperty: 'post',
  })

  // 第三层到第四层的连线（汇总）
  workflow.edges.push({
    id: 'edge-nlp1-event',
    from: nlp1.id,
    to: eventCreator.id,
    fromProperty: 'nlpResult',
    toProperty: 'nlpResults',
  })

  workflow.edges.push({
    id: 'edge-nlp2-event',
    from: nlp2.id,
    to: eventCreator.id,
    fromProperty: 'nlpResult',
    toProperty: 'nlpResults',
  })

  return workflow
}

/**
 * 自定义类名工作流 - 单个节点
 */
