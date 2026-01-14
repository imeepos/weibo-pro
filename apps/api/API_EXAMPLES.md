# API 使用示例

## 认证

### 登录获取 Token

```bash
curl -X POST http://localhost:8089/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

响应:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name"
    },
    "session": {
      "token": "eyJhbGciOiJIUzI1NiIs...",
      "expiresAt": "2025-01-13T00:00:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2025-01-12T12:00:00.000Z"
  }
}
```

### 使用 Token 访问 API

```bash
curl http://localhost:8089/api/workflows \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

## 关键词分析

### 获取词云数据

```bash
curl "http://localhost:8089/api/keywords/wordcloud?maxWords=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

响应:
```json
{
  "success": true,
  "data": [
    { "text": "微博", "weight": 150 },
    { "text": "舆情", "weight": 120 },
    { "text": "分析", "weight": 100 }
  ],
  "meta": {
    "timestamp": "2025-01-12T12:00:00.000Z"
  }
}
```

### 获取关键词趋势

```bash
curl "http://localhost:8089/api/keywords/trend?keyword=微博&days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 工作流

### 创建工作流

```bash
curl -X POST http://localhost:8089/api/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "舆情分析工作流",
    "description": "自动分析微博舆情",
    "definition": {
      "nodes": [
        {
          "id": "node1",
          "type": "data-source",
          "config": { "source": "weibo" }
        },
        {
          "id": "node2",
          "type": "sentiment-analysis",
          "config": { "model": "gpt-4" }
        }
      ],
      "edges": [
        { "from": "node1", "to": "node2" }
      ]
    }
  }'
```

### 执行工作流

```bash
curl -X POST http://localhost:8089/api/workflows/{workflowId}/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "input": {
      "keywords": ["微博", "舆情"]
    }
  }'
```

### 获取工作流执行状态

```bash
curl http://localhost:8089/api/workflows/{workflowId}/executions/{executionId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 爬虫

### 启动爬虫任务

```bash
curl -X POST http://localhost:8089/api/crawler/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "keywords": ["微博", "舆情分析"],
    "maxPosts": 1000,
    "proxy": true
  }'
```

### 获取爬虫状态

```bash
curl http://localhost:8089/api/crawler/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 健康检查

### 基础健康检查

```bash
curl http://localhost:8089/health
```

响应:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2025-01-12T12:00:00.000Z"
  }
}
```

### 详细健康检查

```bash
curl http://localhost:8089/health/detailed
```

响应:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-12T12:00:00.000Z",
    "services": [
      {
        "name": "PostgreSQL",
        "status": "healthy",
        "latency": 5
      },
      {
        "name": "Redis",
        "status": "healthy",
        "latency": 2
      },
      {
        "name": "RabbitMQ",
        "status": "healthy",
        "latency": 8
      },
      {
        "name": "MongoDB",
        "status": "healthy",
        "latency": 6
      }
    ]
  }
}
```

## WebSocket 连接

### 连接到 WebSocket

```javascript

const socket = io('http://localhost:8089/ws', {
  auth: {
    token: 'YOUR_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('已连接');
});

socket.on('data:update', (data) => {
  console.log('收到数据更新:', data);
});

socket.on('disconnect', () => {
  console.log('已断开');
});
```

## 错误处理

所有错误响应都遵循统一格式:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "timestamp": "2025-01-12T12:00:00.000Z",
    "details": {
      "additional": "info"
    }
  }
}
```

常见错误码:
- `VALIDATION_ERROR`: 请求参数验证失败 (400)
- `UNAUTHORIZED`: 未授权 (401)
- `FORBIDDEN`: 权限不足 (403)
- `NOT_FOUND`: 资源不存在 (404)
- `RATE_LIMIT_EXCEEDED`: 请求频率超限 (429)
- `INTERNAL_ERROR`: 服务器内部错误 (500)
- `EXTERNAL_SERVICE_ERROR`: 外部服务错误 (502)
