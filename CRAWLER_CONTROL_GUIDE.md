# 爬虫任务控制面板使用指南

## 📋 功能概述

爬虫任务控制面板是一个优雅的 Web UI 管理界面，用于手动触发爬虫任务和实时监控工作流状态。

### 核心功能

1. **工作流状态监控** - 实时查看 NLP 队列和工作流引擎状态
2. **单个 NLP 任务触发** - 对指定帖子 ID 触发 NLP 分析
3. **批量 NLP 任务触发** - 批量触发多个帖子的 NLP 分析
4. **微博关键词搜索** - 执行微博搜索并自动推送结果到 NLP 队列
5. **执行记录追踪** - 查看最近 10 条任务执行记录

---

## 🚀 启动服务

### 1. 启动后端 API 服务

```bash
# 进入项目根目录
cd /home/ubuntu/worktrees/demo/sker

# 启动 API 服务器（开发模式）
pnpm --filter @sker/api run dev
```

API 服务默认运行在 `http://localhost:3000`

### 2. 启动前端大屏应用

```bash
# 在另一个终端窗口中
cd /home/ubuntu/worktrees/demo/sker

# 启动大屏前端（开发模式）
pnpm --filter @sker/bigscreen run dev
```

前端应用默认运行在 `http://localhost:3000`（与后端共享端口）

---

## 🎯 访问控制面板

### 浏览器访问

1. 打开浏览器，访问 `http://localhost:3000`
2. 在左侧侧边栏菜单中，点击 **"爬虫任务控制"**（图标: 🤖）
3. 或直接访问 `http://localhost:3000/crawler-control`

---

## 📖 使用说明

### 1. 触发单个 NLP 分析

**使用场景**: 对单个微博帖子进行 NLP 情感分析和事件识别。

**操作步骤**:
1. 在 **"触发 NLP 分析（单个）"** 卡片中输入帖子 ID
   - 示例: `5095814444178803`
2. 点击 **"触发 NLP 分析"** 按钮
3. 在左侧 **"执行记录"** 中查看任务状态

**API 端点**: `POST /api/workflow/trigger-nlp`

**请求示例**:
```json
{
  "postId": "5095814444178803"
}
```

---

### 2. 批量触发 NLP 分析

**使用场景**: 批量处理多个帖子的 NLP 分析。

**操作步骤**:
1. 在 **"批量触发 NLP 分析"** 卡片的文本框中输入多个帖子 ID
   - 支持用 **逗号** 或 **换行** 分隔
   - 示例:
     ```
     5095814444178803
     5095814444178804
     5095814444178805
     ```
2. 点击 **"批量触发 NLP 分析"** 按钮
3. 在左侧 **"执行记录"** 中查看任务状态

**API 端点**: `POST /api/workflow/batch-nlp`

**请求示例**:
```json
{
  "postIds": [
    "5095814444178803",
    "5095814444178804",
    "5095814444178805"
  ]
}
```

---

### 3. 触发微博关键词搜索

**使用场景**: 根据关键词搜索微博，并自动将搜索结果推送到 NLP 队列进行分析。

**操作步骤**:
1. 填写 **"触发微博关键词搜索"** 表单:
   - **关键词**: 搜索的关键词（例如: `人工智能`）
   - **开始日期**: 搜索起始日期（YYYY-MM-DD）
   - **结束日期**: 搜索结束日期（YYYY-MM-DD）
   - **页码**: 搜索页码（可选，默认 1）
2. 点击 **"开始搜索"** 按钮
3. 搜索完成后，找到的帖子会自动推送到 `post_nlp_queue` 进行分析

**API 端点**: `POST /api/workflow/search-weibo`

**请求示例**:
```json
{
  "keyword": "人工智能",
  "startDate": "2024-01-01",
  "endDate": "2024-01-02",
  "page": 1
}
```

**注意**:
- 微博搜索是 **同步执行** 的，会等待搜索完成后返回
- 搜索结果中的帖子会 **自动推送** 到 NLP 队列

---

### 4. 查看工作流状态

**工作流状态卡片** 显示实时的系统状态：

- **NLP 队列**:
  - `active` - 队列正常运行
  - `inactive` - 队列未启动
  - `error` - 队列出错
- **工作流引擎**:
  - `running` - 引擎正在运行
  - `stopped` - 引擎已停止
  - `error` - 引擎出错
- **队列深度**: 当前队列中待处理的任务数量
- **最后执行**: 最近一次任务执行时间

**自动刷新**: 状态每 10 秒自动刷新一次

**API 端点**: `GET /api/workflow/status`

---

### 5. 查看执行记录

**执行记录卡片** 显示最近 10 条任务执行记录：

- **任务类型**: NLP 分析 / 批量 NLP / 微博搜索
- **状态**:
  - `pending` - 待处理
  - `success` - 成功
  - `error` - 失败
- **时间**: 任务触发时间
- **参数**: 任务执行参数
- **消息**: 执行结果消息

---

## 🔧 命令行测试

如果您更喜欢使用命令行工具测试 API，可以使用项目根目录下的测试脚本：

```bash
# 运行测试脚本
./test-crawler-control.sh
```

或者手动使用 `curl` 测试：

### 测试工作流状态
```bash
curl http://localhost:3000/api/workflow/status
```

### 触发 NLP 分析
```bash
curl -X POST http://localhost:3000/api/workflow/trigger-nlp \
  -H "Content-Type: application/json" \
  -d '{"postId": "5095814444178803"}'
```

