# 爬虫工作流API文档

## 概述

爬虫工作流API提供优雅的端点来触发和管理微博爬虫工作流。基于消息队列架构，确保任务的可靠执行和异步处理。

## 核心特性

- **消息队列驱动** - 通过 `post_nlp_queue` 异步处理任务
- **优雅的错误处理** - 完善的错误反馈和状态跟踪
- **批量处理支持** - 支持单个和批量任务触发
- **微博搜索集成** - 完整的关键词搜索工作流

## API端点

### 1. 获取工作流状态

**GET** `/api/workflow/status`

获取当前工作流系统的运行状态。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "nlpQueue": "active",
    "workflowEngine": "running",
    "lastExecution": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. 触发单个帖子NLP分析

**POST** `/api/workflow/trigger-nlp`

触发指定微博帖子的NLP分析工作流。

**请求体：**
```json
{
  "postId": "5095814444178803"
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "NLP分析任务已成功触发",
  "data": {
    "postId": "5095814444178803"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. 批量触发NLP分析

**POST** `/api/workflow/batch-nlp`

批量触发多个微博帖子的NLP分析工作流。

**请求体：**
```json
{
  "postIds": [
    "5095814444178803",
    "5095814444178804",
    "5095814444178805"
  ]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "批量NLP分析任务已成功触发，共 3 个任务",
  "data": {
    "total": 3,
    "results": [
      {"postId": "5095814444178803", "status": "queued"},
      {"postId": "5095814444178804", "status": "queued"},
      {"postId": "5095814444178805", "status": "queued"}
    ]
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. 触发微博关键词搜索

**POST** `/api/workflow/search-weibo`

触发微博关键词搜索工作流，自动推送发现的帖子到NLP队列。

**请求体：**
```json
{
  "keyword": "人工智能",
  "startDate": "2024-01-01",
  "endDate": "2024-01-02",
  "page": 1
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "微博搜索任务已成功执行",
  "data": {
    "keyword": "人工智能",
    "startDate": "2024-01-01",
    "endDate": "2024-01-02",
    "page": 1,
    "searchResult": {
      "items": [...],
      "isEnd": false
    }
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 错误处理

所有API端点都遵循统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 使用示例

### cURL示例

```bash
# 触发NLP分析
curl -X POST http://localhost:3000/api/workflow/trigger-nlp \
  -H "Content-Type: application/json" \
  -d '{"postId": "5095814444178803"}'

# 批量触发
curl -X POST http://localhost:3000/api/workflow/batch-nlp \
  -H "Content-Type: application/json" \
  -d '{"postIds": ["5095814444178803", "5095814444178804"]}'

# 微博搜索
curl -X POST http://localhost:3000/api/workflow/search-weibo \
  -H "Content-Type: application/json" \
  -d '{"keyword": "科技", "startDate": "2024-01-01", "endDate": "2024-01-02"}'
```

### JavaScript示例

```javascript
// 触发NLP分析
const response = await fetch('http://localhost:3000/api/workflow/trigger-nlp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    postId: '5095814444178803'
  })
});

const result = await response.json();
console.log(result);
```

## 测试

项目提供了自动化测试脚本：

```bash
./scripts/test-workflow-api.sh
```

## 架构说明

### 工作流执行流程

1. **API触发** → 推送任务到 `post_nlp_queue`
2. **消费者处理** → `startPostNLPConsumer()` 监听队列
3. **工作流执行** → 执行NLP分析工作流
4. **结果存储** → 存储分析结果到数据库

### 消息队列配置

- **队列名称**: `post_nlp_queue`
- **死信队列**: `post_nlp_queue_dlq`
- **消息TTL**: 30分钟
- **重试机制**: 2次重试，5秒间隔

## 注意事项

1. API服务启动时会自动启动工作流消费者
2. 所有任务都是异步处理，立即返回响应
3. 微博搜索需要有效的微博账号配置
4. 确保消息队列服务正常运行