# 工作流调度触发接口文档

## 概述

当工作流调度类型为**手动触发**时，系统会自动生成触发接口地址，允许通过 HTTP POST 请求直接触发工作流执行。

## 接口规范

### 触发调度

**接口地址**：`POST /api/workflow/schedules/{scheduleId}/trigger`

**参数说明**：
- `{scheduleId}`: 调度 ID，在调度卡片中显示

**请求示例**：

```bash
# 方式一：直接触发（无参数）
curl -X POST http://localhost:3000/api/workflow/schedules/abc123def456/trigger

# 方式二：使用 JSON 格式
curl -X POST http://localhost:3000/api/workflow/schedules/abc123def456/trigger \
  -H "Content-Type: application/json" \
  -d '{}'
```

**响应示例**：

```json
{
  "success": true,
  "runId": "run_789xyz",
  "run": {
    "id": "run_789xyz",
    "workflowId": "workflow_456",
    "status": "completed",
    "inputs": {},
    "outputs": {
      "node1": { "result": "数据" }
    },
    "startedAt": "2024-01-01T10:00:00.000Z",
    "completedAt": "2024-01-01T10:00:05.000Z",
    "duration": 5000
  }
}
```

## 界面操作

### 查看触发接口

1. 进入工作流调度管理页面
2. 找到类型为**手动触发**的调度
3. 在调度卡片中会显示"触发接口"区域，包含：
   - 请求方法标识（POST）
   - 完整的接口地址
   - 一键复制按钮

### 复制接口地址

点击接口地址右侧的复制按钮，即可复制完整的接口 URL 到剪贴板。

### 直接触发

点击调度卡片底部的**触发**按钮，可以直接在界面上触发执行。

## 使用场景

### 1. 定时任务集成
通过 cron 或其他定时任务工具调用触发接口：

```bash
# crontab 示例：每天凌晨 2 点执行
0 2 * * * curl -X POST http://your-domain.com/api/workflow/schedules/xxx/trigger
```

### 2. CI/CD 流程集成
在 GitHub Actions、GitLab CI 等流程中触发工作流：

```yaml
# .github/workflows/trigger.yml
- name: Trigger Workflow
  run: |
    curl -X POST http://your-domain.com/api/workflow/schedules/${{ secrets.SCHEDULE_ID }}/trigger
```

### 3. Webhook 回调
作为第三方服务的 webhook 回调地址：

```javascript
// 示例：接收 webhook 后触发工作流
app.post('/webhook', async (req, res) => {
  const response = await fetch(
    `http://localhost:3000/api/workflow/schedules/xxx/trigger`,
    { method: 'POST' }
  )
  const result = await response.json()
  res.json({ triggered: result.success, runId: result.runId })
})
```

### 4. API 网关集成
通过 API 网关（如 Kong、Nginx）转发触发请求：

```nginx
# Nginx 配置示例
location /trigger/workflow {
  proxy_pass http://backend/api/workflow/schedules/xxx/trigger;
  proxy_method POST;
}
```

## 安全建议

1. **启用认证**：在生产环境建议添加 API 认证（JWT、API Key 等）
2. **IP 白名单**：限制只有特定 IP 可以调用触发接口
3. **频率限制**：防止滥用，建议添加请求频率限制
4. **HTTPS**：生产环境必须使用 HTTPS 加密传输

## 错误处理

### 常见错误

| 状态码 | 错误信息 | 原因 | 解决方案 |
|--------|---------|------|----------|
| 400 | 调度 ID 不能为空 | scheduleId 参数缺失 | 检查 URL 路径 |
| 404 | 调度不存在 | scheduleId 不正确或已被删除 | 确认调度是否存在 |
| 404 | 工作流不存在 | 关联的工作流已被删除 | 检查工作流状态 |
| 500 | 执行失败 | 工作流执行过程出错 | 查看运行日志排查 |

### 错误响应示例

```json
{
  "statusCode": 404,
  "message": "调度不存在: abc123",
  "error": "Not Found"
}
```

## 监控与追踪

每次触发都会：
1. 创建新的运行实例（runId）
2. 记录在运行历史中
3. 更新调度的"最后运行时间"

可以通过以下接口查询运行状态：

```bash
# 查询运行详情
curl http://localhost:3000/api/workflow/runs/{runId}

# 查询工作流的运行历史
curl http://localhost:3000/api/workflow/{workflowId}/runs
```

## 注意事项

- 手动触发类型的调度不会自动定时执行，只能通过接口或界面按钮触发
- 调度必须处于**启用**状态才能被触发
- 已过期的调度无法被触发
- 每次触发都是独立的运行实例，互不影响
- 接口支持并发触发，但建议根据工作流复杂度控制并发数
