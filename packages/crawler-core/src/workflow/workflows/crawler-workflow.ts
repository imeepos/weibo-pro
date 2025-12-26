import { createWorkflowGraphAst, executeWorkflow, EdgeMode } from '@sker/workflow';
import { SearchNodeAst, DetailNodeAst, CommentNodeAst, StoreNodeAst } from '../nodes';

/**
 * 爬虫工作流示例
 * 流程：搜索 -> 获取详情 -> 获取评论 -> 存储
 */
export function createCrawlerWorkflow() {
  // 1. 搜索节点
  const searchNode = new SearchNodeAst();
  searchNode.keyword = '热点话题';
  searchNode.page = 1;

  // 2. 详情节点
  const detailNode = new DetailNodeAst();

  // 3. 评论节点
  const commentNode = new CommentNodeAst();
  commentNode.maxComments = 100;

  // 4. 存储节点
  const storeNode = new StoreNodeAst();
  storeNode.storeType = 'database';

  // 创建工作流图
  const workflow = createWorkflowGraphAst({
    nodes: [searchNode, detailNode, commentNode, storeNode],
    edges: [
      { id: '1', from: searchNode.id, fromProperty: 'postIds', to: detailNode.id, toProperty: 'postId', mode: EdgeMode.MERGE },
      { id: '2', from: detailNode.id, fromProperty: 'detail', to: commentNode.id, toProperty: 'postId', mode: EdgeMode.MERGE },
      { id: '3', from: commentNode.id, fromProperty: 'comments', to: storeNode.id, toProperty: 'data', mode: EdgeMode.MERGE }
    ]
  });

  return workflow;
}

/**
 * 执行爬虫工作流
 */
export async function runCrawlerWorkflow() {
  const workflow = createCrawlerWorkflow();
  await executeWorkflow(workflow);
}
