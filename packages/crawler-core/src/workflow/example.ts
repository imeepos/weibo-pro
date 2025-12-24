import { Container } from '@sker/core';
import { Compiler, Scheduler } from '@sker/workflow';
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
  // 1. 初始化容器
  const container = Container.getInstance();

  // 2. 注册服务
  container.register(WeiboClient);
  container.register(SearchNodeVisitor);
  container.register(DetailNodeVisitor);
  container.register(CommentNodeVisitor);
  container.register(StoreNodeVisitor);

  // 3. 编译节点
  const compiler = new Compiler();
  compiler.compile(SearchNodeAst);
  compiler.compile(DetailNodeAst);
  compiler.compile(CommentNodeAst);
  compiler.compile(StoreNodeAst);

  // 4. 创建工作流
  const searchNode = new SearchNodeAst();
  searchNode.keyword = '人工智能';
  searchNode.page = 1;

  const detailNode = new DetailNodeAst();
  const commentNode = new CommentNodeAst();
  commentNode.maxComments = 50;

  const storeNode = new StoreNodeAst();
  storeNode.storeType = 'json';

  // 5. 构建工作流图
  const graph = {
    nodes: [searchNode, detailNode, commentNode, storeNode],
    edges: [
      { source: searchNode.id, sourceHandle: 'postIds', target: detailNode.id, targetHandle: 'postId' },
      { source: detailNode.id, sourceHandle: 'detail', target: commentNode.id, targetHandle: 'postId' },
      { source: commentNode.id, sourceHandle: 'comments', target: storeNode.id, targetHandle: 'data' }
    ]
  };

  // 6. 执行工作流
  const scheduler = new Scheduler();
  await scheduler.run(graph);

  console.log('工作流执行完成');
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

export { example };
