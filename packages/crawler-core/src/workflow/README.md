# 爬虫工作流集成

基于 @sker/workflow 的爬虫工作流节点实现。

## 节点列表

### 1. SearchNodeAst - 搜索节点
搜索指定关键词的内容。

**输入：**
- `keyword` (string): 搜索关键词
- `page` (number): 页码

**输出：**
- `postIds` (string[]): 帖子ID列表
- `isEnd` (boolean): 是否结束

### 2. DetailNodeAst - 详情节点
获取帖子详细信息。

**输入：**
- `postId` (string): 帖子ID

**输出：**
- `detail` (any): 帖子详情

### 3. CommentNodeAst - 评论节点
获取帖子评论列表。

**输入：**
- `postId` (string): 帖子ID
- `maxComments` (number): 最大评论数

**输出：**
- `comments` (any[]): 评论列表

### 4. StoreNodeAst - 存储节点
存储数据到指定存储类型。

**输入：**
- `data` (any): 要存储的数据
- `storeType` ('database' | 'json' | 'csv'): 存储类型

**输出：**
- `success` (boolean): 存储是否成功

## 使用示例

```typescript
import { Container } from '@sker/core';
import { Compiler, Scheduler } from '@sker/workflow';
import {
  SearchNodeAst,
  DetailNodeAst,
  CommentNodeAst,
  StoreNodeAst,
  SearchNodeVisitor,
  DetailNodeVisitor,
  CommentNodeVisitor,
  StoreNodeVisitor
} from '@sker/crawler-core';

// 1. 初始化容器
const container = Container.getInstance();

// 2. 注册 Visitor
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

const detailNode = new DetailNodeAst();
const commentNode = new CommentNodeAst();
const storeNode = new StoreNodeAst();

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
```

## 工作流示例

### 基础爬虫流程
搜索 -> 获取详情 -> 获取评论 -> 存储

```typescript
import { createCrawlerWorkflow, runCrawlerWorkflow } from '@sker/crawler-core';

// 创建并执行工作流
await runCrawlerWorkflow();
```

## 文件结构

```
workflow/
├── nodes/                      # AST 节点定义
│   ├── search-node.ts         # 搜索节点
│   ├── detail-node.ts         # 详情节点
│   ├── comment-node.ts        # 评论节点
│   ├── store-node.ts          # 存储节点
│   └── index.ts               # 节点导出
├── visitors/                   # Visitor 执行器
│   ├── search-node.visitor.ts
│   ├── detail-node.visitor.ts
│   ├── comment-node.visitor.ts
│   ├── store-node.visitor.ts
│   └── index.ts
├── workflows/                  # 工作流定义
│   ├── crawler-workflow.ts    # 爬虫工作流
│   └── index.ts
├── example.ts                  # 使用示例
└── index.ts                    # 模块导出
```

## 注意事项

1. 所有节点继承自 `Ast` 基类
2. 使用 `@Node` 装饰器声明节点元数据
3. 使用 `@Input` 和 `@Output` 装饰器定义数据流
4. Visitor 必须设置 `ast.state` 为 'running'、'success' 或 'fail'
5. 错误处理使用 `setAstError` 函数
