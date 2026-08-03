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
export function createSimpleWorkflow(): WorkflowGraphAst {
  const workflow = createWorkflowGraphAst()
  workflow.name = '微博登录'

  // 添加登录节点
  const loginNode = new WeiboLoginAst()
  loginNode.id = 'login-1'
  loginNode.position = { x: 400, y: 300 }

  workflow.nodes.push(loginNode)

  return workflow
}

/**
 * 数据采集工作流 - 展示完整的微博数据采集链路
 * 关键字搜索 → 获取帖子详情 → NLP 分析 → 事件生成
 */
export function createMinimalDisplayWorkflow(): WorkflowGraphAst {
  const workflow = createWorkflowGraphAst()
  workflow.name = '最小化展示'

  const searchNode = new WeiboKeywordSearchAst()
  searchNode.id = 'search-1'
  searchNode.position = { x: 400, y: 300 }
  searchNode.keyword = '测试'

  workflow.nodes.push(searchNode)

  return workflow
}

/**
 * 网格吸附模式工作流 - 两个节点一条连线
 */
export function createSnapToGridWorkflow(): WorkflowGraphAst {
  const workflow = createWorkflowGraphAst()
  workflow.name = '网格吸附模式'

  const searchNode = new WeiboKeywordSearchAst()
  searchNode.id = 'search-1'
  searchNode.position = { x: 200, y: 200 }

  const postNode = new WeiboAjaxStatusesShowAst()
  postNode.id = 'post-1'
  postNode.position = { x: 500, y: 200 }

  workflow.nodes.push(searchNode, postNode)

  workflow.edges.push({
    id: 'edge-1',
    from: searchNode.id,
    to: postNode.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  return workflow
}

/**
 * Ref API 测试工作流 - 两个节点一条连线
 */
export function createRefControlsWorkflow(): WorkflowGraphAst {
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

  workflow.edges.push({
    id: 'edge-1',
    from: searchNode.id,
    to: postNode.id,
    fromProperty: 'mblogid',
    toProperty: 'id',
  })

  return workflow
}

/**
 * 复杂工作流 - 多层级数据流
 * 展示实际业务场景中的复杂工作流
 */
export function createCustomClassNameWorkflow(): WorkflowGraphAst {
  const workflow = createWorkflowGraphAst()
  workflow.name = '自定义样式'

  const searchNode = new WeiboKeywordSearchAst()
  searchNode.id = 'search-1'
  searchNode.position = { x: 400, y: 300 }

  workflow.nodes.push(searchNode)

  return workflow
}
