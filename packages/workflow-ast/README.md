# @sker/workflow-ast

工作流节点抽象语法树定义包。定义了 Sker 项目中可复用的工作流节点类型，专注于微博数据采集、处理和分析场景。

## 节点类型

### 数据采集节点

用于从微博平台采集各类数据的节点。

- **WeiboAjaxFeedHotTimelineAst** - 微博热门时间线
- **WeiboAjaxFriendshipsAst** - 用户关注关系
- **WeiboAjaxProfileInfoAst** - 用户个人信息
- **WeiboAjaxStatusesCommentAst** - 帖子评论
- **WeiboAjaxStatusesLikeShowAst** - 帖子点赞
- **WeiboAjaxStatusesMymblogAst** - 用户微博列表
- **WeiboAjaxStatusesRepostTimelineAst** - 转发时间线
- **WeiboAjaxStatusesShowAst** - 微博详情
- **WeiboKeywordSearchAst** - 关键词搜索

### 数据处理节点

用于处理和分析采集到的数据。

- **PostContextCollectorAst** - 帖子上下文收集器，收集帖子及其评论、转发
- **PostNLPAnalyzerAst** - 帖子NLP分析器，对帖子内容进行自然语言处理
- **EventAutoCreatorAst** - 事件自动创建器，基于分析结果自动创建事件

## 使用示例

```typescript
import { PostContextCollectorAst } from '@sker/workflow-ast';

const collector = new PostContextCollectorAst();
collector.postId = '123456789';
```

所有节点都继承自 `@sker/workflow` 的 `Ast` 基类，并使用装饰器定义输入输出：

- `@Node` - 定义节点元数据
- `@Input` - 定义输入属性
- `@Output` - 定义输出属性

## 依赖关系

```
@sker/workflow-ast
├── @sker/workflow    (核心工作流引擎)
├── @sker/nlp         (自然语言处理)
└── @sker/entities    (数据实体定义)
```

## 开发

```bash
# 构建
pnpm build

# 开发模式（监听文件变化）
pnpm dev

# 类型检查
pnpm check-types

# 代码检查
pnpm lint
```