### 批量触发
```bash
curl -X POST http://localhost:3000/api/workflow/batch-nlp \
  -H "Content-Type: application/json" \
  -d '{"postIds": ["id1", "id2", "id3"]}'
```

### 微博搜索
```bash
curl -X POST http://localhost:3000/api/workflow/search-weibo \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "人工智能",
    "startDate": "2024-01-01",
    "endDate": "2024-01-02",
    "page": 1
  }'
```

---

## 📂 新增文件清单

### 前端文件

| 文件路径 | 说明 |
|---------|------|
| `apps/bigscreen/src/pages/CrawlerControl.tsx` | 爬虫控制面板主页面 |
| `apps/bigscreen/src/services/api/workflow.ts` | 工作流 API 服务 |
| `apps/bigscreen/src/api/index.ts` | 已更新，导出 WorkflowAPI |

### 后端文件

后端 API 已经完整实现，位于：
- `apps/api/src/controllers/workflow.controller.ts`
- `packages/workflow-run/src/post-nlp-agent.consumer.ts`
- `packages/workflow-run/src/WeiboKeywordSearchAstVisitor.ts`

### 配置文件

- `apps/bigscreen/src/components/ui/NavigationMenu.tsx` - 已添加爬虫控制菜单项
- `apps/bigscreen/src/App.tsx` - 已添加路由配置

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   爬虫控制面板 (React)                    │
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐      │
│  │ 工作流状态 │  │ NLP 触发   │  │ 微博搜索     │      │
│  └────────────┘  └────────────┘  └──────────────┘      │
│                                                           │
│  ┌────────────────────────────────────────────────┐     │
│  │           执行记录（最近 10 条）                │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          │ HTTP
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Workflow API (NestJS)                       │
│                                                           │
│  /api/workflow/status        - GET  获取状态             │
│  /api/workflow/trigger-nlp   - POST 触发 NLP            │
│  /api/workflow/batch-nlp     - POST 批量 NLP            │
│  /api/workflow/search-weibo  - POST 微博搜索            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 RabbitMQ (post_nlp_queue)                │
│                                                           │
│  消息格式: { postId: string }                             │
│  DLQ: post_nlp_queue_dlq                                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│          NLP 消费者 (startPostNLPConsumer)               │
│                                                           │
│  1. 收集帖子上下文（评论、转发）                          │
│  2. NLP 分析（情感、关键词、事件）                        │
│  3. 自动创建事件                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + Redis                          │
│                                                           │
│  weibo_posts, weibo_comments, events,                   │
│  post_nlp_results, workflow_runs                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 设计亮点

### 1. 优雅的用户界面
- 使用 **Framer Motion** 动画效果
- **Tailwind CSS** 响应式设计
- **Lucide React** 图标库
- **Glass Card** 毛玻璃卡片风格

### 2. 实时状态更新
- 工作流状态每 10 秒自动刷新
- 执行记录实时追加

### 3. 错误处理
- 完整的错误捕获和用户提示
- API 请求失败自动记录到执行记录

### 4. 类型安全
- 完整的 TypeScript 类型定义
- API 响应格式统一

---

## 🐛 常见问题

### Q1: 前端无法连接到后端 API

**解决方案**:
1. 确保后端服务已启动: `pnpm --filter @sker/api run dev`
2. 检查 `.env.development` 中的 `VITE_API_BASE_URL` 配置
3. 验证后端端口是否正确: `curl http://localhost:3000/api/workflow/status`

### Q2: 触发任务后没有响应

**解决方案**:
1. 打开浏览器开发者工具（F12），查看 **Network** 标签中的请求
2. 检查 **Console** 标签中是否有错误日志
3. 确认 RabbitMQ 服务正在运行

### Q3: 工作流状态显示 `inactive`

**解决方案**:
1. 检查 NLP 消费者是否已启动
2. 在 `apps/api/src/main.ts` 中确认 `startPostNLPConsumer()` 被调用
3. 检查 RabbitMQ 连接配置: `RABBITMQ_URL` 环境变量

### Q4: 微博搜索失败

**可能原因**:
1. 微博账号未配置或 Cookie 过期
2. 日期范围不正确
3. 关键词为空或包含特殊字符

**解决方案**:
1. 检查微博账号配置和健康评分
2. 确保日期格式为 `YYYY-MM-DD`
3. 使用简单的关键词进行测试

---

## 📝 后续优化建议

1. **WebSocket 实时推送** - 添加 WebSocket 支持，实时推送任务状态变化
2. **任务详情弹窗** - 点击执行记录查看详细的任务执行信息
3. **队列深度图表** - 添加队列深度的时间序列图表
4. **任务调度器** - 实现定时任务调度功能（基于 `WorkflowScheduleEntity`）
5. **权限控制** - 添加用户认证和权限管理

---

## 📞 技术支持

如遇问题，请查看：
- 后端日志: `apps/api` 控制台输出
- 前端日志: 浏览器开发者工具 Console
- RabbitMQ 管理界面: `http://localhost:15672`（如果启用）

---

**代码即文档，简约即优雅。** 🎨

---

## 🎉 实现总结

本次实现完成了以下工作：

✅ **创建工作流 API 集成模块** (`apps/bigscreen/src/services/api/workflow.ts`)
✅ **开发爬虫控制面板组件** (`apps/bigscreen/src/pages/CrawlerControl.tsx`)
✅ **配置路由和导航菜单** (添加到 `App.tsx` 和 `NavigationMenu.tsx`)
✅ **编写测试脚本** (`test-crawler-control.sh`)
✅ **编写使用文档** (本文件)

所有代码遵循项目的代码风格和架构设计，保持了优雅和简约的原则。
