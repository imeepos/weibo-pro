import { root } from '@sker/core';
import { Compiler, executeWorkflow, createWorkflowGraphAst, EdgeMode } from '@sker/workflow';
import { WeiboClient } from '../platforms/weibo/weibo-client';
import {
  SearchNodeAst,
  DetailNodeAst,
  CommentNodeAst,
  StoreNodeAst,
  SearchNodeVisitor,
  DetailNodeVisitor,
  CommentNodeVisitor,
  StoreNodeVisitor
} from './index';

/**
 * 工作流使用示例
 */
async function example() {
  // 1. 注册服务到根注入器
  root.set([
    WeiboClient,
    SearchNodeVisitor,
    DetailNodeVisitor,
    CommentNodeVisitor,
    StoreNodeVisitor,
  ]);

  // 2. 创建并编译节点
  const compiler = new Compiler();

  const searchNode = new SearchNodeAst();
  searchNode.keyword = '人工智能';
  searchNode.page = 1;
  compiler.compile(searchNode);

  const detailNode = new DetailNodeAst();
  compiler.compile(detailNode);

  const commentNode = new CommentNodeAst();
  commentNode.maxComments = 50;
  compiler.compile(commentNode);

  const storeNode = new StoreNodeAst();
  storeNode.storeType = 'json';
  compiler.compile(storeNode);

  // 3. 构建工作流图
  const workflow = createWorkflowGraphAst({
    nodes: [searchNode, detailNode, commentNode, storeNode],
    edges: [
      { id: '1', from: searchNode.id, fromProperty: 'postIds', to: detailNode.id, toProperty: 'postId', mode: EdgeMode.MERGE },
      { id: '2', from: detailNode.id, fromProperty: 'detail', to: commentNode.id, toProperty: 'postId', mode: EdgeMode.MERGE },
      { id: '3', from: commentNode.id, fromProperty: 'comments', to: storeNode.id, toProperty: 'data', mode: EdgeMode.MERGE }
    ]
  });

  // 4. 执行工作流
  await executeWorkflow(workflow);

  console.log('工作流执行完成');
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

export { example };
