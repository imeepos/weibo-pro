import { WorkflowGraph, Scheduler } from '@sker/workflow';
import { SearchNodeAst, DetailNodeAst, CommentNodeAst, StoreNodeAst } from '../nodes';

/**
 * 爬虫工作流示例
 * 流程：搜索 -> 获取详情 -> 获取评论 -> 存储
 */
export function createCrawlerWorkflow() {
  const graph = new WorkflowGraph();

  // 1. 搜索节点
  const searchNode = new SearchNodeAst();
  searchNode.keyword = '热点话题';
  searchNode.page = 1;
  graph.addNode(searchNode);

  // 2. 详情节点
  const detailNode = new DetailNodeAst();
  graph.addNode(detailNode);

  // 3. 评论节点
  const commentNode = new CommentNodeAst();
  commentNode.maxComments = 100;
  graph.addNode(commentNode);

  // 4. 存储节点
  const storeNode = new StoreNodeAst();
  storeNode.storeType = 'database';
  graph.addNode(storeNode);

  // 连接节点
  graph.addEdge(searchNode.id, 'postIds', detailNode.id, 'postId');
  graph.addEdge(detailNode.id, 'detail', commentNode.id, 'postId');
  graph.addEdge(commentNode.id, 'comments', storeNode.id, 'data');

  return graph;
}

/**
 * 执行爬虫工作流
 */
export async function runCrawlerWorkflow() {
  const graph = createCrawlerWorkflow();
  const scheduler = new Scheduler();

  await scheduler.run(graph);
}
